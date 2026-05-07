"use client";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { ROUTES } from "../../../constants/routes";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace(ROUTES.HOME);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--charcoal)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "40px 48px",
          textAlign: "center",
          maxWidth: 400,
          width: "100%",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            background: "var(--gold)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <span
            style={{
              color: "#0D0E11",
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "DM Mono, monospace",
            }}
          >
            TP
          </span>
        </div>

        <h1
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 8,
            letterSpacing: "0.02em",
          }}
        >
          Dashboard
        </h1>

        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          You are logged in. The full dashboard is coming soon.
        </p>

        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "11px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "border-color 0.2s ease, color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--red)";
            e.currentTarget.style.color = "var(--red)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
