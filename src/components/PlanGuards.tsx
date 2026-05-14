// src/components/PlanGuards.tsx
//
// Two simple components for plan-gated UI:
//   <FeatureGate feature="portfolio_dashboard">...</FeatureGate>
//     → renders children if user has feature, else <UpgradeCard>
//   <UsageBar usageKey="aiGradingReports" />
//     → small "67/100 used this month" indicator

"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePlan, FeatureKey, PlanKey } from "../context/PlanContext";

const PLAN_LABEL: Record<PlanKey, string> = {
  starter: "Starter",
  collector: "Collector",
  pro: "Pro",
};

interface UpgradeCardProps {
  upgradeTo: PlanKey;
  feature?: string;
  compact?: boolean;
}

export function UpgradeCard({
  upgradeTo,
  feature = "this feature",
  compact = false,
}: UpgradeCardProps) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid rgba(201,168,76,0.3)",
        borderRadius: 12,
        padding: compact ? "16px 20px" : "32px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--gold)",
          fontFamily: "DM Mono, monospace",
          letterSpacing: "0.1em",
          marginBottom: 8,
        }}
      >
        {PLAN_LABEL[upgradeTo].toUpperCase()} PLAN
      </div>
      <div
        style={{
          fontSize: compact ? 14 : 16,
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: compact ? 8 : 12,
        }}
      >
        Upgrade to access {feature}
      </div>
      {!compact && (
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 20,
            maxWidth: 380,
            margin: "0 auto 20px",
            lineHeight: 1.5,
          }}
        >
          {feature} is part of the {PLAN_LABEL[upgradeTo]} plan. Upgrade anytime
          — your existing data stays intact.
        </div>
      )}
      <Link
        href='/settings?tab=billing'
        style={{
          display: "inline-block",
          padding: "10px 20px",
          background: "var(--gold)",
          color: "#0D0E11",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        Upgrade to {PLAN_LABEL[upgradeTo]} →
      </Link>
    </div>
  );
}

interface FeatureGateProps {
  feature: FeatureKey;
  upgradeTo?: PlanKey;
  featureLabel?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({
  feature,
  upgradeTo = "pro",
  featureLabel,
  children,
  fallback,
}: FeatureGateProps) {
  const { features, loading } = usePlan();

  if (loading) return null; // or a skeleton

  if (!features[feature]) {
    return (
      <>
        {fallback ?? (
          <UpgradeCard
            upgradeTo={upgradeTo}
            feature={featureLabel ?? feature}
          />
        )}
      </>
    );
  }

  return <>{children}</>;
}

interface UsageBarProps {
  usageKey: "aiGradingReports" | "submissions";
  label?: string;
}

export function UsageBar({ usageKey, label }: UsageBarProps) {
  const { usage } = usePlan();
  if (!usage) return null;

  const info = usage[usageKey];
  if (info.limit === null) {
    return (
      <span
        style={{
          fontSize: 11,
          color: "var(--text-dim)",
          fontFamily: "DM Mono, monospace",
        }}
      >
        {label ?? ""} {info.used} this month · unlimited
      </span>
    );
  }

  const pct = Math.min(100, (info.used / info.limit) * 100);
  const color = pct >= 100 ? "#EF4444" : pct >= 80 ? "#F59E0B" : "var(--gold)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 11,
        color: "var(--text-dim)",
        fontFamily: "DM Mono, monospace",
      }}
    >
      {label && <span>{label}</span>}
      <span>
        {info.used} / {info.limit}
      </span>
      <div
        style={{
          width: 60,
          height: 4,
          background: "var(--surface-2)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            transition: "width 0.2s",
          }}
        />
      </div>
    </div>
  );
}
