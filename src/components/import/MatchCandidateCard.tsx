"use client";

/**
 * MatchCandidateCard — one clickable candidate on the review page's
 * needs-review rows. Small card-art tile + name + number, selected state
 * highlighted gold. Web port of mobile's component of the same name.
 *
 * Plain <img>, not next/image — matches how inventory/page.tsx already
 * renders remote card art (TCGAPIs/Supabase-hosted URLs, not a domain
 * next/image is configured for).
 */

import { MatchCandidate } from "@/types/csvImport";

const CARD_WIDTH = 96;

export interface MatchCandidateCardProps {
  candidate: MatchCandidate;
  selected: boolean;
  onClick: () => void;
}

export function MatchCandidateCard({
  candidate,
  selected,
  onClick,
}: MatchCandidateCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: CARD_WIDTH,
        marginRight: 12,
        flexShrink: 0,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
      }}
    >
      <div
        style={{
          position: "relative",
          width: CARD_WIDTH,
          height: Math.round(CARD_WIDTH / (5 / 7)),
          borderRadius: 6,
          border: selected ? "2px solid var(--gold)" : "1px solid var(--border)",
          background: "var(--surface-2)",
          overflow: "hidden",
        }}
      >
        {candidate.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.imageUrl}
            alt={candidate.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 4,
            }}
          >
            <span style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center" }}>
              No image
            </span>
          </div>
        )}
        {selected && (
          <div
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "var(--gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0D0E11" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-primary)",
          marginTop: 4,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {candidate.name}
      </div>
      {candidate.number && (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          #{candidate.number}
        </div>
      )}
    </button>
  );
}
