"use client";

/**
 * TrackRegradeModal — web equivalent of mobile's combined create/edit sheet.
 *
 * Handles both:
 *   - CREATE: pass cardId/cardName/cardNumber. Starts status="researching".
 *   - EDIT:   pass `existing`. Adds a status picker and a Delete button.
 *
 * Both modes show the live price ladder so picking a target grade is done
 * against real numbers, not a blind dropdown.
 */

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import {
  createTrackedRegrade,
  deleteTrackedRegrade,
  TRACKED_REGRADE_STATUSES,
  updateTrackedRegrade,
  useGradeLadder,
  type LadderEntry,
  type TrackedRegradeRow,
  type TrackedRegradeStatus,
} from "../../hooks/useRegradeTracker";
import { PriceChartingAttribution } from "../cards/PriceChartingAttribution";

const COMPANY_COLORS: Record<string, string> = {
  PSA: "#C9A84C",
  BGS: "#378ADD",
  CGC: "#3DAA6E",
  TAG: "#D85A30",
  SGC: "#7F77DD",
};

const STATUS_LABEL: Record<TrackedRegradeStatus, string> = {
  researching: "Researching",
  owned: "Owned",
  submitted: "Submitted",
  returned: "Returned",
  sold: "Sold",
};

export interface TrackRegradeModalProps {
  onClose: () => void;
  onSaved: () => void; // caller re-fetches its list on success
  onDeleted?: () => void;
  createCardId?: string;
  createCardName?: string;
  createCardNumber?: string;
  // Prefill for create mode when the card was picked from inventory and is
  // already graded — skips re-entering what the app already knows. Ignored
  // in edit mode.
  createCurrentCompany?: string | null;
  createCurrentGrade?: string | null;
  existing?: TrackedRegradeRow;
}

export function TrackRegradeModal({
  onClose,
  onSaved,
  onDeleted,
  createCardId,
  createCardName,
  createCardNumber,
  createCurrentCompany,
  createCurrentGrade,
  existing,
}: TrackRegradeModalProps) {
  const isEdit = !!existing;
  const cardId = existing?.cardId ?? createCardId ?? null;

  const ladder = useGradeLadder(cardId);

  const [targetCompany, setTargetCompany] = useState<string | null>(
    existing?.targetCompany ?? null,
  );
  const [targetGrade, setTargetGrade] = useState<string | null>(
    existing?.targetGrade ?? null,
  );
  const [currentCompany, setCurrentCompany] = useState<string | null>(
    existing?.currentCompany ?? createCurrentCompany ?? null,
  );
  const [currentGrade, setCurrentGrade] = useState<string | null>(
    existing?.currentGrade ?? createCurrentGrade ?? null,
  );
  const [acquisitionPrice, setAcquisitionPrice] = useState(
    existing?.acquisitionPrice != null ? String(existing.acquisitionPrice) : "",
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [status, setStatus] = useState<TrackedRegradeStatus>(
    existing?.status ?? "researching",
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Accordion state. Fresh create walks Current → Target in order; edit
  // starts with both collapsed (already resolved) and either can be
  // reopened by clicking its header. This component remounts fresh each
  // time the caller opens it (no reset effect needed, unlike mobile), so
  // these initial values are computed once, straight from props.
  const startsGraded = existing
    ? !!existing.currentCompany
    : !!createCurrentCompany;
  const startsResolved = existing ? true : !!createCurrentCompany; // inventory pick already answered this
  const [expandedSection, setExpandedSection] = useState<
    "current" | "target" | null
  >(existing ? null : startsResolved ? "target" : "current");
  const [currentChoice, setCurrentChoice] = useState<"raw" | "graded" | null>(
    existing
      ? startsGraded
        ? "graded"
        : "raw"
      : startsResolved
        ? "graded"
        : null,
  );

  // Group the flat ladder into per-company sections, matching mobile.
  const ladderByCompany = useMemo(() => {
    const rows = ladder.data?.ladder ?? [];
    const grouped = new Map<string, LadderEntry[]>();
    for (const row of rows) {
      if (!grouped.has(row.company)) grouped.set(row.company, []);
      grouped.get(row.company)!.push(row);
    }
    return grouped;
  }, [ladder.data]);

  const pickTarget = (company: string, grade: string) => {
    setTargetCompany(company);
    setTargetGrade(grade);
    setExpandedSection(null);
  };

  const chooseRaw = () => {
    setCurrentChoice("raw");
    setCurrentCompany(null);
    setCurrentGrade(null);
    setExpandedSection(targetGrade ? null : "target");
  };

  const chooseGraded = () => {
    setCurrentChoice("graded");
  };

  const pickCurrent = (company: string, grade: string) => {
    setCurrentCompany(company);
    setCurrentGrade(grade);
    setExpandedSection(targetGrade ? null : "target");
  };

  const toggleSection = (section: "current" | "target") => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const save = async () => {
    if (!cardId) return;
    if (!targetCompany || !targetGrade) {
      setErr("Pick a target grade from the ladder below");
      return;
    }
    const parsedPrice =
      acquisitionPrice.trim() === "" ? null : Number(acquisitionPrice);
    if (parsedPrice !== null && (!isFinite(parsedPrice) || parsedPrice < 0)) {
      setErr("Acquisition price must be a positive number");
      return;
    }

    setSaving(true);
    setErr(null);
    try {
      if (isEdit && existing) {
        await updateTrackedRegrade(existing.id, {
          currentCompany,
          currentGrade,
          targetCompany,
          targetGrade,
          acquisitionPrice: parsedPrice,
          status,
          notes: notes.trim() || null,
        });
      } else {
        await createTrackedRegrade({
          cardId,
          currentCompany,
          currentGrade,
          targetCompany,
          targetGrade,
          acquisitionPrice: parsedPrice,
          notes: notes.trim() || null,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteTrackedRegrade(existing.id);
      onDeleted?.();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete");
      setDeleting(false);
    }
  };

  // Close on Escape, matching the admin flag editor's overlay convention.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving && !deleting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving, deleting]);

  const cardName = existing?.cardName ?? createCardName ?? "";
  const cardNumber = existing?.cardNumber ?? createCardNumber ?? "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving && !deleting) onClose();
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
          width: 480,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 2,
          }}
        >
          {isEdit ? "Edit tracked card" : "Track for regrade"}
        </div>
        {!!cardName && (
          <div
            style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 16 }}
          >
            {cardName}
            {cardNumber ? ` · #${cardNumber}` : ""}
          </div>
        )}

        {/* ─── Current condition ──────────────────────────────────── */}
        <AccordionSection
          title='Current condition'
          summary={
            currentChoice === "raw"
              ? "Raw / Ungraded"
              : currentCompany && currentGrade
                ? `${currentCompany} ${currentGrade}`
                : "Not set"
          }
          resolved={currentChoice !== null}
          expanded={expandedSection === "current"}
          onToggle={() => toggleSection("current")}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={chooseRaw}
              style={choiceButtonStyle(currentChoice === "raw")}
            >
              Raw / Ungraded
            </button>
            <button
              onClick={chooseGraded}
              style={choiceButtonStyle(currentChoice === "graded")}
            >
              Already graded
            </button>
          </div>

          {currentChoice === "graded" && (
            <div style={{ marginTop: 12 }}>
              <GradeGrid
                ladder={ladder}
                ladderByCompany={ladderByCompany}
                selectedCompany={currentCompany}
                selectedGrade={currentGrade}
                onPick={pickCurrent}
              />
            </div>
          )}
        </AccordionSection>

        {/* ─── Target grade ───────────────────────────────────────── */}
        <AccordionSection
          title='Target grade'
          summary={
            targetCompany && targetGrade
              ? `${targetCompany} ${targetGrade}`
              : "Not set"
          }
          resolved={!!targetCompany && !!targetGrade}
          expanded={expandedSection === "target"}
          onToggle={() => toggleSection("target")}
        >
          <GradeGrid
            ladder={ladder}
            ladderByCompany={ladderByCompany}
            selectedCompany={targetCompany}
            selectedGrade={targetGrade}
            onPick={pickTarget}
          />
        </AccordionSection>

        {/* ─── Status (edit mode only) ────────────────────────────── */}
        {isEdit && (
          <div style={{ marginBottom: 20 }}>
            <div style={fieldLabel}>STATUS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TRACKED_REGRADE_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  style={chipStyle(status === s)}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Acquisition price ─────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <div style={fieldLabel}>ACQUISITION PRICE (OPTIONAL)</div>
          <input
            value={acquisitionPrice}
            onChange={(e) =>
              setAcquisitionPrice(e.target.value.replace(/[^0-9.]/g, ""))
            }
            placeholder="What you'd pay / paid"
            style={inputStyle}
          />
          <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 6 }}>
            If left blank, profit estimates use today&apos;s price at your
            current grade instead.
          </div>
        </div>

        {/* ─── Notes ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <div style={fieldLabel}>NOTES (OPTIONAL)</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder='Centering looks strong on front, back is soft…'
            rows={3}
            style={{ ...inputStyle, resize: "vertical" as const }}
          />
        </div>

        <div
          style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 16 }}
        >
          Profit estimates are target price minus cost basis minus grading fee
          only — shipping, insurance, and selling fees aren&apos;t netted yet.
        </div>

        {err && (
          <div style={{ fontSize: 11, color: "#e85f5f", marginBottom: 12 }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: isEdit ? 12 : 0 }}>
          <button
            onClick={onClose}
            disabled={saving || deleting}
            style={secondaryButtonStyle}
          >
            {isEdit ? "Close" : "Cancel"}
          </button>
          <button
            onClick={save}
            disabled={saving || deleting}
            style={primaryButtonStyle(saving)}
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Start tracking"}
          </button>
        </div>

        {isEdit && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <button
              onClick={remove}
              disabled={saving || deleting}
              style={{
                width: "100%",
                padding: "8px 0",
                borderRadius: 8,
                border: "1px solid #e85f5f55",
                background: "transparent",
                color: "#e85f5f",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting
                ? "Deleting…"
                : confirmDelete
                  ? "Click again to confirm delete"
                  : "Stop tracking this card"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Style helpers ──────────────────────────────────────────────────────────

const fieldLabel: CSSProperties = {
  fontSize: 11,
  color: "var(--text-dim)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const inputStyle: CSSProperties = {
  width: "100%",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  color: "var(--text-primary)",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
    background: active ? "rgba(201,168,76,0.1)" : "var(--surface)",
    color: active ? "var(--gold)" : "var(--text-primary)",
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

// ─── Accordion shell ────────────────────────────────────────────────────────
//
// Collapsed: title + resolved-value summary + chevron, click to expand.
// Expanded: same header, plus whatever's passed as children below it. Used
// identically for both Current and Target so they look and behave the
// same — the thing that was inconsistent before this redesign.

function AccordionSection({
  title,
  summary,
  resolved,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  resolved: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        border: `1px solid ${expanded ? "var(--gold)" : "var(--border)"}`,
        borderRadius: 10,
        background: "var(--surface)",
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              letterSpacing: "0.06em",
              fontWeight: 600,
            }}
          >
            {title.toUpperCase()}
          </div>
          <div
            style={{
              fontSize: 13,
              color: resolved ? "var(--text-primary)" : "var(--text-dim)",
              fontWeight: resolved ? 600 : 400,
              marginTop: 2,
            }}
          >
            {summary}
          </div>
        </div>
        <span
          style={{
            color: "var(--text-secondary)",
            fontSize: 12,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}
        >
          ▾
        </span>
      </button>

      {expanded && <div style={{ padding: "0 16px 16px" }}>{children}</div>}
    </div>
  );
}

function choiceButtonStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    padding: "10px 0",
    borderRadius: 8,
    border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
    background: active ? "rgba(201,168,76,0.1)" : "var(--surface-2)",
    color: active ? "var(--gold)" : "var(--text-primary)",
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

// ─── Shared grade grid ──────────────────────────────────────────────────────
//
// One component, used for both Current and Target — this is what makes the
// two pickers actually look and behave identically instead of the
// mismatched chip styles the old layout had.

function GradeGrid({
  ladder,
  ladderByCompany,
  selectedCompany,
  selectedGrade,
  onPick,
}: {
  ladder: ReturnType<typeof useGradeLadder>;
  ladderByCompany: Map<string, LadderEntry[]>;
  selectedCompany: string | null;
  selectedGrade: string | null;
  onPick: (company: string, grade: string) => void;
}) {
  if (ladder.loading) {
    return (
      <div
        style={{ padding: "16px 0", fontSize: 12, color: "var(--text-dim)" }}
      >
        Loading…
      </div>
    );
  }
  if (ladder.error) {
    return (
      <div style={{ fontSize: 12, color: "#e85f5f" }}>
        Couldn&apos;t load prices for this card.
      </div>
    );
  }
  if (ladderByCompany.size === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
        No graded price data yet for this card.
      </div>
    );
  }

  return (
    <div>
      {!!ladder.data?.rawPrice && (
        <div
          style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 10 }}
        >
          Raw market price: ${ladder.data.rawPrice.toFixed(0)}
        </div>
      )}
      {Array.from(ladderByCompany.entries()).map(([company, entries]) => (
        <div key={company} style={{ marginBottom: 10 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: COMPANY_COLORS[company] ?? "var(--text-secondary)",
              marginBottom: 6,
            }}
          >
            {company}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {entries.map((e) => {
              const isSelected =
                selectedCompany === company && selectedGrade === e.grade;
              return (
                <button
                  key={`${company}-${e.grade}`}
                  onClick={() => onPick(company, e.grade)}
                  style={chipStyle(isSelected)}
                >
                  {e.grade} · ${e.price.toFixed(0)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {(() => {
        const pcEntry = ladder.data?.ladder.find((e) => e.source === "pricecharting");
        return pcEntry ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <PriceChartingAttribution productId={pcEntry.sourceProductId} />
          </div>
        ) : null;
      })()}
    </div>
  );
}

const secondaryButtonStyle: CSSProperties = {
  flex: 1,
  padding: "8px 0",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};

function primaryButtonStyle(saving: boolean): CSSProperties {
  return {
    flex: 1,
    padding: "8px 0",
    borderRadius: 8,
    border: "none",
    background: "var(--gold)",
    color: "var(--charcoal, #0E0E12)",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    opacity: saving ? 0.6 : 1,
  };
}
