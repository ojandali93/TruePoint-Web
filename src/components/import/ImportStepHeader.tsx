"use client";

/**
 * ImportStepHeader — back arrow + title, shared across every page in the
 * CSV import wizard. Web port of mobile's component of the same name —
 * same slots (title/subtitle/showBack/rightAction), adapted from RN
 * Pressable/Text to a plain button + next/navigation's router.back().
 */

import { useRouter } from "next/navigation";
import { ReactNode } from "react";

export interface ImportStepHeaderProps {
  title: string;
  /** Small line under the title — e.g. "490 items ready" */
  subtitle?: string;
  /** When false, hides the back arrow (e.g. mid-commit, to prevent leaving) */
  showBack?: boolean;
  rightAction?: ReactNode;
}

export function ImportStepHeader({
  title,
  subtitle,
  showBack = true,
  rightAction,
}: ImportStepHeaderProps) {
  const router = useRouter();

  return (
    <div style={{ marginBottom: 20 }}>
      {showBack ? (
        <button
          onClick={() => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "transparent",
            border: "none",
            padding: "4px 0",
            marginBottom: 10,
            cursor: "pointer",
            fontFamily: "inherit",
            color: "var(--gold)",
            fontSize: 13,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      ) : (
        <div style={{ height: 22 }} />
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)" }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        {rightAction}
      </div>
    </div>
  );
}
