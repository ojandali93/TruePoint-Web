/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "../../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type AffiliateType = "vendor" | "creator" | "page" | "event" | "other";

interface Affiliate {
  id: string;
  name: string;
  slug: string | null;
  type: AffiliateType;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  instagram: string | null;
  website: string | null;
  notes: string | null;
  active: boolean;
  signup_count?: number;
  created_at: string;
  updated_at: string;
  // Self-service application fields
  socials?: Record<string, string> | null;
  requested_slug?: string | null;
  status?: string | null; // pending | active | suspended | inactive | rejected
  approved_at?: string | null;
  rejected_at?: string | null;
  user_id?: string | null;
  source?: string | null;
}

interface SocialsForm {
  instagram: string;
  tiktok: string;
  youtube: string;
  twitter: string;
  facebook: string;
}

interface FormState {
  name: string;
  type: AffiliateType;
  slug: string; // live code — used when editing an approved/active record
  requestedSlug: string; // proposed code — used when editing a pending application
  socials: SocialsForm;
  website: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  active: boolean;
}

const EMPTY_SOCIALS: SocialsForm = {
  instagram: "",
  tiktok: "",
  youtube: "",
  twitter: "",
  facebook: "",
};

const TYPE_OPTIONS: AffiliateType[] = [
  "vendor",
  "creator",
  "page",
  "event",
  "other",
];

const typeColor = (t: string) =>
  t === "vendor"
    ? "#3B82F6"
    : t === "creator"
      ? "#8B5CF6"
      : t === "page"
        ? "#10B981"
        : t === "event"
          ? "var(--gold)"
          : "#6B7280";

// A pending application is awaiting first review (not yet approved/rejected).
const isPendingApplication = (a: Affiliate) =>
  (a.status ?? "active") === "pending" && !a.approved_at;

// Derived display state for the affiliates table.
function displayState(a: Affiliate): { label: string; color: string } {
  const s = a.status ?? (a.active ? "active" : "inactive");
  if (s === "rejected") return { label: "Rejected", color: "#EF4444" };
  if (s === "pending" && a.approved_at)
    return { label: "Invited", color: "#3B82F6" };
  if (s === "pending") return { label: "Pending", color: "var(--gold)" };
  if (s === "active") return { label: "Active", color: "#10B981" };
  if (s === "suspended") return { label: "Suspended", color: "#F59E0B" };
  return {
    label: a.active ? "Active" : "Inactive",
    color: a.active ? "#10B981" : "var(--text-dim)",
  };
}

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Shared bits (match the admin design language) ──────────────────────────

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  flex: 1,
  padding: "10px 0",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};

function ModalShell({
  width = 520,
  children,
}: {
  width?: number;
  children: React.ReactNode;
}) {
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
          width,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Edit modal (manual creation retired — edit only) ────────────────────────

function AffiliateModal({
  isPending,
  form,
  setForm,
  onClose,
  onSave,
  saving,
  error,
}: {
  isPending: boolean;
  form: FormState;
  setForm: (f: FormState) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
}) {
  const set = (k: keyof FormState, v: string | boolean) =>
    setForm({ ...form, [k]: v });
  const setSocial = (k: keyof SocialsForm, v: string) =>
    setForm({ ...form, socials: { ...form.socials, [k]: v } });

  return (
    <ModalShell>
      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: 18,
        }}
      >
        {isPending ? "Edit application" : "Edit affiliate"}
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
        <Field label='NAME *'>
          <input
            style={inputStyle}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Joe's Cards"
            autoFocus
          />
        </Field>

        <div style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Field label='TYPE'>
              <select
                style={inputStyle}
                value={form.type}
                onChange={(e) => set("type", e.target.value as AffiliateType)}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              paddingBottom: 9,
              visibility: isPending ? "hidden" : "visible",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {form.active ? "Active" : "Inactive"}
            </span>
            <button
              type='button'
              onClick={() => set("active", !form.active)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                background: form.active ? "#10B981" : "var(--surface-3)",
                position: "relative",
                transition: "background 0.2s",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 3,
                  left: form.active ? 23 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                }}
              />
            </button>
          </div>
        </div>

        <Field label={isPending ? "REQUESTED CODE" : "REFERRAL CODE (live)"}>
          <input
            style={inputStyle}
            value={isPending ? form.requestedSlug : form.slug}
            onChange={(e) =>
              set(isPending ? "requestedSlug" : "slug", e.target.value)
            }
            placeholder='joes-cards'
          />
          {isPending && (
            <div
              style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 6 }}
            >
              This is the applicant&apos;s request. You set the final live code
              when you approve.
            </div>
          )}
        </Field>

        <div>
          <label style={labelStyle}>SOCIALS</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              style={inputStyle}
              value={form.socials.instagram}
              onChange={(e) => setSocial("instagram", e.target.value)}
              placeholder='Instagram — @handle'
            />
            <input
              style={inputStyle}
              value={form.socials.tiktok}
              onChange={(e) => setSocial("tiktok", e.target.value)}
              placeholder='TikTok — @handle'
            />
            <input
              style={inputStyle}
              value={form.socials.youtube}
              onChange={(e) => setSocial("youtube", e.target.value)}
              placeholder='YouTube — channel or @handle'
            />
            <input
              style={inputStyle}
              value={form.socials.twitter}
              onChange={(e) => setSocial("twitter", e.target.value)}
              placeholder='X / Twitter — @handle'
            />
            <input
              style={inputStyle}
              value={form.socials.facebook}
              onChange={(e) => setSocial("facebook", e.target.value)}
              placeholder='Facebook — page or profile'
            />
          </div>
        </div>

        <Field label='WEBSITE'>
          <input
            style={inputStyle}
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder='joescards.com'
          />
        </Field>

        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <Field label='CONTACT NAME'>
              <input
                style={inputStyle}
                value={form.contact_name}
                onChange={(e) => set("contact_name", e.target.value)}
              />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label='CONTACT EMAIL'>
              <input
                style={inputStyle}
                value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
                placeholder='joe@joescards.com'
              />
            </Field>
          </div>
        </div>

        <Field label='CONTACT PHONE'>
          <input
            style={inputStyle}
            value={form.contact_phone}
            onChange={(e) => set("contact_phone", e.target.value)}
          />
        </Field>

        <Field label='NOTES (internal)'>
          <textarea
            style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
        <button onClick={onClose} style={ghostBtn}>
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: 8,
            border: "none",
            background: "var(--gold)",
            color: "#0D0E11",
            fontSize: 13,
            fontWeight: 500,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Approve modal ───────────────────────────────────────────────────────────

function ApproveModal({
  target,
  onClose,
  onApproved,
}: {
  target: Affiliate;
  onClose: () => void;
  onApproved: (msg: string) => void;
}) {
  const [slug, setSlug] = useState(
    normalizeSlug(target.requested_slug ?? target.slug ?? ""),
  );
  const [collectorPct, setCollectorPct] = useState("");
  const [proPct, setProPct] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMember = !!target.user_id;
  const socials = Object.entries(target.socials ?? {});

  const approve = async () => {
    const cleanSlug = normalizeSlug(slug);
    if (!cleanSlug) {
      setError("A referral code is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { slug: cleanSlug };
      if (collectorPct.trim()) {
        const v = parseFloat(collectorPct);
        if (!Number.isNaN(v)) body.collector_rate = v / 100;
      }
      if (proPct.trim()) {
        const v = parseFloat(proPct);
        if (!Number.isNaN(v)) body.pro_rate = v / 100;
      }
      const r = await api.post<{
        invite?: { emailed: boolean; email_error?: string };
        granted?: boolean;
        emailed?: boolean;
        email_error?: string;
      }>(`/admin/affiliates/${target.id}/approve`, body);

      let msg: string;
      if (r.data.granted) {
        msg = r.data.emailed
          ? `Approved — ${target.name}'s account upgraded to Pro and an approval email was sent.`
          : `Approved — ${target.name}'s account upgraded to Pro (email not sent: ${r.data.email_error ?? "no contact email"}).`;
      } else if (r.data.invite?.emailed) {
        msg = `Approved — invite emailed to ${target.contact_email}.`;
      } else {
        msg = `Approved — invite NOT emailed (${r.data.invite?.email_error ?? "no contact email"}). Use the resend action.`;
      }
      onApproved(msg);
    } catch (e: any) {
      setError(e?.message ?? "Failed to approve");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell width={500}>
      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: 4,
        }}
      >
        Approve “{target.name}”
      </div>
      <div
        style={{
          fontSize: 12,
          color: isMember ? "#10B981" : "#3B82F6",
          marginBottom: 18,
        }}
      >
        {isMember
          ? "Has a TruePoint account → approval grants Pro instantly + emails them."
          : "No account yet → approval emails an invite to create one with free Pro."}
      </div>

      {/* Applicant summary */}
      <div
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 18,
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1.7,
        }}
      >
        {target.contact_name && (
          <div>
            <span style={{ color: "var(--text-dim)" }}>Contact: </span>
            {target.contact_name}
          </div>
        )}
        {target.contact_email && (
          <div>
            <span style={{ color: "var(--text-dim)" }}>Email: </span>
            {target.contact_email}
          </div>
        )}
        {target.contact_phone && (
          <div>
            <span style={{ color: "var(--text-dim)" }}>Phone: </span>
            {target.contact_phone}
          </div>
        )}
        {target.requested_slug && (
          <div>
            <span style={{ color: "var(--text-dim)" }}>Requested code: </span>
            <span
              style={{ fontFamily: "DM Mono, monospace", color: "var(--gold)" }}
            >
              {target.requested_slug}
            </span>
          </div>
        )}
        {socials.length > 0 && (
          <div>
            <span style={{ color: "var(--text-dim)" }}>Socials: </span>
            {socials.map(([k, v]) => `${k}: ${v}`).join("  ·  ")}
          </div>
        )}
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
        <Field label='REFERRAL CODE (confirm or override) *'>
          <input
            style={inputStyle}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder='jane-cards'
            autoFocus
          />
        </Field>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: -4 }}>
          {isMember
            ? "This code will be in their approval email."
            : "This code will be in their invite email."}
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <Field label='COLLECTOR % (optional)'>
              <input
                style={inputStyle}
                value={collectorPct}
                onChange={(e) => setCollectorPct(e.target.value)}
                placeholder='5'
                inputMode='decimal'
              />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label='PRO % (optional)'>
              <input
                style={inputStyle}
                value={proPct}
                onChange={(e) => setProPct(e.target.value)}
                placeholder='7'
                inputMode='decimal'
              />
            </Field>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
          Leave rates blank to use the defaults (5% / 7%).
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
        <button onClick={onClose} style={ghostBtn}>
          Cancel
        </button>
        <button
          onClick={approve}
          disabled={busy}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: 8,
            border: "none",
            background: "#10B981",
            color: "#06281C",
            fontSize: 13,
            fontWeight: 600,
            cursor: busy ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Approving…" : "Approve"}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Reject modal ────────────────────────────────────────────────────────────

function RejectModal({
  target,
  onClose,
  onRejected,
}: {
  target: Affiliate;
  onClose: () => void;
  onRejected: (msg: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reject = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/admin/affiliates/${target.id}/reject`, {
        reason: reason.trim() || undefined,
      });
      onRejected(`Rejected “${target.name}”.`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to reject");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell width={400}>
      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: 8,
        }}
      >
        Reject “{target.name}”?
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-dim)",
          lineHeight: 1.6,
          marginBottom: 16,
        }}
      >
        They won&apos;t be notified automatically. The reason is saved to
        internal notes for your reference.
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
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      <Field label='REASON (optional, internal)'>
        <textarea
          style={{ ...inputStyle, minHeight: 64, resize: "vertical" }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder='e.g. not enough reach'
        />
      </Field>

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button onClick={onClose} style={ghostBtn}>
          Cancel
        </button>
        <button
          onClick={reject}
          disabled={busy}
          style={{
            flex: 1,
            padding: "9px 0",
            borderRadius: 8,
            border: "none",
            background: "#EF4444",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            cursor: busy ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Delete confirm modal ───────────────────────────────────────────────────

function DeleteModal({
  target,
  onCancel,
  onConfirm,
  deleting,
}: {
  target: Affiliate;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <ModalShell width={380}>
      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: 8,
        }}
      >
        Delete “{target.name}”?
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-dim)",
          lineHeight: 1.6,
          marginBottom: 20,
        }}
      >
        {target.signup_count
          ? `${target.signup_count} signup${target.signup_count === 1 ? "" : "s"} are attributed to this affiliate. `
          : ""}
        Those signups keep their attribution label, so historical tracking is
        preserved — but this affiliate will no longer appear in the signup
        dropdown. This can&apos;t be undone.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onCancel}
          style={{ ...ghostBtn, flex: 1, padding: "9px 0" }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          style={{
            flex: 1,
            padding: "9px 0",
            borderRadius: 8,
            border: "none",
            background: "#EF4444",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            cursor: deleting ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: deleting ? 0.7 : 1,
          }}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Pending application card ────────────────────────────────────────────────

function PendingCard({
  a,
  onEdit,
  onApprove,
  onReject,
}: {
  a: Affiliate;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isMember = !!a.user_id;
  const socials = Object.entries(a.socials ?? {});
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid rgba(201,168,76,0.35)",
        borderRadius: 10,
        padding: "16px 18px",
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        justifyContent: "space-between",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              color: "var(--text-primary)",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {a.name}
          </span>
          <span
            style={{
              fontSize: 10,
              fontFamily: "DM Mono, monospace",
              color: isMember ? "#10B981" : "#3B82F6",
              border: `1px solid ${isMember ? "rgba(16,185,129,0.4)" : "rgba(59,130,246,0.4)"}`,
              borderRadius: 5,
              padding: "1px 6px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {isMember ? "Has account" : "Guest"}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
            via {a.source ?? "web"}
          </span>
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.7,
          }}
        >
          {a.contact_name && <span>{a.contact_name} · </span>}
          {a.contact_email && <span>{a.contact_email} · </span>}
          {a.contact_phone && <span>{a.contact_phone}</span>}
        </div>
        {a.requested_slug && (
          <div style={{ fontSize: 12, marginTop: 4 }}>
            <span style={{ color: "var(--text-dim)" }}>requested code: </span>
            <span
              style={{ fontFamily: "DM Mono, monospace", color: "var(--gold)" }}
            >
              {a.requested_slug}
            </span>
          </div>
        )}
        {socials.length > 0 && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            {socials.map(([k, v]) => (
              <span key={k} style={{ marginRight: 12 }}>
                <span style={{ color: "var(--text-dim)" }}>{k}:</span> {v}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          onClick={onEdit}
          style={{
            padding: "7px 14px",
            borderRadius: 7,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Edit
        </button>
        <button
          onClick={onReject}
          style={{
            padding: "7px 14px",
            borderRadius: 7,
            border: "1px solid rgba(239,68,68,0.4)",
            background: "transparent",
            color: "#EF4444",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Reject
        </button>
        <button
          onClick={onApprove}
          style={{
            padding: "7px 16px",
            borderRadius: 7,
            border: "none",
            background: "#10B981",
            color: "#06281C",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Approve
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManageAffiliatesPage() {
  const router = useRouter();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPending, setEditingPending] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [approveTarget, setApproveTarget] = useState<Affiliate | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Affiliate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Affiliate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await api.get<{ data: Affiliate[] }>("/admin/affiliates");
      setAffiliates(r.data.data);
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to load affiliates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (a: Affiliate) => {
    setEditingId(a.id);
    setEditingPending(isPendingApplication(a));
    const s = a.socials ?? {};
    setForm({
      name: a.name,
      type: a.type,
      slug: a.slug ?? "",
      requestedSlug: a.requested_slug ?? "",
      socials: {
        ...EMPTY_SOCIALS,
        instagram: s.instagram ?? a.instagram ?? "",
        tiktok: s.tiktok ?? "",
        youtube: s.youtube ?? "",
        twitter: s.twitter ?? "",
        facebook: s.facebook ?? "",
      },
      website: a.website ?? "",
      contact_name: a.contact_name ?? "",
      contact_email: a.contact_email ?? "",
      contact_phone: a.contact_phone ?? "",
      notes: a.notes ?? "",
      active: a.active,
    });
    setFormError(null);
  };

  const save = async () => {
    if (!form || !editingId) return;
    if (form.name.trim().length < 2) {
      setFormError("Name is required (min 2 characters).");
      return;
    }
    setSaving(true);
    setFormError(null);

    const socials: Record<string, string> = {};
    (Object.keys(form.socials) as (keyof SocialsForm)[]).forEach((k) => {
      if (form.socials[k].trim()) socials[k] = form.socials[k].trim();
    });

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
      website: form.website.trim() || null,
      contact_name: form.contact_name.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      notes: form.notes.trim() || null,
      socials,
    };
    // Pending applications: edit the requested code only; the live slug and
    // active flag are set at approval. Approved/active: edit the live code.
    if (editingPending) {
      payload.requested_slug = form.requestedSlug.trim() || null;
    } else {
      payload.slug = form.slug.trim() || null;
      payload.active = form.active;
    }

    try {
      await api.patch(`/admin/affiliates/${editingId}`, payload);
      setForm(null);
      setEditingId(null);
      await load();
    } catch (e: any) {
      setFormError(e?.message ?? "Failed to save affiliate");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/affiliates/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to delete affiliate");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const afterAction = async (msg: string) => {
    setApproveTarget(null);
    setRejectTarget(null);
    setNotice(msg);
    await load();
  };

  const pending = affiliates.filter(isPendingApplication);
  const others = affiliates.filter((a) => !isPendingApplication(a));
  const totalSignups = others.reduce((s, a) => s + (a.signup_count ?? 0), 0);

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          padding: "28px 40px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <button
          onClick={() => router.push("/admin")}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-dim)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
            padding: 0,
            marginBottom: 12,
          }}
        >
          ← Admin
        </button>
        <div
          style={{
            fontSize: 10,
            color: "var(--gold)",
            letterSpacing: "0.1em",
            fontFamily: "DM Mono, monospace",
            marginBottom: 6,
          }}
        >
          MANAGEMENT
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Affiliates
        </h1>
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
          {pending.length} pending · {others.length} affiliate
          {others.length === 1 ? "" : "s"} · {totalSignups} attributed signup
          {totalSignups === 1 ? "" : "s"}
        </div>
      </div>

      {/* Body */}
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
            <button
              onClick={() => setNotice(null)}
              style={{
                background: "none",
                border: "none",
                color: "#10B981",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ✕
            </button>
          </div>
        )}

        {loadError && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#EF4444",
              marginBottom: 16,
            }}
          >
            {loadError}
          </div>
        )}

        {/* Pending applications */}
        {pending.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                fontSize: 11,
                color: "var(--gold)",
                fontFamily: "DM Mono, monospace",
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              PENDING APPLICATIONS · {pending.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pending.map((a) => (
                <PendingCard
                  key={a.id}
                  a={a}
                  onEdit={() => openEdit(a)}
                  onApprove={() => setApproveTarget(a)}
                  onReject={() => setRejectTarget(a)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Affiliates table */}
        <div
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          AFFILIATES
        </div>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 90px 1.3fr 80px 100px 110px",
              padding: "10px 18px",
              background: "var(--surface-2)",
              borderBottom: "1px solid var(--border)",
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              letterSpacing: "0.06em",
            }}
          >
            <span>NAME</span>
            <span>TYPE</span>
            <span>CONTACT</span>
            <span>SIGNUPS</span>
            <span>STATUS</span>
            <span></span>
          </div>

          {loading ? (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                color: "var(--text-dim)",
              }}
            >
              Loading…
            </div>
          ) : others.length === 0 ? (
            <div
              style={{
                padding: "48px 0",
                textAlign: "center",
                color: "var(--text-dim)",
                fontSize: 13,
              }}
            >
              No affiliates yet. Approved applications will appear here.
            </div>
          ) : (
            others.map((a) => {
              const st = displayState(a);
              return (
                <div
                  key={a.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 90px 1.3fr 80px 100px 110px",
                    padding: "12px 18px",
                    borderBottom: "1px solid var(--border)",
                    alignItems: "center",
                    fontSize: 13,
                  }}
                >
                  <div>
                    <div
                      style={{ color: "var(--text-primary)", fontWeight: 500 }}
                    >
                      {a.name}
                    </div>
                    {a.slug && (
                      <div
                        style={{
                          color: "var(--text-dim)",
                          fontFamily: "DM Mono, monospace",
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        {a.slug}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      color: typeColor(a.type),
                      fontFamily: "DM Mono, monospace",
                      fontSize: 11,
                      textTransform: "uppercase",
                    }}
                  >
                    {a.type}
                  </span>
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.socials?.instagram ||
                      a.instagram ||
                      a.contact_email ||
                      a.website ||
                      "—"}
                  </span>
                  <span
                    style={{
                      color: a.signup_count ? "var(--gold)" : "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {a.signup_count ?? 0}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      color: st.color,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: st.color,
                      }}
                    />
                    {st.label}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      onClick={() => openEdit(a)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--text-secondary)",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(a)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 6,
                        border: "1px solid rgba(239,68,68,0.4)",
                        background: "transparent",
                        color: "#EF4444",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {form && editingId && (
        <AffiliateModal
          isPending={editingPending}
          form={form}
          setForm={setForm}
          onClose={() => {
            setForm(null);
            setEditingId(null);
            setEditingPending(false);
          }}
          onSave={save}
          saving={saving}
          error={formError}
        />
      )}

      {approveTarget && (
        <ApproveModal
          target={approveTarget}
          onClose={() => setApproveTarget(null)}
          onApproved={afterAction}
        />
      )}

      {rejectTarget && (
        <RejectModal
          target={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={afterAction}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={doDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}
