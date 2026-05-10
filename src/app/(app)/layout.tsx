"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "../../lib/supabase";
import { ROUTES } from "../../constants/routes";
import GlobalSearch from "@/components/layout/GlobalSearch";

const NAV_ITEMS = [
  { href: ROUTES.DASHBOARD,         label: "Dashboard",    icon: "▣" },
  { href: ROUTES.CARDS,             label: "Set Browser",  icon: "◈" },
  { href: ROUTES.CENTERING,         label: "Centering",    icon: "⊹" },
  { href: ROUTES.INVENTORY,         label: "Inventory",    icon: "☰" },
  { href: ROUTES.PORTFOLIO,         label: "Portfolio",    icon: "◎" },
  { href: ROUTES.MASTER_SETS,       label: "Master Sets",  icon: "★" },
  { href: ROUTES.GRADING,           label: "Grading",      icon: "◇" },
] as const;

const BOTTOM_ITEMS = [
  { href: ROUTES.SETTINGS, label: "Settings", icon: "⚙" },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace(ROUTES.HOME); return; }

      setUserEmail(session.user.email ?? null);

      // Check admin role
      const role = session.user.app_metadata?.role;
      setIsAdmin(role === 'admin');

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUsername(profile.username ?? profile.full_name ?? null);
      }

      setIsLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace(ROUTES.HOME);
    });

    return () => subscription.unsubscribe();
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace(ROUTES.HOME);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--charcoal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#0D0E11", fontSize: 14, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>TP</span>
          </div>
          <div style={{ width: 20, height: 20, border: "2px solid var(--border)", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const NavLink = ({ href, label, icon, exact = false }: { href: string; label: string; icon: string; exact?: boolean }) => {
    const isActive = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link href={href} style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 10px", borderRadius: 8, fontSize: 13,
        fontWeight: isActive ? 500 : 400,
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
        background: isActive ? "var(--surface-2)" : "transparent",
        textDecoration: "none", marginBottom: 2,
        transition: "background 0.15s ease, color 0.15s ease",
        borderLeft: `2px solid ${isActive ? "var(--gold)" : "transparent"}`,
      }}>
        <span style={{ fontSize: 15, color: isActive ? "var(--gold)" : "var(--text-dim)", width: 18, textAlign: "center", flexShrink: 0, transition: "color 0.15s ease" }}>
          {icon}
        </span>
        {label}
      </Link>
    );
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--charcoal)" }}>
      {/* Sidebar */}
      <aside style={{ width: 228, borderRight: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        {/* Logo */}
        <div style={{ padding: "20px 20px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <Image src='/tp-logo-gold-white.png' alt='TruePoint TCG' width={130} height={30} style={{ objectFit: "contain", objectPosition: "left" }} priority />
        </div>

        <div style={{ padding: "12px 0 4px", borderBottom: "1px solid var(--border)" }}>
          <GlobalSearch />
        </div>

        {/* Primary nav */}
        <nav style={{ padding: "12px 10px", flex: 1, overflow: "auto" }}>
          <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.08em", fontFamily: "DM Mono, monospace", padding: "6px 10px 8px" }}>
            NAVIGATION
          </div>

          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon}
              exact={item.href === ROUTES.DASHBOARD} />
          ))}

          <div style={{ height: 1, background: "var(--border)", margin: "12px 10px" }} />

          {/* Bottom nav — Settings */}
          {BOTTOM_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}

          {/* Admin link — only for admin users */}
          {isAdmin && (
            <NavLink href={ROUTES.ADMIN} label="Admin" icon="⬡" />
          )}
        </nav>

        {/* User footer */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 14px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(201,168,76,0.2)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", fontFamily: "DM Mono, monospace" }}>
                {(username ?? userEmail ?? "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {username ? `@${username}` : "My Account"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userEmail}
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{ width: "100%", padding: "7px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, transition: "border-color 0.15s ease, color 0.15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-dim)"; }}
          >
            <span style={{ fontSize: 12 }}>↪</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", minHeight: "100vh", background: "var(--charcoal)" }}>
        {children}
      </main>
    </div>
  );
}
