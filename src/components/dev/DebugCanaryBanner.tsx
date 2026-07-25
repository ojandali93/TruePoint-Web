/**
 * DebugCanaryBanner — Phase 7 pipeline smoke test.
 *
 * Gated by the `tester_canary` flag seeded alongside the feature_flags
 * table migration. Renders NOTHING unless that flag resolves to true for
 * the current account.
 *
 * Purpose: prove the whole chain end-to-end (DB row → resolver →
 * /me/plan → PlanContext → useFlag → UI) on something with zero blast
 * radius, before gating a real feature. If this banner shows up for the
 * tester account and nobody else, the pipeline works.
 *
 * Safe to delete once the canary flag has served its purpose — nothing
 * else depends on it.
 */

"use client";

import { useFlag } from "../../context/PlanContext";

export default function DebugCanaryBanner() {
  const canaryOn = useFlag("tester_canary");
  if (!canaryOn) return null;

  return (
    <div
      style={{
        marginBottom: 20,
        background: "rgba(201,168,76,0.1)",
        border: "1px solid var(--gold)",
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: "var(--gold)",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>
        tester_canary is ON for this account — flag pipeline verified.
      </span>
    </div>
  );
}
