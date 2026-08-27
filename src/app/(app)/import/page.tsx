"use client";

/**
 * Import Collection — source picker (entry point). Web port of mobile's
 * screen of the same purpose (Phase 4/W2 — docs/csv-import-design.md).
 * Collectr is the only wired source; each row is a distinct "source
 * mapper" slot — wiring TCGplayer/CollX later means adding a row here plus
 * a parser on the server, not restructuring this page.
 */

import { ImportStepHeader } from "@/components/import/ImportStepHeader";
import { ROUTES } from "@/constants/routes";
import { useRouter } from "next/navigation";

interface SourceOption {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

const SOURCES: SourceOption[] = [
  {
    key: "collectr",
    label: "Collectr",
    description: "Import a collection export CSV from the Collectr app.",
    enabled: true,
  },
  {
    key: "tcgplayer",
    label: "TCGplayer",
    description: "Coming soon.",
    enabled: false,
  },
  {
    key: "collx",
    label: "CollX",
    description: "Coming soon.",
    enabled: false,
  },
];

export default function ImportSourcePickerPage() {
  const router = useRouter();

  const handleSelect = (source: SourceOption) => {
    if (!source.enabled) return;
    router.push(`${ROUTES.IMPORT_INSTRUCTIONS}?source=${source.key}`);
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px" }}>
      <ImportStepHeader title="Import Collection" />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
          Bring in your existing collection from another app. Every card gets
          priced by ReverseHolo — not the source app&apos;s own numbers.
        </p>

        {SOURCES.map((source) => (
          <button
            key={source.key}
            onClick={() => handleSelect(source)}
            disabled={!source.enabled}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 16,
              opacity: source.enabled ? 1 : 0.5,
              cursor: source.enabled ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              textAlign: "left",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (source.enabled) e.currentTarget.style.background = "var(--surface-2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--surface)";
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                background: "var(--surface-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>
                {source.label}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                {source.description}
              </div>
            </div>
            {source.enabled && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
