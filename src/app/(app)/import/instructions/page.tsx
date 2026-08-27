"use client";

/**
 * Import Collection — per-source export instructions (Phase 4.5/W2). Sits
 * between the source picker and the file upload page: before asking for a
 * file, tell the user how to get one out of the source app. Renders
 * IMPORT_SOURCE_INSTRUCTIONS (src/lib/importSourceInstructions.ts) — a
 * data config, not hardcoded JSX, ported byte-identical from mobile.
 *
 * useSearchParams() requires a Suspense boundary in the App Router (it
 * opts the tree out of static rendering) — wrapped below.
 */

import { ImportStepHeader } from "@/components/import/ImportStepHeader";
import { ROUTES } from "@/constants/routes";
import {
  ImportInstructionIcon,
  IMPORT_SOURCE_INSTRUCTIONS,
} from "@/lib/importSourceInstructions";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const STEP_ICON_PATHS: Record<ImportInstructionIcon, React.ReactNode> = {
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  export: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </>
  ),
};

function ImportInstructionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const config = source ? IMPORT_SOURCE_INSTRUCTIONS[source] : undefined;

  const handleHaveFile = () => {
    router.push(ROUTES.IMPORT_UPLOAD);
  };

  if (!config) {
    // Unreachable via the picker today (only Collectr's row is enabled),
    // but a bad/missing source param shouldn't dead-end silently.
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px" }}>
        <ImportStepHeader title="Import Collection" />
        <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", padding: "40px 0" }}>
          We couldn&apos;t find instructions for that source. Go back and pick one from the list.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px" }}>
      <ImportStepHeader title={config.label} subtitle="Export instructions" />

      {!config.available ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 500, color: "var(--text-primary)" }}>
            {config.comingSoonNote}
          </div>
        </div>
      ) : (
        <>
          {config.intro && (
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 32 }}>
              {config.intro}
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {config.steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {STEP_ICON_PATHS[step.icon]}
                    </svg>
                  </div>
                  {i < config.steps.length - 1 && (
                    <div style={{ width: 1, flex: 1, minHeight: 16, background: "var(--border)", marginTop: 8 }} />
                  )}
                </div>
                <div style={{ paddingTop: 4 }}>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 2 }}>
                    Step {i + 1}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {step.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {config.footerNote && (
            <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 24 }}>
              {config.footerNote}
            </p>
          )}

          <button
            onClick={handleHaveFile}
            style={{
              marginTop: 32,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "var(--gold)",
              color: "#0D0E11",
              border: "none",
              borderRadius: 6,
              padding: "12px 20px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            I have my file
          </button>
        </>
      )}
    </div>
  );
}

export default function ImportInstructionsPage() {
  return (
    <Suspense fallback={null}>
      <ImportInstructionsContent />
    </Suspense>
  );
}
