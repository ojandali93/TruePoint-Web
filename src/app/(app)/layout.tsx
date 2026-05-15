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
import EmailVerificationGate from "../../components/EmailVerificationGate";

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

// (mobile bottom-nav data removed — replaced by slide-out drawer)

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

// ─── Mobile slide-out drawer ──────────────────────────────────────────────────
// Replaces the bottom tab bar on mobile. Opens from the hamburger button in
// the mobile header, closes on link tap, backdrop tap, or Escape.

function MobileDrawer({
  open,
  onClose,
  pathname,
  isAdmin,
  username,
  userEmail,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  isAdmin: boolean;
  username: string | null;
  userEmail: string | null;
  onSignOut: () => void;
}) {
  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const allItems = [...NAV_ITEMS, ...BOTTOM_ITEMS];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`mobile-drawer-backdrop${open ? " open" : ""}`}
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Drawer panel */}
      <aside
        className={`mobile-drawer${open ? " open" : ""}`}
        role='dialog'
        aria-modal='true'
        aria-label='Navigation menu'
      >
        {/* Header with logo + close */}
        <div className='mobile-drawer-head'>
          <Image
            src='/tp-logo-gold-white.png'
            alt='TruePoint TCG'
            width={120}
            height={28}
            style={{ objectFit: "contain" }}
            priority
          />
          <button
            onClick={onClose}
            aria-label='Close menu'
            className='mobile-drawer-close'
          >
            ✕
          </button>
        </div>

        {/* Search inside the drawer */}
        <div className='mobile-drawer-search'>
          <GlobalSearch />
        </div>

        {/* Nav links */}
        <nav className='mobile-drawer-nav'>
          <div className='mobile-drawer-section-label'>NAVIGATION</div>
          {allItems.map((item) => {
            const isActive =
              item.href === ROUTES.DASHBOARD
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className='mobile-drawer-link'
                style={{
                  color: isActive ? "var(--gold)" : "var(--text-primary)",
                  background: isActive ? "rgba(201,168,76,0.1)" : "transparent",
                }}
              >
                <span
                  style={{
                    width: 22,
                    textAlign: "center",
                    color: isActive ? "var(--gold)" : "var(--text-dim)",
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href={ROUTES.ADMIN}
              onClick={onClose}
              className='mobile-drawer-link'
              style={{
                color: pathname.startsWith(ROUTES.ADMIN)
                  ? "var(--gold)"
                  : "var(--text-primary)",
                background: pathname.startsWith(ROUTES.ADMIN)
                  ? "rgba(201,168,76,0.1)"
                  : "transparent",
              }}
            >
              <span
                style={{
                  width: 22,
                  textAlign: "center",
                  color: "var(--text-dim)",
                }}
              >
                ⬡
              </span>
              Admin
            </Link>
          )}
        </nav>

        {/* User footer */}
        <div className='mobile-drawer-foot'>
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
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className='mobile-drawer-signout'
          >
            <span style={{ fontSize: 12 }}>↪</span> Sign out
          </button>
        </div>
      </aside>
    </>
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const supabase = createClient();

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDrawerOpen(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [pathname]);

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
    <EmailVerificationGate>
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
                <nav
                  style={{ padding: "12px 10px", flex: 1, overflow: "auto" }}
                >
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
                {/* Mobile-only header with hamburger + logo */}
                <header className='mobile-header'>
                  <button
                    onClick={() => setDrawerOpen(true)}
                    aria-label='Open menu'
                    aria-expanded={drawerOpen}
                    className='mobile-menu-btn'
                  >
                    <svg
                      width='22'
                      height='22'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                    >
                      <line x1='3' y1='6' x2='21' y2='6' />
                      <line x1='3' y1='12' x2='21' y2='12' />
                      <line x1='3' y1='18' x2='21' y2='18' />
                    </svg>
                  </button>
                  <Image
                    src='/tp-logo-gold-white.png'
                    alt='TruePoint TCG'
                    width={110}
                    height={26}
                    style={{ objectFit: "contain" }}
                    priority
                  />
                  {/* Spacer to keep logo centered against the menu button */}
                  <div style={{ width: 22 }} />
                </header>

                {/* Page content */}
                <div className='app-content'>{children}</div>
              </main>

              {/* Mobile slide-out drawer — replaces the bottom tab bar */}
              <MobileDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                pathname={pathname}
                isAdmin={isAdmin}
                username={username}
                userEmail={userEmail}
                onSignOut={handleSignOut}
              />
            </div>
          </PlanProvider>
        </PendingActionProvider>
      </CollectionProvider>
    </EmailVerificationGate>
  );
}
