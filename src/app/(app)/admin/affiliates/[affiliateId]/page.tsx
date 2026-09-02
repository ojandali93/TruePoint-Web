/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../../lib/api";

// ─── Types (server shape — see affiliateCommissionAdmin.service.ts) ────────

interface ReferredUser {
  user_id: string;
  username: string | null;
  full_name: string | null;
  attributed_at: string;
  converted: boolean;
  window_start: string | null;
  window_end: string | null;
  net_contributed: number;
}

interface LedgerRow {
  id: string;
  source_platform: "stripe" | "revenuecat";
  payment_event_id: string;
  payment_event_type: string;
  gross: number;
  fees: number;
  net: number;
  currency: string;
  rate_applied: number;
  commission_amount: number;
  is_clawback: boolean;
  clawback_of: string | null;
  earned_at: string;
  payout_period: string;
  status: "pending" | "eligible" | "paid" | "clawed_back";
  payout_id: string | null;
}

interface Payout {
  id: string;
  amount: number;
  method: string;
  paid_at: string;
  note: string | null;
  created_at: string;
}

interface Summary {
  affiliate: {
    id: string;
    name: string;
    slug: string | null;
    contact_name: string | null;
    contact_email: string | null;
    status: string | null;
    active: boolean;
    commission_rate: number;
    commission_window_months: number;
  };
  referredUsers: ReferredUser[];
  conversions: { referred: number; converted: number };
  ledger: LedgerRow[];
  payouts: Payout[];
  totals: {
    attributedNetRevenue: number;
    commissionEarned: number;
    commissionPaid: number;
    commissionPending: number;
  };
}

// ─── Shared style bits (match admin/affiliates' language) ──────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-dim)",
  fontFamily: "DM Mono, monospace",
  letterSpacing: "0.08em",
  marginBottom: 12,
};

const mono: React.CSSProperties = { fontFamily: "DM Mono, monospace" };

function money(n: number, currency = "usd"): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const symbol = currency.toLowerCase() === "usd" ? "$" : currency.toUpperCase() + " ";
  return `${sign}${symbol}${abs.toFixed(2)}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={cardStyle}>
      <div style={sectionTitleStyle}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: color ?? "var(--text-primary)", ...mono }}>
        {value}
      </div>
    </div>
  );
}

// ─── Mark-paid modal ─────────────────────────────────────────────────────────

function MarkPaidModal({
  affiliateId,
  pendingTotal,
  currency,
  onClose,
  onPaid,
}: {
  affiliateId: string;
  pendingTotal: number;
  currency: string;
  onClose: () => void;
  onPaid: (msg: string) => void;
}) {
  const [amount, setAmount] = useState(pendingTotal.toFixed(2));
  const [method, setMethod] = useState("PayPal");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount greater than 0.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ data: { ledgerRowsCovered: number } }>(
        `/admin/affiliates/${affiliateId}/mark-paid`,
        {
          amount: amt,
          method,
          paid_at: new Date(paidAt).toISOString(),
          note: note.trim() || undefined,
        },
      );
      onPaid(
        `Marked paid — ${money(amt, currency)} via ${method}, covering ${r.data.data.ledgerRowsCovered} ledger row${r.data.data.ledgerRowsCovered === 1 ? "" : "s"}.`,
      );
    } catch (e: any) {
      setError(e?.message ?? "Failed to record payout");
    } finally {
      setBusy(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 13,
    color: "var(--text-primary)",
    fontFamily: "inherit",
    outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: "var(--text-dim)",
    marginBottom: 6,
    display: "block",
    fontFamily: "DM Mono, monospace",
    letterSpacing: "0.04em",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
          width: 440,
          maxWidth: "100%",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
          Mark paid
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 18, lineHeight: 1.6 }}>
          Covers every currently-eligible (unpaid) ledger row for this affiliate —{" "}
          <span style={{ color: "var(--gold)", ...mono }}>{money(pendingTotal, currency)}</span> across
          all periods, per the $50 rollover design. Manual payouts only; this records what you actually
          paid, it doesn&apos;t process a transfer.
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              padding: "9px 12px",
              fontSize: 12,
              color: "#EF4444",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>AMOUNT PAID *</label>
            <input style={inputStyle} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" autoFocus />
          </div>
          <div>
            <label style={labelStyle}>METHOD *</label>
            <select style={inputStyle} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="PayPal">PayPal</option>
              <option value="Wire">Wire transfer</option>
              <option value="Check">Check</option>
              <option value="Venmo">Venmo</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>DATE PAID *</label>
            <input style={inputStyle} type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>NOTE (optional)</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. transaction id, reference number" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "#10B981", color: "#06281C", fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: busy ? 0.7 : 1 }}
          >
            {busy ? "Recording…" : "Confirm payout"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AffiliateCommissionDetailPage() {
  const router = useRouter();
  const params = useParams<{ affiliateId: string }>();
  const affiliateId = params.affiliateId;

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);

  const load = useCallback(async () => {
    if (!affiliateId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.get<{ data: Summary }>(`/admin/affiliates/${affiliateId}/commission-summary`);
      setSummary(r.data.data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load commission summary");
    } finally {
      setLoading(false);
    }
  }, [affiliateId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-dim)" }}>Loading…</div>
    );
  }

  if (error || !summary) {
    return (
      <div style={{ padding: 40 }}>
        <div style={{ color: "#EF4444", fontSize: 13 }}>{error ?? "Not found"}</div>
      </div>
    );
  }

  const currency = summary.ledger[0]?.currency ?? "usd";

  // Group the flat ledger into period sections — a period total row per
  // month, clawbacks visible inline as their own rows (doc's own
  // requirement: "clawbacks visible as their own rows", not netted away).
  const periods = Array.from(new Set(summary.ledger.map((r) => r.payout_period))).sort();

  const statusColor = (s: LedgerRow["status"]) =>
    s === "paid" ? "#10B981" : s === "eligible" ? "var(--gold)" : s === "clawed_back" ? "#EF4444" : "var(--text-dim)";

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ padding: "28px 40px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <button
          onClick={() => router.push("/admin/affiliates")}
          style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0, marginBottom: 12 }}
        >
          ← Affiliates
        </button>
        <div style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.1em", fontFamily: "DM Mono, monospace", marginBottom: 6 }}>
          COMMISSION LEDGER
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 26, fontWeight: 500, color: "var(--text-primary)" }}>{summary.affiliate.name}</h1>
          {summary.affiliate.slug && (
            <span style={{ fontSize: 13, color: "var(--gold)", ...mono }}>{summary.affiliate.slug}</span>
          )}
          <span
            style={{
              fontSize: 11,
              color: summary.affiliate.active ? "#10B981" : "var(--text-dim)",
              border: `1px solid ${summary.affiliate.active ? "rgba(16,185,129,0.4)" : "var(--border)"}`,
              borderRadius: 5,
              padding: "1px 8px",
            }}
          >
            {summary.affiliate.active ? "Active" : "Inactive"}
          </span>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 6 }}>
          {Math.round(summary.affiliate.commission_rate * 100)}% commission · {summary.affiliate.commission_window_months}-month window
          {summary.affiliate.contact_email ? ` · ${summary.affiliate.contact_email}` : ""}
        </div>
      </div>

      <div style={{ padding: "28px 40px", maxWidth: 1200, margin: "0 auto" }}>
        {notice && (
          <div
            style={{
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.35)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#10B981",
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} style={{ background: "none", border: "none", color: "#10B981", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
          </div>
        )}

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          <StatCard label="ATTRIBUTED NET REVENUE" value={money(summary.totals.attributedNetRevenue, currency)} />
          <StatCard label="COMMISSION EARNED (LIFETIME)" value={money(summary.totals.commissionEarned, currency)} />
          <StatCard label="PAID OUT" value={money(summary.totals.commissionPaid, currency)} color="#10B981" />
          <StatCard label="PENDING PAYOUT" value={money(summary.totals.commissionPending, currency)} color="var(--gold)" />
        </div>

        {/* Mark paid action */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
          <button
            onClick={() => setMarkPaidOpen(true)}
            disabled={summary.totals.commissionPending <= 0}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: summary.totals.commissionPending > 0 ? "#10B981" : "var(--surface-3)",
              color: summary.totals.commissionPending > 0 ? "#06281C" : "var(--text-dim)",
              fontSize: 13,
              fontWeight: 600,
              cursor: summary.totals.commissionPending > 0 ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            {summary.totals.commissionPending > 0 ? `Mark paid — ${money(summary.totals.commissionPending, currency)}` : "Nothing eligible to pay out"}
          </button>
        </div>

        {/* Referred users */}
        <div style={sectionTitleStyle}>
          REFERRED USERS · {summary.conversions.referred} referred · {summary.conversions.converted} converted
        </div>
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden", marginBottom: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 120px 100px 1fr 100px", padding: "10px 18px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)", fontSize: 10, color: "var(--text-dim)", ...mono, letterSpacing: "0.06em" }}>
            <span>USER</span>
            <span>ATTRIBUTED</span>
            <span>CONVERTED</span>
            <span>WINDOW</span>
            <span>NET CONTRIBUTED</span>
          </div>
          {summary.referredUsers.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>No referred users yet.</div>
          ) : (
            summary.referredUsers.map((u) => (
              <div key={u.user_id} style={{ display: "grid", gridTemplateColumns: "1.4fr 120px 100px 1fr 100px", padding: "10px 18px", borderBottom: "1px solid var(--border)", alignItems: "center", fontSize: 13 }}>
                <span style={{ color: "var(--text-primary)" }}>{u.full_name || u.username || u.user_id.slice(0, 8)}</span>
                <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{fmtDate(u.attributed_at)}</span>
                <span style={{ fontSize: 11, color: u.converted ? "#10B981" : "var(--text-dim)" }}>{u.converted ? "Yes" : "No"}</span>
                <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                  {u.window_start ? `${fmtDate(u.window_start)} – ${fmtDate(u.window_end)}` : "—"}
                </span>
                <span style={{ ...mono, color: u.net_contributed >= 0 ? "var(--text-secondary)" : "#EF4444" }}>{money(u.net_contributed, currency)}</span>
              </div>
            ))
          )}
        </div>

        {/* Ledger, grouped by payout period */}
        <div style={sectionTitleStyle}>COMMISSION LEDGER</div>
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden", marginBottom: 28 }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 900 }}>
              <div style={{ display: "grid", gridTemplateColumns: "90px 90px 90px 1.3fr 90px 90px 90px 90px 100px 90px", padding: "10px 18px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)", fontSize: 10, color: "var(--text-dim)", ...mono, letterSpacing: "0.06em" }}>
                <span>DATE</span>
                <span>PLATFORM</span>
                <span>TYPE</span>
                <span>EVENT</span>
                <span>GROSS</span>
                <span>FEES</span>
                <span>NET</span>
                <span>RATE</span>
                <span>COMMISSION</span>
                <span>STATUS</span>
              </div>

              {summary.ledger.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>No commission activity yet.</div>
              ) : (
                periods.map((period) => {
                  const rows = summary.ledger.filter((r) => r.payout_period === period);
                  const periodCommission = rows.reduce((s, r) => s + r.commission_amount, 0);
                  const periodNet = rows.reduce((s, r) => s + r.net, 0);
                  return (
                    <div key={period}>
                      {rows.map((r) => (
                        <div
                          key={r.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "90px 90px 90px 1.3fr 90px 90px 90px 90px 100px 90px",
                            padding: "9px 18px",
                            borderBottom: "1px solid var(--border)",
                            alignItems: "center",
                            fontSize: 12,
                            background: r.is_clawback ? "rgba(239,68,68,0.06)" : "transparent",
                          }}
                        >
                          <span style={{ color: "var(--text-dim)" }}>{fmtDate(r.earned_at)}</span>
                          <span style={{ color: "var(--text-secondary)", textTransform: "capitalize" }}>{r.source_platform}</span>
                          <span style={{ color: r.is_clawback ? "#EF4444" : "var(--text-secondary)" }}>{r.is_clawback ? "Clawback" : "Earning"}</span>
                          <span style={{ color: "var(--text-dim)", ...mono, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.payment_event_id}>
                            {r.payment_event_id}
                          </span>
                          <span style={{ ...mono, color: "var(--text-secondary)" }}>{money(r.gross, r.currency)}</span>
                          <span style={{ ...mono, color: "var(--text-dim)" }}>{money(r.fees, r.currency)}</span>
                          <span style={{ ...mono, color: "var(--text-secondary)" }}>{money(r.net, r.currency)}</span>
                          <span style={{ ...mono, color: "var(--text-dim)" }}>{Math.round(r.rate_applied * 100)}%</span>
                          <span style={{ ...mono, fontWeight: 600, color: r.commission_amount < 0 ? "#EF4444" : "var(--text-primary)" }}>{money(r.commission_amount, r.currency)}</span>
                          <span style={{ fontSize: 10, color: statusColor(r.status), textTransform: "uppercase" }}>{r.status}</span>
                        </div>
                      ))}
                      {/* Period subtotal */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "270px 1.3fr 90px 90px 90px 90px 100px 90px",
                          padding: "8px 18px",
                          borderBottom: "1px solid var(--border)",
                          background: "var(--surface-2)",
                          fontSize: 11,
                        }}
                      >
                        <span style={{ color: "var(--text-dim)", ...mono }}>{period} total</span>
                        <span />
                        <span />
                        <span />
                        <span style={{ ...mono, color: "var(--text-dim)" }}>{money(periodNet, currency)}</span>
                        <span />
                        <span style={{ ...mono, fontWeight: 600, color: periodCommission < 0 ? "#EF4444" : "var(--gold)" }}>{money(periodCommission, currency)}</span>
                        <span />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Payout history */}
        <div style={sectionTitleStyle}>PAYOUT HISTORY</div>
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "110px 100px 100px 1fr", padding: "10px 18px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)", fontSize: 10, color: "var(--text-dim)", ...mono, letterSpacing: "0.06em" }}>
            <span>DATE</span>
            <span>AMOUNT</span>
            <span>METHOD</span>
            <span>NOTE</span>
          </div>
          {summary.payouts.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>No payouts recorded yet.</div>
          ) : (
            summary.payouts.map((p) => (
              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "110px 100px 100px 1fr", padding: "10px 18px", borderBottom: "1px solid var(--border)", alignItems: "center", fontSize: 13 }}>
                <span style={{ color: "var(--text-dim)", fontSize: 12 }}>{fmtDate(p.paid_at)}</span>
                <span style={{ ...mono, color: "#10B981" }}>{money(p.amount, currency)}</span>
                <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{p.method}</span>
                <span style={{ color: "var(--text-dim)", fontSize: 12 }}>{p.note || "—"}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {markPaidOpen && (
        <MarkPaidModal
          affiliateId={summary.affiliate.id}
          pendingTotal={summary.totals.commissionPending}
          currency={currency}
          onClose={() => setMarkPaidOpen(false)}
          onPaid={async (msg) => {
            setMarkPaidOpen(false);
            setNotice(msg);
            await load();
          }}
        />
      )}
    </div>
  );
}
