"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "../../../../lib/api";

interface UserRow {
  id: string;
  username: string | null;
  full_name: string | null;
  created_at: string;
  subscription: { plan: string; status: string }[];
}

const PLAN_COLOR: Record<string, string> = {
  starter: "var(--text-dim)",
  collector: "var(--gold)",
  pro: "#10B981",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
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
          Users
        </h1>
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
          Search by name, username, or email — opens each user&apos;s AI
          grading, centering, and collection drill-down.
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "28px 40px", maxWidth: 900, margin: "0 auto" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users…"
          autoFocus
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

        {loading ? (
          <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
            Loading…
          </div>
        ) : users.length === 0 ? (
          <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
            No users found.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => router.push(`/admin/users/${u.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      color: "var(--text-primary)",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {u.full_name || u.username || u.id}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                    {u.username ? `@${u.username}` : u.id}
                  </div>
                </div>
                {(() => {
                  const plan = u.subscription?.[0]?.plan ?? "starter";
                  return (
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "DM Mono, monospace",
                        color: PLAN_COLOR[plan] ?? "var(--text-dim)",
                        textTransform: "uppercase",
                        flexShrink: 0,
                      }}
                    >
                      {plan}
                    </span>
                  );
                })()}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
