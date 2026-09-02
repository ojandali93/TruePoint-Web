"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

// Shared list body used both as the "Users" tab on /admin (between
// Collection and Error Logs — the discoverable, in-dashboard entry point)
// and as the standalone /admin/users page (direct-link/bookmark entry
// point). One list, one source of truth, two ways to reach it — not two
// lists. Row click always goes to /admin/users/[userId], the single
// consolidated user portal.

interface UserRow {
  id: string;
  username: string | null;
  full_name: string | null;
  created_at: string;
  email_verified?: boolean;
  last_login_at?: string | null;
  subscription: { plan: string; status: string }[];
}

const PLAN_COLOR: Record<string, string> = {
  starter: "var(--text-dim)",
  collector: "var(--gold)",
  pro: "#10B981",
};

export default function UsersListPanel() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get<{ data: { users: UserRow[]; total: number } }>(
        "/admin/users",
        { params: q ? { search: q, limit: 50 } : { limit: 50 } },
      );
      setUsers(r.data.data.users ?? []);
      setTotal(r.data.data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void load(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search, load]);

  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16 }}>
        {loading ? "Loading…" : `${total.toLocaleString()} total`} — click a user to open their account, plan, AI
        grading, centering, and collection in one portal.
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users…"
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-primary)",
          fontSize: 14,
          fontFamily: "inherit",
          marginBottom: 20,
        }}
      />

      {error && (
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
          {error}
        </div>
      )}

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
            gridTemplateColumns: "1.6fr 1.2fr 90px 110px 120px 120px",
            padding: "9px 16px",
            background: "var(--surface-2, var(--surface))",
            borderBottom: "1px solid var(--border)",
            fontSize: 10,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
            letterSpacing: "0.06em",
          }}
        >
          <span>NAME</span>
          <span>ID</span>
          <span>PLAN</span>
          <span>JOINED</span>
          <span>EMAIL</span>
          <span>LAST LOGIN</span>
        </div>

        {loading ? (
          <div style={{ padding: "24px 16px", color: "var(--text-dim)", fontSize: 13 }}>Loading…</div>
        ) : users.length === 0 ? (
          <div style={{ padding: "24px 16px", color: "var(--text-dim)", fontSize: 13 }}>No users found.</div>
        ) : (
          users.map((u) => {
            const plan = u.subscription?.[0]?.plan ?? "starter";
            const verified = u.email_verified === true;
            const lastLogin = u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : null;
            return (
              <button
                key={u.id}
                onClick={() => router.push(`/admin/users/${u.id}`)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1.2fr 90px 110px 120px 120px",
                  width: "100%",
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {u.full_name || u.username || u.id}
                </span>
                <span
                  style={{
                    color: "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                    fontSize: 11,
                  }}
                >
                  {u.id.slice(0, 14)}…
                </span>
                <span
                  style={{
                    color: PLAN_COLOR[plan] ?? "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                    fontSize: 11,
                    textTransform: "uppercase",
                  }}
                >
                  {plan}
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: 11 }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </span>
                <span
                  style={{
                    color: verified ? "#10B981" : "#F59E0B",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {verified ? "✓ Verified" : "Unverified"}
                </span>
                <span
                  style={{
                    color: lastLogin ? "var(--text-secondary)" : "#6B7280",
                    fontSize: 11,
                  }}
                >
                  {lastLogin ?? "Never"}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
