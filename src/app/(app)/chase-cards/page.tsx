"use client";

/**
 * Chase Cards — every chase card across every set, grouped by set.
 *
 * Pulls from GET /cards/chase, which reads pre-computed columns
 * (cards.is_chase_card / cards.chase_score) — see the backend's
 * chaseCards.service.ts for the actual scoring logic. Nothing here
 * computes chase status; this screen only displays it.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "../../../lib/api";

interface ChaseCard {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  imageSmall: string | null;
  imageLarge: string | null;
  chaseScore: number;
}

interface ChaseSetGroup {
  setId: string;
  setName: string;
  setSymbol: string | null;
  setLogo: string | null;
  cards: ChaseCard[];
}

export default function ChaseCardsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<ChaseSetGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data: ChaseSetGroup[] }>("/cards/chase")
      .then((res) => {
        if (!cancelled) setGroups(res.data.data);
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Failed to load chase cards",
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalCards = groups?.reduce((sum, g) => sum + g.cards.length, 0) ?? 0;

  return (
    <div
      style={{ padding: "24px 20px 60px", maxWidth: 1100, margin: "0 auto" }}
    >
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            letterSpacing: "0.08em",
            fontFamily: "DM Mono, monospace",
            marginBottom: 6,
          }}
        >
          CHASE CARDS
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          The main chase cards, set by set
        </h1>
        <p
          style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}
        >
          {groups
            ? `${totalCards} chase card${totalCards === 1 ? "" : "s"} across ${groups.length} set${groups.length === 1 ? "" : "s"}`
            : "Loading…"}
          {" — "}determined by price relative to each set&apos;s own median,
          weighted by rarity tier, not just the highest raw dollar amount.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            background: "rgba(232,95,95,0.1)",
            border: "1px solid #e85f5f55",
            color: "#e85f5f",
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {!groups && !error && (
        <div
          style={{ textAlign: "center", padding: 80, color: "var(--text-dim)" }}
        >
          Loading…
        </div>
      )}

      {groups?.length === 0 && (
        <div
          style={{ textAlign: "center", padding: 80, color: "var(--text-dim)" }}
        >
          No chase cards computed yet — this fills in as sets get priced.
        </div>
      )}

      {groups?.map((group) => (
        <div key={group.setId} style={{ marginBottom: 36 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: "1px solid var(--border)",
            }}
          >
            {group.setSymbol && (
              <Image
                src={group.setSymbol}
                alt=''
                width={20}
                height={20}
                style={{ objectFit: "contain" }}
              />
            )}
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {group.setName}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
              {group.cards.length} chase card
              {group.cards.length === 1 ? "" : "s"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {group.cards.map((card) => (
              <div
                key={card.id}
                onClick={() => router.push(`/cards/${group.setId}/${card.id}`)}
                style={{
                  cursor: "pointer",
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                }}
              >
                {card.imageSmall && (
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        top: 6,
                        left: 6,
                        zIndex: 1,
                        background: "var(--gold)",
                        color: "#1a1a1a",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}
                    >
                      CHASE
                    </div>
                    <Image
                      src={card.imageSmall}
                      alt={card.name}
                      width={150}
                      height={210}
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                      }}
                    />
                  </div>
                )}
                <div style={{ padding: "8px 10px" }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {card.name}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-dim)",
                      marginTop: 2,
                    }}
                  >
                    #{card.number}
                    {card.rarity ? ` · ${card.rarity}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
