"use client";
import { useRouter } from "next/navigation";
import UsersListPanel from "@/components/admin/UsersListPanel";

// Standalone route for the user list — direct-link/bookmark entry point.
// Same shared UsersListPanel also renders as the "Users" tab on /admin
// (between Collection and Error Logs); one list, two ways to reach it.

export default function AdminUsersPage() {
  const router = useRouter();

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
      </div>

      {/* Body */}
      <div style={{ padding: "28px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <UsersListPanel />
      </div>
    </div>
  );
}
