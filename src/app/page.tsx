"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase";
import { ROUTES } from "../constants/routes";
import { useEffect } from "react";

const TICKER_ITEMS = [
  {
    name: "Charizard ex SIR",
    grade: "PSA 10",
    price: "$2,840",
    change: "+12.4%",
    up: true,
  },
  {
    name: "Pikachu Illustrator",
    grade: "PSA 9",
    price: "$68,000",
    change: "+3.1%",
    up: true,
  },
  {
    name: "Umbreon VMAX Alt",
    grade: "BGS 9.5",
    price: "$1,240",
    change: "-2.8%",
    up: false,
  },
  {
    name: "Lugia Base Holo",
    grade: "PSA 8",
    price: "$890",
    change: "+5.6%",
    up: true,
  },
  {
    name: "Rayquaza Gold Star",
    grade: "CGC 9",
    price: "$3,400",
    change: "+8.2%",
    up: true,
  },
  {
    name: "Tropical Wind Trophy",
    grade: "PSA 7",
    price: "$14,200",
    change: "-1.4%",
    up: false,
  },
  {
    name: "Charizard ex SIR",
    grade: "PSA 10",
    price: "$2,840",
    change: "+12.4%",
    up: true,
  },
  {
    name: "Pikachu Illustrator",
    grade: "PSA 9",
    price: "$68,000",
    change: "+3.1%",
    up: true,
  },
  {
    name: "Umbreon VMAX Alt",
    grade: "BGS 9.5",
    price: "$1,240",
    change: "-2.8%",
    up: false,
  },
  {
    name: "Lugia Base Holo",
    grade: "PSA 8",
    price: "$890",
    change: "+5.6%",
    up: true,
  },
  {
    name: "Rayquaza Gold Star",
    grade: "CGC 9",
    price: "$3,400",
    change: "+8.2%",
    up: true,
  },
  {
    name: "Tropical Wind Trophy",
    grade: "PSA 7",
    price: "$14,200",
    change: "-1.4%",
    up: false,
  },
];

const FEATURES = [
  {
    number: "01",
    label: "Precision Grading",
    title: "TruePoint Score",
    description:
      "Upload front and back scans. Place border lines. Receive a weighted centering score across L/R and T/B axes — the same measurement graders use, in your hands before submission.",
    stats: [
      { label: "Axes measured", value: "2" },
      { label: "Companies", value: "PSA · BGS · CGC · TAG" },
      { label: "Precision", value: "0.01%" },
    ],
  },
  {
    number: "02",
    label: "Financial Intelligence",
    title: "Regrade Arbitrage",
    description:
      "See exactly what your card is worth at every grade across every company. Net profit after fees, shipping, and turnaround calculated automatically — so you know when to crack and regrade.",
    stats: [
      { label: "Price sources", value: "TCGPlayer · CardMarket · eBay" },
      { label: "Companies", value: "PSA · BGS · CGC · TAG" },
      { label: "Fee models", value: "Live" },
    ],
  },
  {
    number: "03",
    label: "Collection Management",
    title: "Master Set Tracker",
    description:
      "Track completion across three tiers — Base Master, Master Set, and Grand Master. Every card, every variant, every stamp. Know exactly what you own and what you need.",
    stats: [
      { label: "Tiers", value: "3" },
      { label: "Cards tracked", value: "18,000+" },
      { label: "Sets", value: "160+" },
    ],
  },
  {
    number: "04",
    label: "Portfolio Tracking",
    title: "Full Collection Intelligence",
    description:
      "Track everything you own in one place — sealed boxes and ETBs, raw singles, and graded slabs. Real-time market values, cost basis, and unrealized P&L across your entire collection.",
    stats: [
      { label: "Collection types", value: "Sealed · Singles · Graded" },
      { label: "Valuation", value: "Live market prices" },
      { label: "Metrics", value: "P&L · Cost basis · ROI" },
    ],
  },
];

const COLLECTION_TYPES = [
  {
    title: "Sealed Products",
    description:
      "Booster boxes, Elite Trainer Boxes, tins, and collections. Track market value, acquisition cost, and the decision to open or hold.",
    icon: "□",
    items: [
      "Booster boxes",
      "Elite Trainer Boxes",
      "Tins & collections",
      "Promo products",
    ],
  },
  {
    title: "Raw Singles",
    description:
      "Every ungraded card in your collection with condition, acquisition cost, and current market value across TCGPlayer, CardMarket, and eBay.",
    icon: "◇",
    items: [
      "Condition tracking",
      "Cost basis",
      "Market value",
      "Pre-grade analysis",
    ],
  },
  {
    title: "Graded Cards",
    description:
      "PSA, BGS, CGC, and TAG slabs with certification numbers, grade history, and live graded market prices. Full grading lifecycle from submission to return.",
    icon: "◈",
    items: [
      "All major companies",
      "Cert number tracking",
      "Grade lifecycle",
      "Slab market prices",
    ],
  },
];

const NEWS_ITEMS = [
  {
    type: "TRUEPOINT UPDATE",
    date: "May 2026",
    title: "Centering tool now live",
    body: "The TruePoint Score centering engine is deployed. Submit front and back scans and receive a weighted score with grade predictions for PSA, BGS, CGC, and TAG.",
    tag: "Product",
  },
  {
    type: "POKEMON NEWS",
    date: "May 2026",
    title: "Stellar Crown set announced",
    body: "The Pokémon Company has announced the next major expansion releasing Q3 2026, featuring returning fan-favorite Pokémon with new mechanic variants.",
    tag: "TCG News",
  },
  {
    type: "TRUEPOINT UPDATE",
    date: "April 2026",
    title: "Card database fully indexed",
    body: "All 18,000+ cards across 160+ sets are now searchable with real-time pricing from TCGPlayer, CardMarket, and eBay graded sales data.",
    tag: "Platform",
  },
  {
    type: "POKEMON NEWS",
    date: "April 2026",
    title: "PSA updates centering standards",
    body: "PSA has officially updated its Gem Mint 10 centering requirement to 55/45, making previously borderline cards now eligible for the top grade.",
    tag: "Grading",
  },
];

const ROADMAP = [
  {
    quarter: "Q2 2026",
    status: "NOW",
    color: "#3DAA6E",
    items: [
      "TruePoint centering score",
      "Card search & set browser",
      "Auth & user profiles",
      "Market pricing (3 sources)",
    ],
  },
  {
    quarter: "Q3 2026",
    status: "NEXT",
    color: "#C9A84C",
    items: [
      "Singles & graded inventory",
      "Sealed product tracking",
      "Master set tracker",
      "Regrade arbitrage tool",
    ],
  },
  {
    quarter: "Q4 2026",
    status: "PLANNED",
    color: "#4A4F5E",
    items: [
      "Full portfolio dashboard",
      "P&L and cost basis tracking",
      "Pack opening analytics",
      "Price alerts & notifications",
    ],
  },
  {
    quarter: "Q1 2027",
    status: "FUTURE",
    color: "#4A4F5E",
    items: [
      "Mobile app (iOS & Android)",
      "Pre-grading prediction AI",
      "Collection sharing profiles",
      "Bulk submission tools",
    ],
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    cadence: "forever",
    badge: "FREE",
    badgeColor: "#3DAA6E",
    featured: false,
    cta: "Get started free",
    features: [
      { text: "TruePoint centering score", included: true },
      { text: "Master set tracker", included: true, note: "3 sets" },
      { text: "Card search & live prices", included: true },
      { text: "Set browser", included: true },
      { text: "Regrade arbitrage", included: false },
      { text: "Inventory tracking", included: false },
      { text: "Portfolio dashboard", included: false },
      { text: "Sealed collection tracking", included: false },
    ],
  },
  {
    name: "Collector",
    price: "$9.99",
    cadence: "per month",
    badge: "MOST POPULAR",
    badgeColor: "#C9A84C",
    featured: true,
    cta: "Start Collector plan",
    features: [
      { text: "Everything in Starter", included: true },
      { text: "Regrade arbitrage", included: true, note: "50/mo" },
      { text: "Master set tracker", included: true, note: "unlimited" },
      { text: "Singles & graded inventory", included: true },
      { text: "Price alerts", included: true, note: "10 cards" },
      { text: "Sealed collection tracking", included: false },
      { text: "Full portfolio dashboard", included: false },
      { text: "Pack opening analytics", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$19.99",
    cadence: "per month · $179/yr",
    badge: "PRO",
    badgeColor: "#BA7517",
    featured: false,
    cta: "Start Pro plan",
    features: [
      { text: "Everything in Collector", included: true },
      { text: "Regrade arbitrage", included: true, note: "unlimited" },
      { text: "Sealed collection tracking", included: true },
      { text: "Full portfolio dashboard", included: true },
      { text: "P&L and cost basis tracking", included: true },
      { text: "Pack opening analytics", included: true },
      { text: "Price alerts", included: true, note: "unlimited" },
      { text: "Early access to new features", included: true },
    ],
  },
];

const METRICS = [
  { value: "18,000+", label: "Cards indexed" },
  { value: "160+", label: "Sets tracked" },
  { value: "4", label: "Grading companies" },
  { value: "3", label: "Price sources" },
];

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(ROUTES.DASHBOARD);
      }
    });
  }, [router, supabase]);

  return (
    <>
      <div className='grain-overlay' />

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(12px)",
          background: "rgba(13,14,17,0.85)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Image
            src='/tp-logo-gold-white.png'
            alt='TruePoint TCG'
            height={36}
            width={160}
            style={{ objectFit: "contain" }}
            priority
          />
          <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
            {["Features", "Collection", "Pricing", "Roadmap"].map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase()}`}
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  textDecoration: "none",
                  letterSpacing: "0.04em",
                }}
              >
                {l}
              </a>
            ))}
            <Link
              href='/login'
              className='btn-secondary'
              style={{ padding: "8px 20px", fontSize: 13 }}
            >
              Sign in
            </Link>
            <Link
              href='#pricing'
              className='btn-primary'
              style={{ padding: "8px 20px", fontSize: 13 }}
            >
              See pricing
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Ticker ──────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: 64,
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "10px 0",
          overflow: "hidden",
        }}
      >
        <div className='ticker-wrap'>
          <div className='ticker-inner'>
            {TICKER_ITEMS.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0 32px",
                  borderRight: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {item.name}
                </span>
                <span
                  className='font-mono'
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim)",
                    background: "var(--surface-3)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  {item.grade}
                </span>
                <span
                  className='font-mono'
                  style={{
                    fontSize: 12,
                    color: "var(--text-primary)",
                    fontWeight: 500,
                  }}
                >
                  {item.price}
                </span>
                <span
                  className='font-mono'
                  style={{
                    fontSize: 11,
                    color: item.up ? "var(--green)" : "var(--red)",
                  }}
                >
                  {item.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          minHeight: "86vh",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <div
          className='hero-glow'
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -60%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.03,
            backgroundImage:
              "linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "80px 24px",
            position: "relative",
            zIndex: 1,
            width: "100%",
          }}
        >
          <div style={{ maxWidth: 800 }}>
            <div
              className='animate-fade-up'
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: "6px 14px",
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--green)",
                  boxShadow: "0 0 6px var(--green)",
                }}
              />
              <span
                className='font-mono'
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  letterSpacing: "0.08em",
                }}
              >
                LIVE MARKET DATA · 18,000+ CARDS INDEXED
              </span>
            </div>
            <h1
              className='font-display animate-fade-up delay-100'
              style={{
                fontSize: "clamp(56px, 8vw, 104px)",
                lineHeight: 0.95,
                letterSpacing: "0.02em",
                marginBottom: 8,
              }}
            >
              THE COLLECTOR&apos;S
            </h1>
            <h1
              className='font-display animate-fade-up delay-200'
              style={{
                fontSize: "clamp(56px, 8vw, 104px)",
                lineHeight: 0.95,
                letterSpacing: "0.02em",
                marginBottom: 8,
              }}
            >
              <span className='gold-shimmer'>INTELLIGENCE</span>
            </h1>
            <h1
              className='font-display animate-fade-up delay-300'
              style={{
                fontSize: "clamp(56px, 8vw, 104px)",
                lineHeight: 0.95,
                letterSpacing: "0.02em",
                marginBottom: 40,
              }}
            >
              PLATFORM
            </h1>
            <p
              className='animate-fade-up delay-400'
              style={{
                fontSize: 16,
                color: "var(--text-secondary)",
                lineHeight: 1.8,
                maxWidth: 520,
                marginBottom: 48,
              }}
            >
              Precision centering analysis, real-time market intelligence, and
              complete portfolio management — built for collectors who treat
              Pokémon TCG as a serious financial asset.
            </p>
            <div
              className='animate-fade-up delay-500'
              style={{ display: "flex", gap: 16 }}
            >
              <Link href='#pricing' className='btn-primary'>
                See pricing
              </Link>
              <Link
                href='/login'
                className='btn-secondary'
                style={{ padding: "16px 40px", fontSize: 15 }}
              >
                Sign in
              </Link>
            </div>
          </div>
          <div
            className='animate-fade-in delay-600'
            style={{
              position: "absolute",
              right: 24,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              width: 220,
            }}
          >
            {[
              {
                label: "Portfolio value",
                value: "$48,240",
                sub: "+$3,120 this month",
                up: true,
              },
              {
                label: "TruePoint Score",
                value: "94.2",
                sub: "Charizard ex SIR Front",
                neutral: true,
              },
              {
                label: "Regrade ROI",
                value: "+$840",
                sub: "PSA 8 → CGC 9.5",
                up: true,
              },
              {
                label: "Sealed inventory",
                value: "12 items",
                sub: "$6,800 market value",
                neutral: true,
              },
            ].map((card, i) => (
              <div
                key={i}
                className='stat-card'
                style={{
                  opacity: 0,
                  animation: `fadeUp 0.6s ease ${0.7 + i * 0.1}s forwards`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim)",
                    letterSpacing: "0.06em",
                    marginBottom: 8,
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {card.label.toUpperCase()}
                </div>
                <div
                  className='font-mono'
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    color: card.up
                      ? "var(--gold-light)"
                      : card.neutral
                        ? "var(--text-primary)"
                        : "var(--red)",
                    marginBottom: 4,
                  }}
                >
                  {card.value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: card.up ? "var(--green)" : "var(--text-dim)",
                  }}
                >
                  {card.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Metrics ─────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
          }}
        >
          {METRICS.map((m, i) => (
            <div
              key={i}
              style={{
                padding: "32px 24px",
                borderRight: i < 3 ? "1px solid var(--border)" : "none",
                textAlign: "center",
              }}
            >
              <div
                className='font-display'
                style={{
                  fontSize: 36,
                  color: "var(--gold)",
                  letterSpacing: "0.04em",
                }}
              >
                {m.value}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  letterSpacing: "0.06em",
                  marginTop: 4,
                }}
              >
                {m.label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section
        id='features'
        style={{ padding: "120px 24px", maxWidth: 1200, margin: "0 auto" }}
      >
        <div style={{ marginBottom: 72 }}>
          <div
            className='font-mono'
            style={{
              fontSize: 11,
              color: "var(--gold)",
              letterSpacing: "0.12em",
              marginBottom: 16,
            }}
          >
            CORE FEATURES
          </div>
          <h2
            className='font-display'
            style={{
              fontSize: "clamp(36px, 5vw, 64px)",
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            FOUR PILLARS.
            <br />
            <span style={{ color: "var(--text-secondary)" }}>
              ONE PLATFORM.
            </span>
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className='card-hover'
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "48px",
                display: "grid",
                gridTemplateColumns: "1fr 2fr 1.2fr",
                gap: 48,
                alignItems: "start",
              }}
            >
              <div>
                <div
                  className='font-mono'
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim)",
                    marginBottom: 12,
                    letterSpacing: "0.08em",
                  }}
                >
                  {f.number}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--gold)",
                    letterSpacing: "0.1em",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {f.label.toUpperCase()}
                </div>
              </div>
              <div>
                <h3
                  className='font-display'
                  style={{
                    fontSize: 32,
                    letterSpacing: "0.04em",
                    marginBottom: 16,
                  }}
                >
                  {f.title.toUpperCase()}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text-secondary)",
                    lineHeight: 1.8,
                  }}
                >
                  {f.description}
                </p>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                {f.stats.map((s, j) => (
                  <div
                    key={j}
                    style={{
                      borderLeft: "2px solid var(--border)",
                      paddingLeft: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-dim)",
                        marginBottom: 4,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {s.label.toUpperCase()}
                    </div>
                    <div
                      className='font-mono'
                      style={{ fontSize: 13, color: "var(--gold-light)" }}
                    >
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Collection Types ─────────────────────────────────────── */}
      <section
        id='collection'
        style={{
          borderTop: "1px solid var(--border)",
          padding: "120px 24px",
          background: "var(--surface)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 64 }}>
            <div
              className='font-mono'
              style={{
                fontSize: 11,
                color: "var(--gold)",
                letterSpacing: "0.12em",
                marginBottom: 16,
              }}
            >
              COLLECTION TRACKING
            </div>
            <h2
              className='font-display'
              style={{
                fontSize: "clamp(36px, 5vw, 64px)",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              EVERY CARD.
              <br />
              <span style={{ color: "var(--text-secondary)" }}>
                EVERY FORMAT.
              </span>
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "var(--text-secondary)",
                maxWidth: 560,
                marginTop: 20,
                lineHeight: 1.8,
              }}
            >
              Whether you collect sealed boxes for investment, pull raw singles
              to grade, or track a binder full of slabs — TruePoint handles all
              three in one unified inventory.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {COLLECTION_TYPES.map((ct, i) => (
              <div
                key={i}
                className='card-hover'
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "36px",
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    color: "var(--gold)",
                    marginBottom: 16,
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {ct.icon}
                </div>
                <h3
                  className='font-display'
                  style={{
                    fontSize: 22,
                    letterSpacing: "0.04em",
                    marginBottom: 12,
                  }}
                >
                  {ct.title.toUpperCase()}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.8,
                    marginBottom: 20,
                  }}
                >
                  {ct.description}
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {ct.items.map((item, j) => (
                    <div
                      key={j}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          background: "var(--gold-dim)",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{ fontSize: 12, color: "var(--text-secondary)" }}
                      >
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section
        style={{ borderTop: "1px solid var(--border)", padding: "120px 24px" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 64 }}>
            <div
              className='font-mono'
              style={{
                fontSize: 11,
                color: "var(--gold)",
                letterSpacing: "0.12em",
                marginBottom: 16,
              }}
            >
              WORKFLOW
            </div>
            <h2
              className='font-display'
              style={{
                fontSize: "clamp(36px, 5vw, 64px)",
                letterSpacing: "0.04em",
              }}
            >
              SCAN. ANALYZE. DECIDE.
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 1,
              background: "var(--border)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {[
              {
                step: "01",
                title: "Scan your card",
                body: "Upload a front and back scan at 1600 DPI. Our image viewer renders it at full resolution.",
              },
              {
                step: "02",
                title: "Place border lines",
                body: "Drag four outer and four inner lines onto the card edges. Takes under 30 seconds.",
              },
              {
                step: "03",
                title: "Get your TruePoint Score",
                body: "Instant centering percentages and grade predictions for PSA, BGS, CGC, and TAG.",
              },
              {
                step: "04",
                title: "Make the call",
                body: "Check regrade arbitrage against live market data. Submit, hold, or sell.",
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{ background: "var(--surface)", padding: "40px 32px" }}
              >
                <div
                  className='font-mono'
                  style={{
                    fontSize: 32,
                    color: "var(--border)",
                    marginBottom: 24,
                    fontWeight: 500,
                  }}
                >
                  {s.step}
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>
                  {s.title}
                </h4>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                  }}
                >
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section
        id='pricing'
        style={{
          borderTop: "1px solid var(--border)",
          padding: "120px 24px",
          background: "var(--surface)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 64, textAlign: "center" }}>
            <div
              className='font-mono'
              style={{
                fontSize: 11,
                color: "var(--gold)",
                letterSpacing: "0.12em",
                marginBottom: 16,
              }}
            >
              PRICING
            </div>
            <h2
              className='font-display'
              style={{
                fontSize: "clamp(36px, 5vw, 64px)",
                letterSpacing: "0.04em",
              }}
            >
              START FREE.
              <br />
              <span style={{ color: "var(--text-secondary)" }}>
                SCALE AS YOU GROW.
              </span>
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "var(--text-secondary)",
                marginTop: 20,
              }}
            >
              14-day free trial of Pro included. No credit card required for
              Starter.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {PLANS.map((plan, i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface-2)",
                  border: `1px solid ${plan.featured ? "var(--gold)" : "var(--border)"}`,
                  borderRadius: 12,
                  padding: "40px",
                  position: "relative",
                }}
              >
                {plan.featured && (
                  <div
                    style={{
                      position: "absolute",
                      top: -1,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "var(--gold)",
                      color: "#0D0E11",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      padding: "4px 16px",
                      borderRadius: "0 0 8px 8px",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    MOST POPULAR
                  </div>
                )}
                <div
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    padding: "3px 10px",
                    borderRadius: 20,
                    marginBottom: 16,
                    fontFamily: "DM Mono, monospace",
                    letterSpacing: "0.06em",
                    background: `${plan.badgeColor}22`,
                    color: plan.badgeColor,
                    border: `1px solid ${plan.badgeColor}44`,
                  }}
                >
                  {plan.badge}
                </div>
                <div
                  className='font-display'
                  style={{
                    fontSize: 24,
                    letterSpacing: "0.04em",
                    marginBottom: 4,
                  }}
                >
                  {plan.name.toUpperCase()}
                </div>
                <div
                  className='font-mono'
                  style={{
                    fontSize: 36,
                    fontWeight: 500,
                    color: plan.featured
                      ? "var(--gold)"
                      : "var(--text-primary)",
                    marginBottom: 4,
                  }}
                >
                  {plan.price}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-dim)",
                    marginBottom: 28,
                  }}
                >
                  {plan.cadence}
                </div>
                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    marginBottom: 32,
                  }}
                >
                  {plan.features.map((f, j) => (
                    <div
                      key={j}
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: f.included
                            ? plan.featured
                              ? "rgba(201,168,76,0.2)"
                              : "rgba(61,170,110,0.2)"
                            : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {f.included ? (
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: plan.featured
                                ? "var(--gold)"
                                : "var(--green)",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 8,
                              height: 1,
                              background: "var(--text-dim)",
                            }}
                          />
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          color: f.included
                            ? "var(--text-primary)"
                            : "var(--text-dim)",
                        }}
                      >
                        {f.text}
                      </span>
                      {f.note && (
                        <span
                          className='font-mono'
                          style={{
                            fontSize: 10,
                            color: "var(--text-dim)",
                            marginLeft: "auto",
                          }}
                        >
                          {f.note}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <Link
                  href={`/register?plan=${plan.name.toLowerCase()}`}
                  className={plan.featured ? "btn-primary" : "btn-secondary"}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "14px",
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roadmap ──────────────────────────────────────────────── */}
      <section
        id='roadmap'
        style={{ borderTop: "1px solid var(--border)", padding: "120px 24px" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 64 }}>
            <div
              className='font-mono'
              style={{
                fontSize: 11,
                color: "var(--gold)",
                letterSpacing: "0.12em",
                marginBottom: 16,
              }}
            >
              ROADMAP
            </div>
            <h2
              className='font-display'
              style={{
                fontSize: "clamp(36px, 5vw, 64px)",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              WHERE WE&apos;RE
              <br />
              <span style={{ color: "var(--text-secondary)" }}>HEADED.</span>
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
            }}
          >
            {ROADMAP.map((q, i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "32px",
                  borderTop: `3px solid ${q.color}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 20,
                  }}
                >
                  <div
                    className='font-display'
                    style={{ fontSize: 18, letterSpacing: "0.06em" }}
                  >
                    {q.quarter}
                  </div>
                  <div
                    className='font-mono'
                    style={{
                      fontSize: 10,
                      color: q.color,
                      letterSpacing: "0.08em",
                      background: `${q.color}22`,
                      padding: "3px 8px",
                      borderRadius: 20,
                    }}
                  >
                    {q.status}
                  </div>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {q.items.map((item, j) => (
                    <div
                      key={j}
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: q.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          color:
                            q.status === "NOW"
                              ? "var(--text-primary)"
                              : "var(--text-secondary)",
                        }}
                      >
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── News ─────────────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--border)",
          padding: "120px 24px",
          background: "var(--surface)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 64 }}>
            <div
              className='font-mono'
              style={{
                fontSize: 11,
                color: "var(--gold)",
                letterSpacing: "0.12em",
                marginBottom: 16,
              }}
            >
              LATEST
            </div>
            <h2
              className='font-display'
              style={{
                fontSize: "clamp(36px, 5vw, 64px)",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              UPDATES &<br />
              <span style={{ color: "var(--text-secondary)" }}>NEWS.</span>
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 16,
            }}
          >
            {NEWS_ITEMS.map((item, i) => (
              <div
                key={i}
                className='card-hover'
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "32px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div
                    className='font-mono'
                    style={{
                      fontSize: 10,
                      color: item.type.includes("TRUEPOINT")
                        ? "var(--gold)"
                        : "var(--text-secondary)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {item.type}
                  </div>
                  <div
                    className='font-mono'
                    style={{ fontSize: 10, color: "var(--text-dim)" }}
                  >
                    {item.date}
                  </div>
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    marginBottom: 12,
                    color: "var(--text-primary)",
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    marginBottom: 16,
                  }}
                >
                  {item.body}
                </p>
                <div
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: "var(--surface-3)",
                    color: "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                    letterSpacing: "0.06em",
                  }}
                >
                  {item.tag}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "120px 24px",
          maxWidth: 1200,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div
          className='font-mono'
          style={{
            fontSize: 11,
            color: "var(--gold)",
            letterSpacing: "0.12em",
            marginBottom: 24,
          }}
        >
          GET STARTED
        </div>
        <h2
          className='font-display'
          style={{
            fontSize: "clamp(40px, 6vw, 80px)",
            letterSpacing: "0.04em",
            marginBottom: 24,
            lineHeight: 1,
          }}
        >
          YOUR COLLECTION.
          <br />
          <span className='gold-shimmer'>PROFESSIONALLY MANAGED.</span>
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "var(--text-secondary)",
            maxWidth: 480,
            margin: "0 auto 48px",
            lineHeight: 1.8,
          }}
        >
          Join collectors who make data-driven decisions. Free to start — no
          credit card required.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <Link
            href='/register'
            className='btn-primary'
            style={{ padding: "16px 40px", fontSize: 15 }}
          >
            Create free account
          </Link>
          <Link
            href='/login'
            className='btn-secondary'
            style={{ padding: "16px 40px", fontSize: 15 }}
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "40px 24px",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                background: "var(--gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  color: "#0D0E11",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "DM Mono, monospace",
                }}
              >
                TP
              </span>
            </div>
            <span
              className='font-display'
              style={{ fontSize: 16, letterSpacing: "0.08em" }}
            >
              TRUEPOINT TCG
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
            © 2026 TruePoint TCG. All rights reserved.
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["Privacy", "Terms", "Contact"].map((link) => (
              <a
                key={link}
                href='#'
                style={{
                  fontSize: 12,
                  color: "var(--text-dim)",
                  textDecoration: "none",
                }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
