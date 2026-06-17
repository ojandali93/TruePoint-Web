"use client";

/**
 * Set list page — /cards
 *
 * Shows all sets returned by the API (the backend already filters out anything
 * without tcgapis_group_id). Groups by series — series is DERIVED FROM THE
 * SET NAME via lib/setSeries.ts since TCGAPIs-native rows have series=null.
 *
 * Tapping a set navigates to /cards/[setId].
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { useSets, type PokemonSet } from "../../../hooks/useBrowse";
import {
  classifySeries,
  getSetLanguage,
  groupSetsBySeries,
} from "../../../lib/setSeries";
import { SetLogoPlaceholder } from "@/components/SetLogoPlaceholder.web";

export default function SetsPage() {
  const router = useRouter();
  const { sets, loading, error } = useSets();
  const [search, setSearch] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [language, setLanguage] = useState<"all" | "English" | "Japanese">(
    "all",
  );

  // Search-filter first
  // Language filter first, then search
  const searched = useMemo(
    () =>
      sets
        .filter((s) => language === "all" || getSetLanguage(s) === language)
        .filter((s) =>
          !search ? true : s.name.toLowerCase().includes(search.toLowerCase()),
        ),
    [sets, search, language],
  );

  // Group into series buckets (derived from name)
  const grouped = useMemo(() => groupSetsBySeries(searched), [searched]);

  // Series chip filter — only show buckets that exist
  const visibleSeries = useMemo(() => grouped.map((g) => g.series), [grouped]);

  const displayed = useMemo(
    () =>
      selectedSeries
        ? grouped.filter((g) => g.series === selectedSeries)
        : grouped,
    [grouped, selectedSeries],
  );

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--gold)",
            letterSpacing: "0.1em",
            fontFamily: "DM Mono, monospace",
            marginBottom: 8,
          }}
        >
          SET BROWSER
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Pokémon TCG Sets
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {sets.length} sets across all series
        </p>
      </div>

      <div
        style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search sets...'
            style={{
              width: "100%",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 14px 10px 38px",
              fontSize: 13,
              color: "var(--text-primary)",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 14,
              color: "var(--text-dim)",
            }}
          >
            ⌕
          </span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <SeriesChip
            label='All languages'
            active={language === "all"}
            onClick={() => setLanguage("all")}
          />
          <SeriesChip
            label='English'
            active={language === "English"}
            onClick={() => setLanguage("English")}
          />
          <SeriesChip
            label='Japanese'
            active={language === "Japanese"}
            onClick={() => setLanguage("Japanese")}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <SeriesChip
            label='All series'
            active={!selectedSeries}
            onClick={() => setSelectedSeries(null)}
          />
          {visibleSeries.map((s) => (
            <SeriesChip
              key={s}
              label={s}
              active={selectedSeries === s}
              onClick={() => setSelectedSeries(s === selectedSeries ? null : s)}
            />
          ))}
        </div>
      </div>

      {loading && <div style={messageStyle}>Loading sets...</div>}
      {error && (
        <div style={{ ...messageStyle, color: "var(--red)" }}>{error}</div>
      )}

      {!loading &&
        !error &&
        displayed.map((group) => (
          <SeriesSection
            key={group.series}
            seriesName={group.series}
            sets={group.sets}
            onSetTap={(set) => router.push(`/cards/${set.id}`)}
          />
        ))}

      {!loading && !error && displayed.length === 0 && (
        <div style={messageStyle}>No sets match your filters.</div>
      )}
    </div>
  );
}

const messageStyle: React.CSSProperties = {
  textAlign: "center",
  padding: 80,
  color: "var(--text-dim)",
  fontSize: 13,
};

function SeriesChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 6,
        border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
        background: active ? "rgba(201,168,76,0.12)" : "var(--surface)",
        color: active ? "var(--gold)" : "var(--text-secondary)",
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function SeriesSection({
  seriesName,
  sets,
  onSetTap,
}: {
  seriesName: string;
  sets: PokemonSet[];
  onSetTap: (set: PokemonSet) => void;
}) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-secondary)",
            letterSpacing: "0.06em",
          }}
        >
          {seriesName.toUpperCase()}
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
          }}
        >
          {sets.length}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        {sets.map((set) => (
          <SetTile key={set.id} set={set} onClick={() => onSetTap(set)} />
        ))}
      </div>
    </div>
  );
}

function SetTile({ set, onClick }: { set: PokemonSet; onClick: () => void }) {
  // Show derived-series label as a tiny accent above the name
  const seriesLabel = classifySeries(set.name);

  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "20px 16px",
        cursor: "pointer",
        textAlign: "left",
        transition: "border-color 0.15s ease, transform 0.15s ease",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--gold-dim)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {set.images?.logo && (
        <div
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          {set.images?.logo ? (
            <Image
              src={set.images.logo}
              alt={set.name}
              width={120}
              height={48}
              style={{
                objectFit: "contain",
                maxWidth: "100%",
                maxHeight: 48,
                width: "auto",
                height: "auto",
              }}
            />
          ) : (
            <SetLogoPlaceholder width={58} height={48} />
          )}
        </div>
      )}
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: 4,
          lineHeight: 1.3,
        }}
      >
        {set.name}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {set.images?.symbol && (
          <Image
            src={set.images.symbol}
            alt=''
            width={14}
            height={14}
            style={{ objectFit: "contain", width: "auto", height: 14 }}
          />
        )}
        <span
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            fontFamily: "DM Mono, monospace",
          }}
        >
          {set.printedTotal ?? "—"} cards · {set.releaseDate}
        </span>
      </div>
    </button>
  );
}
