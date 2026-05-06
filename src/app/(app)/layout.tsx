"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { ROUTES } from "../../constants/routes";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !profile) {
      router.replace(ROUTES.LOGIN);
    }
  }, [profile, isLoading]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--charcoal)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "var(--gold)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "#0D0E11",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "DM Mono, monospace",
            }}
          >
            TP
          </span>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--charcoal)",
      }}
    >
      {/* Sidebar placeholder — will be built as Sidebar component */}
      <aside
        style={{
          width: 240,
          borderRight: "1px solid var(--border)",
          background: "var(--surface)",
          flexShrink: 0,
        }}
      />
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
