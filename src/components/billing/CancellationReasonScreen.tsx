"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * CancellationReasonScreen — Flow B1 (FEEDBACK_DESIGN.md Phase 3). The
 * reason screen in front of the (now-working) web cancel flow. Non-blocking
 * — this replaces the old `window.confirm(...)` in settings/billing/page.tsx
 * (a blocking native dialog, the same class of thing UI_AUDIT.md's 127
 * Alert.alert findings flag on mobile) with an inline overlay panel.
 *
 * Skippable — "Skip and cancel" and "Send and cancel" both proceed with the
 * SAME underlying cancellation; the only difference is whether a
 * product_feedback row gets written first. Neither path is gated on an
 * answer.
 *
 * The caller (settings/billing/page.tsx) owns sequencing: cancel FIRST
 * (which sets subscriptions.cancel_requested_at server-side), THEN
 * submit/dismiss product-feedback — resolveFlowB2 on the server only
 * matches a row that already has cancel_requested_at set, so reversing
 * this order would silently no-op the feedback write. See onSkip/onSend's
 * doc comments below.
 */
import { useState } from "react";

export type CancellationReason =
  | "too_expensive"
  | "missing_feature"
  | "didnt_work_as_expected"
  | "not_using_enough"
  | "switched_to_another_app"
  | "other";

const REASONS: { value: CancellationReason; label: string }[] = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "missing_feature", label: "Missing a feature I need" },
  { value: "didnt_work_as_expected", label: "Didn't work as expected" },
  { value: "not_using_enough", label: "Not using it enough" },
  { value: "switched_to_another_app", label: "Switched to something else" },
  { value: "other", label: "Other" },
];

export interface CancellationReasonScreenProps {
  open: boolean;
  busy: boolean;
  /** Cancellation proceeds regardless — this fires with no feedback write. */
  onSkip: () => void;
  /** Cancellation proceeds; this fires with the chosen reason (+ optional
   * free text) for the caller to submit AFTER the cancel call succeeds. */
  onSend: (reason: CancellationReason, freeText: string) => void;
}

export function CancellationReasonScreen({
  open,
  busy,
  onSkip,
  onSend,
}: CancellationReasonScreenProps) {
  const [selected, setSelected] = useState<CancellationReason | null>(null);
  const [freeText, setFreeText] = useState("");

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 24,
          maxWidth: 440,
          width: "100%",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Before you go
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 18,
          }}
        >
          Mind sharing why? Totally optional — cancelling either way.
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {REASONS.map(({ value, label }) => {
            const active = selected === value;
            return (
              <button
                key={value}
                type='button'
                onClick={() => setSelected(value)}
                disabled={busy}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
                  background: active ? "var(--gold)" : "var(--surface-2)",
                  color: active ? "#0D0E11" : "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: busy ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {selected && (
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder='Anything else? (optional)'
            maxLength={2000}
            disabled={busy}
            style={{
              width: "100%",
              minHeight: 64,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              color: "var(--text-primary)",
              fontSize: 13,
              fontFamily: "inherit",
              resize: "vertical",
              marginBottom: 16,
            }}
          />
        )}

        <div style={{ display: "flex", gap: 10, marginTop: selected ? 0 : 16 }}>
          <button
            type='button'
            onClick={onSkip}
            disabled={busy}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 500,
              cursor: busy ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            Skip and cancel
          </button>
          <button
            type='button'
            onClick={() => selected && onSend(selected, freeText)}
            disabled={busy || !selected}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: selected ? "#EF4444" : "var(--surface-2)",
              color: selected ? "#fff" : "var(--text-dim)",
              fontSize: 13,
              fontWeight: 500,
              cursor: busy || !selected ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {busy ? "Canceling…" : "Send and cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
