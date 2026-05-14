/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "../../lib/supabase";
import { ROUTES } from "../../constants/routes";
import GlobalSearch from "@/components/layout/GlobalSearch";
import {
  CollectionProvider,
  useCollections,
} from "../../context/CollectionContext";
import { PendingActionProvider } from "../../context/PendingActionContext";
import { PlanProvider } from "../../context/PlanContext";

// ─── Desktop sidebar nav — ordered to match mobile tab order ──────────────────
const NAV_ITEMS = [
  { href: ROUTES.DASHBOARD, label: "Dashboard", icon: "▣" },
  { href: ROUTES.CARDS, label: "Set Browser", icon: "◈" },
  { href: ROUTES.INVENTORY, label: "Inventory", icon: "☰" },
  { href: ROUTES.MASTER_SETS, label: "Master Sets", icon: "★" },
  { href: ROUTES.CENTERING, label: "Centering", icon: "⊹" },
  { href: ROUTES.GRADING, label: "Grading", icon: "◇" },
] as const;

const BOTTOM_ITEMS = [
  { href: ROUTES.SETTINGS, label: "Settings", icon: "⚙" },
] as const;

// ─── Mobile bottom nav — 6 tabs ───────────────────────────────────────────────
type MobileNavItem = {
  href: string;
  label: string;
  matchPaths: string[];
  icon: React.ReactNode;
};

const MOBILE_NAV: MobileNavItem[] = [
  {
    href: ROUTES.DASHBOARD,
    label: "Home",
    matchPaths: ["/dashboard"],
    icon: (
      <svg
        width='22'
        height='22'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z' />
        <path d='M9 21V12h6v9' />
      </svg>
    ),
  },
  {
    href: ROUTES.CARDS,
    label: "Browse",
    matchPaths: ["/cards"],
    icon: (
      <svg
        width='22'
        height='22'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <rect x='2' y='4' width='13' height='17' rx='2' />
        <path d='M15 8h5a2 2 0 012 2v9a2 2 0 01-2 2h-5' />
        <path d='M6 9h5M6 13h5M6 17h3' />
      </svg>
    ),
  },
  {
    href: ROUTES.INVENTORY,
    label: "Inventory",
    matchPaths: ["/inventory", "/master-sets"],
    icon: (
      <svg
        width='22'
        height='22'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' />
        <path d='M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12' />
      </svg>
    ),
  },
  {
    href: ROUTES.PORTFOLIO,
    label: "Portfolio",
    matchPaths: ["/portfolio"],
    icon: (
      <svg
        width='22'
        height='22'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <polyline points='22 12 18 12 15 21 9 3 6 12 2 12' />
      </svg>
    ),
  },
  {
    href: ROUTES.GRADING,
    label: "Grading",
    matchPaths: ["/grading", "/centering"],
    icon: (
      <svg
        width='22'
        height='22'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' />
      </svg>
    ),
  },
  {
    href: ROUTES.SETTINGS,
    label: "Profile",
    matchPaths: ["/settings", "/admin"],
    icon: (
      <svg
        width='22'
        height='22'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' />
        <circle cx='12' cy='7' r='4' />
      </svg>
    ),
  },
];

// ─── Desktop sidebar nav link ─────────────────────────────────────────────────
function NavLink({
  href,
  label,
  icon,
  pathname,
  exact = false,
}: {
  href: string;
  label: string;
  icon: string;
  pathname: string;
  exact?: boolean;
}) {
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 10px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: isActive ? 500 : 400,
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
        background: isActive ? "var(--surface-2)" : "transparent",
        textDecoration: "none",
        marginBottom: 2,
        transition: "background 0.15s ease, color 0.15s ease",
        borderLeft: `2px solid ${isActive ? "var(--gold)" : "transparent"}`,
      }}
    >
      <span
        style={{
          fontSize: 15,
          color: isActive ? "var(--gold)" : "var(--text-dim)",
          width: 18,
          textAlign: "center",
          flexShrink: 0,
          transition: "color 0.15s ease",
        }}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

// ─── Mobile bottom nav ────────────────────────────────────────────────────────
function MobileBottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      className='mobile-bottom-nav'
      role='navigation'
      aria-label='Mobile navigation'
    >
      {MOBILE_NAV.map((item) => {
        const isActive = item.matchPaths.some((p) =>
          p === "/dashboard" ? pathname === p : pathname.startsWith(p),
        );
        return (
          <Link
            key={item.href}
            href={item.href}
            className='mobile-nav-item'
            aria-current={isActive ? "page" : undefined}
            style={{ color: isActive ? "var(--gold)" : "var(--text-dim)" }}
          >
            <span
              className='mobile-nav-icon'
              style={{ color: isActive ? "var(--gold)" : "var(--text-dim)" }}
            >
              {item.icon}
            </span>
            <span
              className='mobile-nav-label'
              style={{ color: isActive ? "var(--gold)" : "var(--text-dim)" }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Mobile sticky search — only on dashboard ─────────────────────────────────
function MobileDashboardSearch({ pathname }: { pathname: string }) {
  if (pathname !== ROUTES.DASHBOARD) return null;
  return (
    <div className='mobile-dashboard-search'>
      <GlobalSearch />
    </div>
  );
}

// ─── Collections sidebar section ──────────────────────────────────────────────

// ─── Inventory nav item with expandable collections sub-nav ───────────────────
function InventoryNavItem({ pathname }: { pathname: string }) {
  const router = useRouter();
  const {
    collections,
    activeCollectionId,
    setActiveCollectionId,
    createCollection,
  } = useCollections();

  const isOnInventory = pathname.startsWith(ROUTES.INVENTORY);
  const isActive = isOnInventory;

  // Show sub-nav when on any inventory path
  const showSubs = isOnInventory;

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createCollection({ name: newName.trim() });
      setNewName("");
      setShowCreate(false);
    } catch (err: any) {
      setCreateError(err?.message ?? "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {/* Main Inventory row */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
        <Link
          href={ROUTES.INVENTORY}
          onClick={() => setActiveCollectionId(null)}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 10px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: isActive ? 500 : 400,
            color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
            background:
              isActive && !activeCollectionId
                ? "var(--surface-2)"
                : "transparent",
            textDecoration: "none",
            transition: "background 0.15s ease",
            borderLeft: `2px solid ${isActive && !activeCollectionId ? "var(--gold)" : "transparent"}`,
          }}
        >
          <span
            style={{
              fontSize: 15,
              color:
                isActive && !activeCollectionId
                  ? "var(--gold)"
                  : "var(--text-dim)",
              width: 18,
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            ☰
          </span>
          Inventory
        </Link>
        {/* + button to create collection */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowCreate(!showCreate);
            setCreateError(null);
          }}
          title='New collection'
          style={{
            background: "transparent",
            border: "none",
            color: showCreate ? "var(--gold)" : "var(--text-dim)",
            cursor: "pointer",
            fontSize: 18,
            padding: "4px 8px",
            borderRadius: 6,
            lineHeight: 1,
            fontWeight: 300,
            flexShrink: 0,
          }}
        >
          +
        </button>
      </div>

      {/* Inline create form — appears below Inventory row */}
      {showCreate && (
        <div style={{ padding: "4px 10px 8px 28px" }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setShowCreate(false);
                setNewName("");
              }
            }}
            placeholder='Collection name…'
            autoFocus
            style={{
              width: "100%",
              background: "var(--surface-2)",
              border: "1px solid var(--gold)",
              borderRadius: 7,
              padding: "6px 10px",
              fontSize: 12,
              color: "var(--text-primary)",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          {createError && (
            <div style={{ fontSize: 10, color: "var(--red)", marginTop: 3 }}>
              {createError}
            </div>
          )}
          <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              style={{
                flex: 1,
                padding: "5px 0",
                borderRadius: 6,
                border: "none",
                background: "var(--gold)",
                color: "#0D0E11",
                fontSize: 11,
                fontWeight: 500,
                cursor: creating ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {creating ? "…" : "Create"}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setNewName("");
                setCreateError(null);
              }}
              style={{
                padding: "5px 8px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Collections sub-nav — only when on inventory path */}
      {showSubs && collections.length > 0 && (
        <div style={{ paddingLeft: 18, marginBottom: 4 }}>
          {/* All Collections — only show when 2+ exist */}
          {collections.length > 1 && (
            <button
              onClick={() => {
                setActiveCollectionId(null);
                router.push(ROUTES.INVENTORY);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "6px 10px",
                borderRadius: 7,
                background:
                  activeCollectionId === null
                    ? "var(--surface-2)"
                    : "transparent",
                border: "none",
                borderLeft: `2px solid ${activeCollectionId === null ? "var(--gold)" : "transparent"}`,
                color:
                  activeCollectionId === null
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                fontSize: 12,
                fontWeight: activeCollectionId === null ? 500 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                marginBottom: 1,
                transition: "background 0.15s ease",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color:
                    activeCollectionId === null
                      ? "var(--gold)"
                      : "var(--text-dim)",
                }}
              >
                ◎
              </span>
              All Collections
            </button>
          )}
          {/* Individual collections */}
          {collections.map((col) => {
            const isCurrent = activeCollectionId === col.id;
            return (
              <button
                key={col.id}
                onClick={() => {
                  setActiveCollectionId(col.id);
                  router.push(ROUTES.INVENTORY);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 7,
                  background: isCurrent ? "var(--surface-2)" : "transparent",
                  border: "none",
                  borderLeft: `2px solid ${isCurrent ? col.color : "transparent"}`,
                  color: isCurrent
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: isCurrent ? 500 : 400,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  marginBottom: 1,
                  transition: "background 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: col.color,
                    flexShrink: 0,
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.name}
                </span>
                {col.itemCount > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {col.itemCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── App layout ───────────────────────────────────────────────────────────────
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace(ROUTES.HOME);
        return;
      }

      setUserEmail(session.user.email ?? null);

      const role = session.user.app_metadata?.role;
      setIsAdmin(role === "admin");

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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!session) router.replace(ROUTES.HOME);
      },
    );

    return () => subscription.unsubscribe();
  }, [pathname, router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace(ROUTES.HOME);
  };

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
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
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
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "DM Mono, monospace",
              }}
            >
              TP
            </span>
          </div>
          <div
            style={{
              width: 20,
              height: 20,
              border: "2px solid var(--border)",
              borderTopColor: "var(--gold)",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <CollectionProvider>
      <PendingActionProvider>
        <PlanProvider>
          <div
            style={{
              display: "flex",
              minHeight: "100vh",
              background: "var(--charcoal)",
            }}
          >
            {/* Desktop sidebar — hidden on mobile via .desktop-sidebar CSS class */}
            <aside className='desktop-sidebar'>
              {/* Logo */}
              <div
                style={{
                  padding: "20px 20px 18px",
                  borderBottom: "1px solid var(--border)",
                  flexShrink: 0,
                }}
              >
                <Image
                  src='/tp-logo-gold-white.png'
                  alt='TruePoint TCG'
                  width={130}
                  height={30}
                  style={{ objectFit: "contain", objectPosition: "left" }}
                  priority
                />
              </div>

              {/* Search */}
              <div
                style={{
                  padding: "12px 0 4px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <GlobalSearch />
              </div>

              {/* Primary nav */}
              <nav style={{ padding: "12px 10px", flex: 1, overflow: "auto" }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    letterSpacing: "0.08em",
                    fontFamily: "DM Mono, monospace",
                    padding: "6px 10px 8px",
                  }}
                >
                  NAVIGATION
                </div>

                {NAV_ITEMS.map((item) => {
                  if (item.href === ROUTES.INVENTORY) {
                    return (
                      <InventoryNavItem key={item.href} pathname={pathname} />
                    );
                  }
                  return (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      pathname={pathname}
                      exact={item.href === ROUTES.DASHBOARD}
                    />
                  );
                })}

                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "12px 10px",
                  }}
                />

                {BOTTOM_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    pathname={pathname}
                  />
                ))}

                {isAdmin && (
                  <NavLink
                    href={ROUTES.ADMIN}
                    label='Admin'
                    icon='⬡'
                    pathname={pathname}
                  />
                )}
              </nav>

              {/* User footer */}
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  padding: "14px 14px",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "rgba(201,168,76,0.2)",
                      border: "1px solid rgba(201,168,76,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--gold)",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {(username ?? userEmail ?? "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {username ? `@${username}` : "My Account"}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-dim)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {userEmail}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  style={{
                    width: "100%",
                    padding: "7px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-dim)",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "border-color 0.15s ease, color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--red)";
                    e.currentTarget.style.color = "var(--red)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-dim)";
                  }}
                >
                  <span style={{ fontSize: 12 }}>↪</span>
                  Sign out
                </button>
              </div>
            </aside>

            {/* Main content area */}
            <main className='app-main'>
              {/* Mobile-only header with logo */}
              <header className='mobile-header'>
                <Image
                  src='/tp-logo-gold-white.png'
                  alt='TruePoint TCG'
                  width={110}
                  height={26}
                  style={{ objectFit: "contain" }}
                  priority
                />
              </header>

              {/* Page content */}
              <div className='app-content'>{children}</div>

              {/* Mobile sticky search — visible only on /dashboard */}
              <MobileDashboardSearch pathname={pathname} />
            </main>

            {/* Mobile bottom nav — hidden on desktop */}
            <MobileBottomNav pathname={pathname} />
          </div>
        </PlanProvider>
      </PendingActionProvider>
    </CollectionProvider>
  );
}
