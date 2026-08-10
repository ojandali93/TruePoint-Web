"use client";

/**
 * Admin → Notification Testing — /admin/notification-test
 *
 * Full control over who gets tested and what: pick any user (defaults to
 * yourself), pick a notification type, and either preview it (dry run —
 * watchlist-triggers only) or actually send it to that one account.
 *
 * Calls the same POST /admin/notifications/test-send the mobile version
 * uses — this page is just a UI over it, no new backend logic.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

import api from "../../../../lib/api";

const NOTIFICATION_TYPES = [
  { value: "daily-summary", label: "Daily Summary" },
  { value: "watchlist-triggers", label: "Watchlist Triggers" },
  { value: "price-movers", label: "Price Movers" },
] as const;
type NotificationType = (typeof NOTIFICATION_TYPES)[number]["value"];

interface AdminUserRow {
  id: string;
  username: string | null;
  full_name: string | null;
}

interface TriggerResult {
  itemId: string;
  triggerType: "buy" | "sell";
  itemName: string;
  currentPrice: number;
  targetPrice: number;
  title: string;
  body: string;
  sent: boolean;
  reason?: string;
}

interface TestSendResponse {
  type: NotificationType;
  targetUserId: string;
  sent?: boolean;
  dryRun?: boolean;
  itemsChecked?: number;
  triggersFound?: number;
  results?: TriggerResult[];
}

const chipStyle = (active: boolean) => ({
  padding: "7px 14px",
  borderRadius: 8,
  border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
  background: active ? "rgba(201,168,76,0.12)" : "var(--surface-2)",
  color: active ? "var(--gold)" : "var(--text-primary)",
  fontSize: 12,
  fontWeight: active ? 700 : 500,
  cursor: "pointer",
  fontFamily: "inherit",
});

export default function NotificationTestPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminUserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);

  const [type, setType] = useState<NotificationType>("daily-summary");
  const [dryRun, setDryRun] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TestSendResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  const runSearch = async (q: string) => {
    setQuery(q);
    setSearchErr(null);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get<{ data: { users: AdminUserRow[] } }>(
        `/admin/users?search=${encodeURIComponent(q)}&limit=10`,
      );
      setSearchResults(res.data.data.users ?? []);
    } catch (e) {
      setSearchResults([]);
      setSearchErr(e instanceof Error ? e.message : "User search failed");
    } finally {
      setSearching(false);
    }
  };

  const targetLabel = selectedUser
    ? selectedUser.full_name || selectedUser.username || selectedUser.id
    : "Myself (default)";

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    setErr(null);
    try {
      const body: Record<string, unknown> = { type };
      if (selectedUser) body.userId = selectedUser.id;
      if (type === "watchlist-triggers") body.dryRun = dryRun;

      const res = await api.post<{ data: TestSendResponse }>(
        "/admin/notifications/test-send",
        body,
      );
      setResult(res.data.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Test send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
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
          NOTIFICATIONS
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          Notification Testing
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
          Pick any account, pick a notification type, preview or send — never
          affects anyone but the account you choose.
        </p>
      </div>

      <div style={{ padding: "28px 40px", maxWidth: 640, margin: "0 auto" }}>
        {/* ── Target user ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-dim)",
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            SEND TO
          </div>

          {selectedUser ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(201,168,76,0.12)",
                border: "1px solid rgba(201,168,76,0.35)",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <span
                style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}
              >
                {targetLabel}
              </span>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setQuery("");
                  setSearchResults([]);
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                value={query}
                onChange={(e) => runSearch(e.target.value)}
                placeholder='Search a user to test on someone other than yourself'
                style={{
                  width: "100%",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}
              >
                Leave blank to test on your own account.
              </div>

              {searching && (
                <div
                  style={{
                    padding: "12px 0",
                    fontSize: 12,
                    color: "var(--text-dim)",
                  }}
                >
                  Searching…
                </div>
              )}

              {searchErr && (
                <div
                  style={{
                    padding: "10px 12px",
                    marginTop: 8,
                    borderRadius: 8,
                    background: "rgba(232,95,95,0.1)",
                    border: "1px solid #e85f5f55",
                    fontSize: 12,
                    color: "#e85f5f",
                  }}
                >
                  {searchErr}
                </div>
              )}

              {searchResults.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginTop: 10,
                  }}
                >
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedUser(u);
                        setSearchResults([]);
                      }}
                      style={{
                        textAlign: "left",
                        padding: 10,
                        borderRadius: 8,
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <div
                        style={{ fontSize: 12, color: "var(--text-primary)" }}
                      >
                        {u.full_name || u.username || "Unnamed"}
                      </div>
                      {u.username && u.full_name && (
                        <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
                          @{u.username}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {!searching &&
                !searchErr &&
                query.trim().length >= 2 &&
                searchResults.length === 0 && (
                  <div
                    style={{
                      padding: "12px 0",
                      fontSize: 12,
                      color: "var(--text-dim)",
                    }}
                  >
                    No users match &quot;{query}&quot;.
                  </div>
                )}
            </>
          )}
        </div>

        {/* ── Notification type ───────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-dim)",
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            NOTIFICATION TYPE
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {NOTIFICATION_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setType(t.value);
                  setResult(null);
                }}
                style={chipStyle(type === t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Dry run toggle — watchlist-triggers only ───────────────── */}
        {type === "watchlist-triggers" && (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 12,
              borderRadius: 10,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              marginBottom: 20,
              cursor: "pointer",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                Dry run
              </div>
              <div
                style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}
              >
                {dryRun
                  ? "Preview only — computes real content, sends nothing, changes nothing."
                  : "Will actually send a push and mark triggers as notified."}
              </div>
            </div>
            <input
              type='checkbox'
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--gold)" }}
            />
          </label>
        )}

        {/* ── Send ─────────────────────────────────────────────────────── */}
        <button
          onClick={handleSend}
          disabled={sending}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 8,
            border: "none",
            background: "var(--gold)",
            color: "var(--charcoal, #0E0E12)",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            opacity: sending ? 0.6 : 1,
            marginBottom: 20,
          }}
        >
          {sending
            ? "Sending…"
            : type === "watchlist-triggers" && dryRun
              ? "Preview"
              : "Send test"}
        </button>

        {err && (
          <div style={{ fontSize: 12, color: "#e85f5f", marginBottom: 16 }}>
            {err}
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────── */}
        {result && (
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-dim)",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              RESULT
            </div>

            {result.type !== "watchlist-triggers" ? (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: result.sent
                    ? "rgba(16,185,129,0.1)"
                    : "rgba(245,158,11,0.1)",
                  border: `1px solid ${result.sent ? "#10B98155" : "#F59E0B55"}`,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: result.sent ? "#10B981" : "#F59E0B",
                  }}
                >
                  {result.sent
                    ? "Sent"
                    : "Not sent — no push token, opted out, or nothing to report for this account"}
                </div>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-dim)",
                    marginBottom: 10,
                  }}
                >
                  {result.itemsChecked} item
                  {result.itemsChecked === 1 ? "" : "s"} checked ·{" "}
                  {result.triggersFound} trigger
                  {result.triggersFound === 1 ? "" : "s"} crossed
                  {result.dryRun ? " (dry run — nothing sent)" : ""}
                </div>

                {(result.results ?? []).length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                    No triggers currently crossed for this account.
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {(result.results ?? []).map((r) => (
                      <div
                        key={r.itemId + r.triggerType}
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          background: "var(--surface)",
                          border: `1px solid ${r.sent ? "#10B98155" : "var(--border)"}`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--gold)",
                            marginBottom: 4,
                          }}
                        >
                          {r.title} —{" "}
                          {r.sent
                            ? "SENT"
                            : (r.reason ?? "not sent").toUpperCase()}
                        </div>
                        <div
                          style={{ fontSize: 13, color: "var(--text-primary)" }}
                        >
                          {r.body}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
