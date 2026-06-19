/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";

interface AdminSet {
  id: string;
  name: string;
  series?: string | null;
  language?: string | null;
  logo_url?: string | null;
}

type ActionState = "idle" | "running" | "done" | "error";
interface Status {
  state: ActionState;
  msg?: string;
}

interface SyncAction {
  key: string;
  label: string;
  desc: string;
  // path receives the selected set id (ignored by global actions)
  path: (setId: string) => string;
}

const PER_SET_ACTIONS: SyncAction[] = [
  {
    key: "cards",
    label: "Cards & Variants",
    desc: "Rebuild variants from the TCGAPIs catalog",
    path: (id) => `/admin/sync/set/${id}/cards`,
  },
  {
    key: "variant-prices",
    label: "Variant Pricing",
    desc: "Refresh raw NM price per variant",
    path: (id) => `/admin/sync/set/${id}/variant-prices`,
  },
  {
    key: "product-prices",
    label: "Product Pricing",
    desc: "Refresh sealed-product prices for the set",
    path: (id) => `/admin/sync/set/${id}/product-prices`,
  },
  {
    key: "graded",
    label: "Graded Pricing",
    desc: "Warm PokeTrace graded comps for every card",
    path: (id) => `/admin/sync/set/${id}/graded`,
  },
];

const GLOBAL_ACTIONS: SyncAction[] = [
  {
    key: "images",
    label: "Set Images",
    desc: "Backfill missing set logos (fills nulls only)",
    path: () => `/admin/sync/images`,
  },
  {
    key: "portfolio",
    label: "Portfolios",
    desc: "Recalculate snapshots for all users",
    path: () => `/admin/sync/portfolio`,
  },
  {
    key: "graded-inventory",
    label: "Graded Pricing — Inventory",
    desc: "Refresh PokeTrace comps for all inventoried cards",
    path: () => `/admin/sync/graded-inventory`,
  },
  {
    key: "graded-all",
    label: "Graded Pricing — Full Catalog",
    desc: "Refresh PokeTrace comps for every card (daily-cron job)",
    path: () => `/admin/sync/graded-all`,
  },
];

export default function SyncPanel() {
  const [sets, setSets] = useState<AdminSet[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [setsError, setSetsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminSet | null>(null);
  const [status, setStatus] = useState<Record<string, Status>>({});

  useEffect(() => {
    let active = true;
    api
      .get<{ data: AdminSet[] }>("/cards/sets")
      .then((res) => {
        if (!active) return;
        const list = res.data?.data ?? [];
        setSets(
          [...list].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
        );
      })
      .catch((e) =>
        setSetsError(
          e?.response?.data?.error ?? e?.message ?? "Failed to load sets",
        ),
      )
      .finally(() => active && setLoadingSets(false));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q),
    );
  }, [sets, search]);

  const selectSet = (s: AdminSet) => {
    setSelected(s);
    // Clear only per-set action statuses; leave global ones intact.
    setStatus((prev) => {
      const next = { ...prev };
      for (const a of PER_SET_ACTIONS) delete next[a.key];
      return next;
    });
  };

  const run = async (action: SyncAction, setId: string) => {
    setStatus((s) => ({ ...s, [action.key]: { state: "running" } }));
    try {
      const res = await api.post<{ message?: string }>(action.path(setId));
      setStatus((s) => ({
        ...s,
        [action.key]: { state: "done", msg: res.data?.message ?? "Started" },
      }));
    } catch (e: any) {
      setStatus((s) => ({
        ...s,
        [action.key]: {
          state: "error",
          msg: e?.response?.data?.error ?? e?.message ?? "Failed",
        },
      }));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Intro */}
      <div>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
            marginBottom: 4,
          }}
        >
          Manual Sync
        </h2>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            margin: 0,
            lineHeight: 1.5,
            maxWidth: 620,
          }}
        >
          Run the same jobs the cron uses, scoped to one set. Each kicks off in
          the background and returns immediately — watch Render logs for{" "}
          <code style={{ fontFamily: "DM Mono, monospace" }}>[AdminSync]</code>{" "}
          completion.
        </p>
      </div>

      {/* Layout: set picker | actions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 340px) 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* ── Set picker ─────────────────────────────────────────── */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search sets by name or id…'
              style={{
                width: "100%",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12,
                color: "var(--text-primary)",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>

          <div style={{ maxHeight: 460, overflowY: "auto" }}>
            {loadingSets && (
              <div
                style={{ padding: 16, fontSize: 12, color: "var(--text-dim)" }}
              >
                Loading sets…
              </div>
            )}
            {setsError && (
              <div style={{ padding: 16, fontSize: 12, color: "var(--red)" }}>
                {setsError}
              </div>
            )}
            {!loadingSets &&
              !setsError &&
              filtered.map((s) => {
                const active = selected?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => selectSet(s)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      border: "none",
                      borderBottom: "1px solid var(--border)",
                      borderLeft: `2px solid ${active ? "var(--gold)" : "transparent"}`,
                      background: active ? "var(--surface-2)" : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: active ? "var(--gold)" : "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text-dim)",
                          fontFamily: "DM Mono, monospace",
                        }}
                      >
                        {s.id}
                        {s.language ? ` · ${s.language}` : ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            {!loadingSets && !setsError && filtered.length === 0 && (
              <div
                style={{ padding: 16, fontSize: 12, color: "var(--text-dim)" }}
              >
                No sets match “{search}”.
              </div>
            )}
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Per-set actions */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.08em",
                color: "var(--text-dim)",
                fontFamily: "DM Mono, monospace",
                marginBottom: 4,
              }}
            >
              PER-SET SYNC
            </div>
            {selected ? (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-primary)",
                  fontWeight: 500,
                  marginBottom: 14,
                }}
              >
                {selected.name}{" "}
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                    fontWeight: 400,
                  }}
                >
                  ({selected.id})
                </span>
              </div>
            ) : (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-dim)",
                  marginBottom: 8,
                  marginTop: 6,
                }}
              >
                Select a set on the left to enable these.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PER_SET_ACTIONS.map((a) => (
                <ActionRow
                  key={a.key}
                  action={a}
                  disabled={!selected}
                  status={status[a.key]}
                  onRun={() => selected && run(a, selected.id)}
                />
              ))}
            </div>
          </div>

          {/* Global actions */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.08em",
                color: "var(--text-dim)",
                fontFamily: "DM Mono, monospace",
                marginBottom: 12,
              }}
            >
              GLOBAL SYNC
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {GLOBAL_ACTIONS.map((a) => (
                <ActionRow
                  key={a.key}
                  action={a}
                  disabled={false}
                  status={status[a.key]}
                  onRun={() => run(a, "")}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionRow({
  action,
  disabled,
  status,
  onRun,
}: {
  action: SyncAction;
  disabled: boolean;
  status?: Status;
  onRun: () => void;
}) {
  const running = status?.state === "running";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          {action.label}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
          {action.desc}
        </div>
        {status?.state === "done" && (
          <div style={{ fontSize: 10, color: "var(--gold)", marginTop: 3 }}>
            ✓ {status.msg}
          </div>
        )}
        {status?.state === "error" && (
          <div style={{ fontSize: 10, color: "var(--red)", marginTop: 3 }}>
            ✕ {status.msg}
          </div>
        )}
      </div>
      <button
        onClick={onRun}
        disabled={disabled || running}
        style={{
          flexShrink: 0,
          padding: "7px 14px",
          borderRadius: 6,
          border: "none",
          background: disabled || running ? "var(--surface-3)" : "var(--gold)",
          color: disabled || running ? "var(--text-dim)" : "#0D0E11",
          fontSize: 12,
          fontWeight: 600,
          cursor: disabled || running ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          minWidth: 76,
        }}
      >
        {running ? "…" : "Sync"}
      </button>
    </div>
  );
}
