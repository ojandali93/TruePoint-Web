"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSets } from "../../../hooks/useCards";

const SERIES_ORDER = [
  "Scarlet & Violet",
  "Sword & Shield",
  "Sun & Moon",
  "XY",
  "Black & White",
  "HeartGold & SoulSilver",
  "Platinum",
  "Diamond & Pearl",
  "EX",
  "e-Card",
  "Neo",
  "Gym",
  "Base",
  "Other",
];

export default function SetsPage() {
  const { sets, loading, error } = useSets();
  const [search, setSearch] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const router = useRouter();

  const filtered = sets.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesSeries = !selectedSeries || s.series === selectedSeries;
    return matchesSearch && matchesSeries;
  });

  const series = [...new Set(sets.map((s) => s.series))].sort((a, b) => {
    const ai = SERIES_ORDER.indexOf(a);
    const bi = SERIES_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const grouped = series.reduce<Record<string, typeof sets>>((acc, s) => {
    const group = filtered.filter((set) => set.series === s);
    if (group.length > 0) acc[s] = group;
    return acc;
  }, {});

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
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

      {/* Search + filters */}
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

        <div
          className='series-filter-row'
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <button
            onClick={() => setSelectedSeries(null)}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: `1px solid ${!selectedSeries ? "var(--gold)" : "var(--border)"}`,
              background: !selectedSeries
                ? "rgba(201,168,76,0.12)"
                : "var(--surface)",
              color: !selectedSeries ? "var(--gold)" : "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            All series
          </button>
          {series.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSeries(s === selectedSeries ? null : s)}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                border: `1px solid ${selectedSeries === s ? "var(--gold)" : "var(--border)"}`,
                background:
                  selectedSeries === s
                    ? "rgba(201,168,76,0.12)"
                    : "var(--surface)",
                color:
                  selectedSeries === s
                    ? "var(--gold)"
                    : "var(--text-secondary)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 80,
            color: "var(--text-dim)",
            fontSize: 13,
          }}
        >
          Loading sets...
        </div>
      )}

      {error && (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: "var(--red)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Grouped by series */}
      {Object.entries(grouped).map(([seriesName, seriesSets]) => (
        <div key={seriesName} style={{ marginBottom: 48 }}>
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
              {seriesSets.length}
            </span>
          </div>

          <div
            className='sets-grid'
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {seriesSets.map((set) => (
              <button
                key={set.id}
                onClick={() => router.push(`/cards/${set.id}`)}
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
                    <Image
                      src={set.images.logo}
                      alt={set.name}
                      width={120}
                      height={48}
                      style={{
                        objectFit: "contain",
                        maxWidth: "100%",
                        maxHeight: 48,
                      }}
                    />
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
                      style={{ objectFit: "contain" }}
                    />
                  )}
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-dim)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {set.printedTotal} cards · {set.releaseDate}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
