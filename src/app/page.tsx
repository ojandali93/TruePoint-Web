"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase";
import { ROUTES } from "../constants/routes";
import { useEffect, useState } from "react";

// TODO: confirm this is a monitored inbox (Play Console showed contact@truepointtcg.com).
const SUPPORT_EMAIL = "support@truepointtcg.com";

const TICKER_ITEMS = [
  // Vintage chase cards
  {
    name: "Charizard Base Shadowless",
    grade: "PSA 10",
    price: "$48,500",
    change: "+2.8%",
    up: true,
  },
  {
    name: "Pikachu Illustrator",
    grade: "PSA 9",
    price: "$1,275,000",
    change: "+8.4%",
    up: true,
  },
  {
    name: "Lugia 1st Edition Neo",
    grade: "PSA 9",
    price: "$5,200",
    change: "+3.1%",
    up: true,
  },
  {
    name: "Rayquaza Gold Star",
    grade: "PSA 9",
    price: "$3,800",
    change: "+5.6%",
    up: true,
  },

  // Modern chase cards
  {
    name: "Charizard ex SIR 151",
    grade: "PSA 10",
    price: "$1,940",
    change: "-3.2%",
    up: false,
  },
  {
    name: "Moonbreon Alt Art",
    grade: "PSA 10",
    price: "$920",
    change: "+1.8%",
    up: true,
  },
  {
    name: "Giratina V Alt Art",
    grade: "PSA 10",
    price: "$680",
    change: "+4.2%",
    up: true,
  },
  {
    name: "Lugia V Alt Art",
    grade: "PSA 10",
    price: "$520",
    change: "-1.4%",
    up: false,
  },

  // 2026 releases — fresh activity
  {
    name: "Pikachu ex SIR Ascended",
    grade: "PSA 10",
    price: "$2,750",
    change: "+12.6%",
    up: true,
  },
  {
    name: "Mewtwo ex SIR 151",
    grade: "PSA 10",
    price: "$840",
    change: "-2.1%",
    up: false,
  },
  {
    name: "Eevee ex SIR Prismatic",
    grade: "PSA 10",
    price: "$760",
    change: "+6.7%",
    up: true,
  },

  // Investment-grade trophy
  {
    name: "Tropical Mega Battle 1999",
    grade: "PSA 8",
    price: "$58,400",
    change: "+1.9%",
    up: true,
  },

  // ── Duplicate set for ticker loop (do not remove — required for seamless scroll) ──
  {
    name: "Charizard Base Shadowless",
    grade: "PSA 10",
    price: "$48,500",
    change: "+2.8%",
    up: true,
  },
  {
    name: "Pikachu Illustrator",
    grade: "PSA 9",
    price: "$1,275,000",
    change: "+8.4%",
    up: true,
  },
  {
    name: "Lugia 1st Edition Neo",
    grade: "PSA 9",
    price: "$5,200",
    change: "+3.1%",
    up: true,
  },
  {
    name: "Rayquaza Gold Star",
    grade: "PSA 9",
    price: "$3,800",
    change: "+5.6%",
    up: true,
  },
  {
    name: "Charizard ex SIR 151",
    grade: "PSA 10",
    price: "$1,940",
    change: "-3.2%",
    up: false,
  },
  {
    name: "Moonbreon Alt Art",
    grade: "PSA 10",
    price: "$920",
    change: "+1.8%",
    up: true,
  },
  {
    name: "Giratina V Alt Art",
    grade: "PSA 10",
    price: "$680",
    change: "+4.2%",
    up: true,
  },
  {
    name: "Lugia V Alt Art",
    grade: "PSA 10",
    price: "$520",
    change: "-1.4%",
    up: false,
  },
  {
    name: "Pikachu ex SIR Ascended",
    grade: "PSA 10",
    price: "$2,750",
    change: "+12.6%",
    up: true,
  },
  {
    name: "Mewtwo ex SIR 151",
    grade: "PSA 10",
    price: "$840",
    change: "-2.1%",
    up: false,
  },
  {
    name: "Eevee ex SIR Prismatic",
    grade: "PSA 10",
    price: "$760",
    change: "+6.7%",
    up: true,
  },
  {
    name: "Tropical Mega Battle 1999",
    grade: "PSA 8",
    price: "$58,400",
    change: "+1.9%",
    up: true,
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

// Feature timeline. TODO: drop your 8 images into /public/app/ (filenames below,
// or rename the `src` values). Order = top → bottom of the timeline; rows alternate
// text/image sides automatically.
const FEATURE_TIMELINE = [
  {
    num: "01",
    title: "Live Portfolio Tracking",
    desc: "Watch the total value of everything you own move in real time — raw singles, graded slabs, and sealed product in one number, with daily history and gain/loss at a glance.",
    src: "portfolio.png",
    alt: "TruePoint portfolio value dashboard",
  },
  {
    num: "02",
    title: "AI Grade Predictions",
    desc: "Photograph a raw card and get a predicted grade across PSA, BGS, CGC, and TAG — with a confidence score and a clear “worth grading?” call before you spend a cent.",
    src: "ai-grading.png",
    alt: "AI grade prediction report",
  },
  {
    num: "03",
    title: "Detailed Centering Reports",
    desc: "Auto-detect borders or place them yourself, then get a weighted centering score on front and back — the same measurement graders use, in your hands first.",
    src: "centering.png",
    alt: "Detailed centering analysis tool",
  },
  {
    num: "04",
    title: "Your Entire Collection",
    desc: "Raw, graded, and sealed — tracked together in one inventory with condition, quantity, cost basis, and live market value on every item.",
    src: "collection.png",
    alt: "Full collection inventory",
  },
  {
    num: "05",
    title: "Grading Submission Tracking",
    desc: "Build a submission, see grading cost and total declared value up front, and follow every card from drop-off to slab — across every grading company.",
    src: "grading.png",
    alt: "Grading submission tracker",
  },
  {
    num: "06",
    title: "Trade Calculator",
    desc: "Stack both sides of a deal and see the value difference instantly — so you know whether a trade is in your favor before you shake on it.",
    src: "grading-arbitrage.png",
    alt: "Trade value calculator",
  },
  {
    num: "07",
    title: "Master Set Tracker",
    desc: "Chase completion across every variant with live progress — know exactly what you own and what you still need, set by set.",
    src: "master-setting.png",
    alt: "Master set completion tracker",
  },
  {
    num: "08",
    title: "Set Browser",
    desc: "Browse any set card by card, tap to toggle what you own, and see live price ranges on every card as you go.",
    src: "master-sets.png",
    alt: "Set browser with owned toggles",
  },
];

// TODO: attribute every quote to a REAL user (name + permission) before publishing.
// Fabricated named testimonials on a paid app violate FTC + App/Play policy.
// The quote copy is written to convert an on-the-fence visitor — keep it, swap the names.
const TESTIMONIALS = [
  {
    quote:
      "I was about to send a $400 Charizard to PSA. TruePoint flagged a soft corner I couldn't even see and called a 9. Saved me the fee and the heartbreak.",
    name: "Marcus R.", // TODO: real name + permission
    role: "Vintage collector",
  },
  {
    quote:
      "The arbitrage tool paid for a full year of the app in one trade. It showed me a raw card was worth $300 more graded after fees — math I'd never have run myself.",
    name: "Devin T.", // TODO: real name + permission
    role: "PSA submitter",
  },
  {
    quote:
      "Six years of spreadsheets, gone. I rebuilt my entire collection in TruePoint in an afternoon and haven't opened Excel since.",
    name: "Priya N.", // TODO: real name + permission
    role: "Modern collector",
  },
  {
    quote:
      "At a show last weekend I pulled up the trade calculator mid-deal and caught that I was about to give up $150 in value. Renegotiated on the spot.",
    name: "Jordan K.", // TODO: real name + permission
    role: "Show regular",
  },
  {
    quote:
      "The centering tool matches what graders actually do. My last three PSA submissions came back within half a grade of what TruePoint predicted.",
    name: "Alex M.", // TODO: real name + permission
    role: "Grader",
  },
  {
    quote:
      "Finally an app built by someone who actually collects. Every screen answers a question I've genuinely had standing at a card counter.",
    name: "Sam D.", // TODO: real name + permission
    role: "Master set chaser",
  },
];

const NEWS_ITEMS = [
  {
    type: "TRUEPOINT UPDATE",
    date: "June 2026",
    title: "TruePoint is live on iOS and Android",
    body: "TruePoint TCG is now available on the App Store and Google Play. Track your portfolio, predict grades, and run the grading math from your phone.",
    tag: "Launch",
  },
  {
    type: "EVENTS",
    date: "June 2026",
    title: "Find us at the LA Card Expo · June 22–24",
    body: "The TruePoint team will be at the LA Card Expo. Come see live grade predictions, talk shop, and get a first look at what we're building next.",
    tag: "Event",
  },
  {
    type: "TRUEPOINT UPDATE",
    date: "June 2026",
    title: "AI grade predictions across PSA, BGS, CGC & TAG",
    body: "Photograph a raw card and get a predicted grade with centering, corners, edges, and surface sub-scores — before you spend a cent submitting.",
    tag: "Product",
  },
  {
    // TODO: replace with a CURRENT, VERIFIED Pokémon TCG headline before publishing.
    type: "POKEMON NEWS",
    date: "TODO",
    title: "TODO — add a current TCG industry headline",
    body: "TODO — replace with a real, sourced update from the Pokémon TCG world.",
    tag: "TCG News",
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
      { text: "AI grading reports", included: false },
      { text: "Inventory tracking", included: false },
      { text: "Submission tracking", included: false },
      { text: "Portfolio dashboard", included: false },
    ],
  },
  {
    name: "Collector",
    price: "$14.99",
    cadence: "per month",
    badge: "MOST POPULAR",
    badgeColor: "#C9A84C",
    featured: true,
    cta: "Start Collector plan",
    features: [
      { text: "Everything in Starter", included: true },
      { text: "AI grading reports", included: true, note: "100/mo" },
      { text: "Submission tracking", included: true, note: "4/mo" },
      { text: "Regrade arbitrage", included: true, note: "50/mo" },
      { text: "Master set tracker", included: true, note: "unlimited" },
      { text: "Singles & graded inventory", included: true },
      { text: "Price alerts", included: true, note: "10 cards" },
      { text: "Full portfolio dashboard", included: false },
      { text: "Sealed collection tracking", included: false },
      { text: "Pack opening analytics", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$29.99",
    cadence: "per month",
    badge: "PRO",
    badgeColor: "#BA7517",
    featured: false,
    cta: "Start Pro plan",
    features: [
      { text: "Everything in Collector", included: true },
      { text: "AI grading reports", included: true, note: "unlimited" },
      { text: "Submission tracking", included: true, note: "unlimited" },
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

// ── Contact form (mailto-based; no backend needed to ship) ─────────────────
function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    // TODO (optional): POST to your Render backend for real tickets instead of mailto.
    const subject = encodeURIComponent(
      `TruePoint support — ${name || "inquiry"}`,
    );
    const body = encodeURIComponent(`${message}\n\n— ${name}\n${email}`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "12px 14px",
    color: "var(--text-primary)",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        className='landing-2col-grid'
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
      >
        <input
          style={inputStyle}
          placeholder='Your name'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder='Your email'
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <textarea
        style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
        placeholder='How can we help?'
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button
        type='button'
        onClick={handleSubmit}
        className='btn-primary'
        style={{
          alignSelf: "flex-start",
          padding: "14px 32px",
          fontSize: 14,
          border: "none",
          cursor: "pointer",
        }}
      >
        Send message
      </button>
    </div>
  );
}

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
          <div
            className='landing-nav-right'
            style={{ display: "flex", gap: 28, alignItems: "center" }}
          >
            {["Features", "App", "Pricing", "Testimonials", "Roadmap"].map(
              (l) => (
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
              ),
            )}
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
                LIVE ON iOS &amp; ANDROID · 18,000+ CARDS INDEXED
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
              className='animate-fade-up delay-500 landing-hero-btns'
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

            {/* ── App availability (App Store + Google Play) ─────────────
                Apple badge = Apple's official distributed SVG artwork.
                Google badge = matched SVG (recreated to fit this design).
                TODO: for full brand compliance you can later swap the Google
                badge for the official "Get it on Google Play" asset from
                https://play.google.com/intl/en_us/badges/
            ──────────────────────────────────────────────────────────── */}
            <div
              className='animate-fade-up delay-600'
              style={{
                marginTop: 32,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-dim)",
                  letterSpacing: "0.12em",
                  fontFamily: "DM Mono, monospace",
                  textTransform: "uppercase",
                }}
              >
                Download the App
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                {/* Official "Download on the App Store" badge (Apple artwork). */}
                <a
                  href='https://apps.apple.com/us/app/truepoint-tcg/id6767379465'
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='Download TruePoint TCG on the App Store'
                  style={{
                    display: "inline-block",
                    lineHeight: 0,
                    transition: "transform 0.15s ease, opacity 0.15s ease",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.opacity = "0.92";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 119.66407 40'
                    aria-label='Download on the App Store'
                    role='img'
                    style={{
                      height: 40,
                      width: "auto",
                      userSelect: "none",
                    }}
                  >
                    <title>Download on the App Store</title>
                    <path
                      d='M110.135 0H9.535c-.367 0-.73 0-1.095.002-.306.002-.61.008-.919.013-.67.008-1.339.067-2.001.176a6.66 6.66 0 0 0-1.901.627A6.438 6.438 0 0 0 .627 4.336a6.65 6.65 0 0 0-.625 1.903 13.077 13.077 0 0 0-.178 2C.013 8.547.012 8.852.002 9.158V30.844c.01.31.011.61.022.92.008.668.067 1.336.178 1.998a6.643 6.643 0 0 0 .625 1.905A6.227 6.227 0 0 0 3.618 38.42a6.51 6.51 0 0 0 1.9.631c.663.108 1.332.166 2.002.175.31.007.613.011.919.011.366.002.728.002 1.095.002h100.6c.36 0 .725 0 1.084-.002.305 0 .617-.004.922-.011a13.65 13.65 0 0 0 2-.175 6.658 6.658 0 0 0 1.908-.631c.572-.295 1.094-.68 1.547-1.139a6.42 6.42 0 0 0 1.144-1.547 6.659 6.659 0 0 0 .619-1.905c.111-.662.173-1.33.186-2 .004-.31.004-.61.004-.92.008-.364.008-.725.008-1.094V10.253c0-.366 0-.73-.008-1.092 0-.306 0-.611-.004-.917a13.4 13.4 0 0 0-.186-2 6.624 6.624 0 0 0-.619-1.903 6.466 6.466 0 0 0-2.691-2.69 6.65 6.65 0 0 0-1.908-.626 13.392 13.392 0 0 0-2-.176c-.305-.005-.617-.011-.922-.013-.359-.002-.724-.002-1.084-.002z'
                      fill='#a6a6a6'
                    />
                    <path d='M8.445 39.125c-.305 0-.6-.004-.91-.011a12.737 12.737 0 0 1-1.866-.163 5.884 5.884 0 0 1-1.656-.548 5.406 5.406 0 0 1-1.397-1.016 5.32 5.32 0 0 1-1.02-1.397 5.722 5.722 0 0 1-.544-1.657 12.41 12.41 0 0 1-.166-1.875c-.007-.21-.015-.913-.015-.913V8.444s.009-.692.015-.895c.007-.624.062-1.247.165-1.872a5.756 5.756 0 0 1 .544-1.662c.26-.519.6-.992 1.015-1.398a5.565 5.565 0 0 1 1.402-1.023 5.823 5.823 0 0 1 1.653-.544A12.642 12.642 0 0 1 7.537.887l.908-.012h102.769l.92.013a12.4 12.4 0 0 1 1.85.162 5.94 5.94 0 0 1 1.671.548 5.59 5.59 0 0 1 2.415 2.42c.261.521.44 1.078.531 1.649.105.629.163 1.265.175 1.902.003.285.003.59.003.895.008.377.008.736.008 1.097v19.494c0 .365 0 .722-.008 1.081 0 .327 0 .626-.004.933a13.097 13.097 0 0 1-.172 1.869 5.738 5.738 0 0 1-.541 1.67 5.482 5.482 0 0 1-1.016 1.387 5.413 5.413 0 0 1-1.4 1.022 5.862 5.862 0 0 1-1.668.55 12.598 12.598 0 0 1-1.866.163c-.296.007-.6.011-.897.011l-1.083.002L8.445 39.125z' />
                    <path
                      d='M24.769 20.301a4.949 4.949 0 0 1 2.356-4.151 5.066 5.066 0 0 0-3.99-2.158c-1.68-.176-3.308 1.005-4.164 1.005-.872 0-2.19-.988-3.608-.958a5.315 5.315 0 0 0-4.473 2.728c-1.934 3.348-.491 8.269 1.361 10.976.927 1.325 2.011 2.805 3.428 2.753 1.387-.058 1.905-.885 3.58-.885 1.659 0 2.145.885 3.591.852 1.488-.025 2.426-1.332 3.321-2.67a10.962 10.962 0 0 0 1.52-3.092 4.782 4.782 0 0 1-2.921-4.4zM22.037 12.211a4.872 4.872 0 0 0 1.115-3.49 4.957 4.957 0 0 0-3.208 1.66 4.636 4.636 0 0 0-1.144 3.36 4.1 4.1 0 0 0 3.237-1.53z'
                      fill='#fff'
                    />
                    <path
                      d='M42.302 27.14h-4.733l-1.137 3.356h-2.005l4.483-12.418h2.083l4.483 12.418h-2.039l-1.135-3.356zm-4.243-1.55h3.752l-1.85-5.446h-.051l-1.851 5.446zM55.16 25.97c0 2.813-1.506 4.62-3.779 4.62a3.07 3.07 0 0 1-2.849-1.583h-.043v4.484h-1.858V21.442h1.799v1.506h.034a3.212 3.212 0 0 1 2.883-1.6c2.298 0 3.813 1.816 3.813 4.622zm-1.91 0c0-1.833-.948-3.038-2.393-3.038-1.42 0-2.375 1.23-2.375 3.038 0 1.824.955 3.046 2.375 3.046 1.445 0 2.393-1.197 2.393-3.046zM65.125 25.97c0 2.813-1.506 4.62-3.779 4.62a3.07 3.07 0 0 1-2.849-1.583h-.043v4.484h-1.858V21.442h1.799v1.506h.034a3.212 3.212 0 0 1 2.883-1.6c2.298 0 3.813 1.816 3.813 4.622zm-1.91 0c0-1.833-.948-3.038-2.393-3.038-1.42 0-2.375 1.23-2.375 3.038 0 1.824.955 3.046 2.375 3.046 1.445 0 2.393-1.197 2.393-3.046zM71.71 27.036c.138 1.232 1.334 2.04 2.969 2.04 1.566 0 2.693-.808 2.693-1.919 0-.964-.68-1.541-2.29-1.937l-1.609-.388c-2.28-.551-3.339-1.617-3.339-3.348 0-2.143 1.867-3.614 4.519-3.614 2.624 0 4.423 1.472 4.483 3.614h-1.876c-.112-1.239-1.137-1.987-2.634-1.987s-2.521.757-2.521 1.858c0 .878.654 1.395 2.255 1.79l1.368.336c2.548.603 3.606 1.626 3.606 3.443 0 2.323-1.85 3.778-4.793 3.778-2.754 0-4.614-1.421-4.733-3.667l1.901.001zm11.581-7.731v2.143h1.722v1.472h-1.722v4.991c0 .776.345 1.137 1.102 1.137.204-.003.408-.018.611-.043v1.463c-.34.063-.687.092-1.033.085-1.833 0-2.548-.689-2.548-2.444v-5.189h-1.317v-1.472h1.317v-2.143h1.868zM86.065 25.97c0-2.85 1.678-4.639 4.294-4.639 2.625 0 4.295 1.79 4.295 4.639 0 2.857-1.661 4.639-4.295 4.639-2.633 0-4.294-1.782-4.294-4.639zm6.695 0c0-1.954-.896-3.108-2.401-3.108s-2.4 1.162-2.4 3.108c0 1.962.895 3.107 2.4 3.107s2.401-1.145 2.401-3.107zM96.186 21.442h1.773v1.541h.043a2.16 2.16 0 0 1 2.177-1.636c.214-.001.428.022.637.069v1.738a2.598 2.598 0 0 0-.835-.112 1.873 1.873 0 0 0-1.937 2.083v5.371h-1.858v-9.054zM109.384 27.837c-.25 1.643-1.85 2.772-3.898 2.772-2.634 0-4.269-1.764-4.269-4.596 0-2.841 1.644-4.682 4.19-4.682 2.505 0 4.08 1.72 4.08 4.466v.637h-6.394v.112a2.358 2.358 0 0 0 2.436 2.564 2.048 2.048 0 0 0 2.091-1.273h1.764zm-6.283-2.702h4.526a2.177 2.177 0 0 0-2.22-2.298 2.292 2.292 0 0 0-2.306 2.298zM37.826 8.731c1.85 0 2.935 1.137 2.935 3.093 0 1.985-1.076 3.13-2.935 3.13H35.572V8.732h2.254zm-1.285 5.347h1.181c1.31 0 2.064-.816 2.064-2.241 0-1.404-.766-2.228-2.064-2.228h-1.181v4.469zM41.808 12.61a2.221 2.221 0 1 1 4.422 0 2.221 2.221 0 1 1-4.422 0zm3.467 0c0-1.016-.456-1.61-1.256-1.61s-1.255.595-1.255 1.61c0 1.025.452 1.614 1.255 1.614s1.256-.594 1.256-1.613zM52.176 14.954h-.959l-.967-3.45h-.073l-.964 3.45h-.95l-1.29-4.682h.938l.838 3.573h.069l.962-3.573h.887l.962 3.573h.073l.834-3.573h.925l-1.285 4.683zM54.756 10.272h.892v.744h.069a1.405 1.405 0 0 1 1.401-.834 1.527 1.527 0 0 1 1.625 1.749v3.024h-.925v-2.792c0-.75-.327-1.124-1.008-1.124a1.072 1.072 0 0 0-1.117 1.183v2.732h-.925l-.012-4.683zM60.204 8.444h.925v6.51h-.925zM62.41 12.61a2.221 2.221 0 1 1 4.423 0 2.222 2.222 0 1 1-4.422 0zm3.467 0c0-1.016-.456-1.61-1.256-1.61s-1.255.595-1.255 1.61c0 1.025.452 1.614 1.255 1.614s1.256-.594 1.256-1.613zM67.811 13.629c0-.844.628-1.331 1.744-1.4l1.27-.074v-.405c0-.495-.327-.775-.96-.775-.516 0-.874.19-.977.521h-.895c.095-.806.853-1.323 1.914-1.323 1.173 0 1.835.584 1.835 1.576v3.205h-.891V14.3h-.073a1.578 1.578 0 0 1-1.41.736 1.417 1.417 0 0 1-1.566-1.404l.009-.003zm3.014-.401v-.392l-1.145.073c-.646.043-.939.262-.939.677 0 .422.366.668.87.668a1.106 1.106 0 0 0 1.214-1.026zM72.963 12.61c0-1.48.761-2.417 1.945-2.417a1.544 1.544 0 0 1 1.435.823h.069V8.443h.925v6.51h-.886v-.74h-.073a1.625 1.625 0 0 1-1.47.819c-1.193 0-1.945-.938-1.945-2.422zm.955 0c0 .993.468 1.59 1.251 1.59.779 0 1.26-.605 1.26-1.586 0-.976-.486-1.59-1.26-1.59-.778 0-1.251.602-1.251 1.586zM81.108 12.61a2.221 2.221 0 1 1 4.423 0 2.222 2.222 0 1 1-4.422 0zm3.467 0c0-1.016-.456-1.61-1.256-1.61s-1.255.595-1.255 1.61c0 1.025.452 1.614 1.255 1.614s1.256-.594 1.256-1.613zM86.772 10.272h.891v.744h.069a1.405 1.405 0 0 1 1.401-.834 1.527 1.527 0 0 1 1.625 1.749v3.024h-.925v-2.792c0-.75-.327-1.124-1.008-1.124a1.072 1.072 0 0 0-1.117 1.183v2.732h-.925l-.011-4.683zM95.198 9.107v1.187h1.014v.78h-1.014v2.404c0 .49.202.705.662.705.117 0 .235-.008.351-.022v.77c-.165.03-.332.045-.5.048-1.028 0-1.438-.362-1.438-1.265v-2.642h-.743v-.78h.743V9.107h.925zM97.475 8.444h.917v2.58h.073a1.444 1.444 0 0 1 1.431-.84 1.546 1.546 0 0 1 1.617 1.754v3.016h-.926v-2.787c0-.745-.348-1.124-.998-1.124a1.09 1.09 0 0 0-1.176 1.183v2.728h-.925l-.013-6.51zM106.836 13.69a1.901 1.901 0 0 1-2.029 1.355 2.127 2.127 0 0 1-2.164-2.418 2.16 2.16 0 0 1 2.16-2.448c1.303 0 2.089.89 2.089 2.361v.323h-3.307v.052a1.237 1.237 0 0 0 1.247 1.341 1.121 1.121 0 0 0 1.114-.568l.89.002zm-3.252-1.509h2.366a1.13 1.13 0 0 0-1.152-1.214 1.198 1.198 0 0 0-1.214 1.214z'
                      fill='#fff'
                    />
                  </svg>
                </a>

                {/* Official "Get it on Google Play" badge — live on Android. */}
                <a
                  href='https://play.google.com/store/apps/details?id=app.truepointinc.truepointtcg'
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='Download TruePoint TCG on Google Play'
                  style={{
                    display: "inline-block",
                    lineHeight: 0,
                    transition: "transform 0.15s ease, opacity 0.15s ease",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.opacity = "0.92";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 135 40'
                    aria-label='Get it on Google Play'
                    role='img'
                    style={{
                      height: 40,
                      width: "auto",
                      userSelect: "none",
                    }}
                  >
                    <title>Get it on Google Play</title>
                    <rect
                      x='0.5'
                      y='0.5'
                      width='134'
                      height='39'
                      rx='6'
                      fill='#000000'
                      stroke='#a6a6a6'
                      strokeWidth='1'
                    />
                    <polygon points='13,8 13,20 21,20' fill='#00A0FF' />
                    <polygon points='13,8 21,20 35,20' fill='#00D447' />
                    <polygon points='13,32 21,20 35,20' fill='#FFCE00' />
                    <polygon points='13,32 13,20 21,20' fill='#FF3D47' />
                    <text
                      x='44'
                      y='16'
                      fill='#ffffff'
                      fontFamily='Arial, Helvetica, sans-serif'
                      fontSize='6.5'
                      letterSpacing='0.8'
                    >
                      GET IT ON
                    </text>
                    <text
                      x='43'
                      y='32'
                      fill='#ffffff'
                      fontFamily='Arial, Helvetica, sans-serif'
                      fontSize='15'
                      fontWeight='600'
                      letterSpacing='0.2'
                    >
                      Google Play
                    </text>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div
            className='animate-fade-in delay-600 landing-hero-cards'
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

      {/* ── Trust strip ─────────────────────────────────────────── */}
      {/* TODO: confirm "11,000+" is defensible (signups across web + both apps + waitlist). */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "28px 24px",
          textAlign: "center",
        }}
      >
        <div
          className='font-mono'
          style={{
            fontSize: 16,
            color: "var(--text-secondary)",
            letterSpacing: "0.12em",
          }}
        >
          TRUSTED BY <span style={{ color: "var(--gold)" }}>4,500+</span>{" "}
          POKÉMON COLLECTORS WORLDWIDE
        </div>
      </div>

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
          className='landing-metrics-grid'
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
        className='landing-section'
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
              className='card-hover landing-feature-row'
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

      {/* ── App showcase (feature timeline) ──────────────────────── */}
      <section
        id='app'
        style={{
          borderTop: "1px solid var(--border)",
          padding: "120px 24px",
          background: "var(--surface)",
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          {/* Intro */}
          <div style={{ marginBottom: 88, textAlign: "center" }}>
            <div
              className='font-mono'
              style={{
                fontSize: 11,
                color: "var(--gold)",
                letterSpacing: "0.12em",
                marginBottom: 16,
              }}
            >
              WHY TRUEPOINT
            </div>
            <h2
              className='font-display'
              style={{
                fontSize: "clamp(36px, 5vw, 64px)",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              ONE PLATFORM.
              <br />
              <span style={{ color: "var(--text-secondary)" }}>
                CASUAL TO SERIOUS.
              </span>
            </h2>
            <p
              style={{
                fontSize: 15,
                color: "var(--text-secondary)",
                maxWidth: 600,
                margin: "20px auto 0",
                lineHeight: 1.8,
              }}
            >
              Most apps do one thing — scan, or track, or check a price.
              TruePoint is the all-in-one decision layer for collectors: whether
              you&apos;re fifty cards deep or managing a five-figure portfolio,
              every tool you need to decide what to grade, hold, trade, or chase
              lives in one place. Here&apos;s what that looks like.
            </p>
          </div>

          {/* Timeline */}
          <div className='feature-timeline' style={{ position: "relative" }}>
            {/* center line */}
            <div
              className='feature-timeline-line'
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: "50%",
                width: 2,
                transform: "translateX(-1px)",
                background: "var(--border)",
              }}
            />

            {FEATURE_TIMELINE.map((f, i) => {
              const isLeft = i % 2 === 0; // even rows: text left, image right
              return (
                <div
                  key={i}
                  className='feature-timeline-row'
                  style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    columnGap: 80,
                    alignItems: "center",
                    padding: "40px 0",
                  }}
                >
                  {/* dot */}
                  <div
                    className='feature-timeline-dot'
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "var(--gold)",
                      boxShadow: "0 0 0 6px rgba(201,168,76,0.15)",
                      zIndex: 2,
                    }}
                  />

                  {/* text */}
                  <div
                    className='feature-timeline-text'
                    style={{
                      gridColumn: isLeft ? 1 : 2,
                      gridRow: 1,
                      textAlign: isLeft ? "right" : "left",
                    }}
                  >
                    <div
                      className='font-mono'
                      style={{
                        fontSize: 11,
                        color: "var(--gold)",
                        letterSpacing: "0.12em",
                        marginBottom: 12,
                      }}
                    >
                      {f.num}
                    </div>
                    <h3
                      className='font-display'
                      style={{
                        fontSize: "clamp(24px, 3vw, 34px)",
                        letterSpacing: "0.04em",
                        lineHeight: 1.05,
                        marginBottom: 14,
                      }}
                    >
                      {f.title.toUpperCase()}
                    </h3>
                    <p
                      style={{
                        fontSize: 14,
                        color: "var(--text-secondary)",
                        lineHeight: 1.8,
                        maxWidth: 380,
                        marginLeft: isLeft ? "auto" : 0,
                      }}
                    >
                      {f.desc}
                    </p>
                  </div>

                  {/* media */}
                  <div
                    className='feature-timeline-media'
                    style={{
                      gridColumn: isLeft ? 2 : 1,
                      gridRow: 1,
                      display: "flex",
                      justifyContent: isLeft ? "flex-start" : "flex-end",
                    }}
                  >
                    <div
                      className='card-hover'
                      style={{
                        width: "100%",
                        maxWidth: 260,
                        borderRadius: 40,
                        overflow: "hidden",
                        border: "1px solid var(--border)",
                        background: "var(--surface-2)",
                        aspectRatio: "1190 / 2560",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.src}
                        alt={f.alt}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id='affiliate'
        style={{
          position: "relative",
          borderTop: "1px solid var(--border)",
          padding: "120px 24px",
          overflow: "hidden",
        }}
      >
        {/* gold glow */}
        <div
          style={{
            position: "absolute",
            top: "-10%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 900,
            height: 480,
            background:
              "radial-gradient(ellipse at center, rgba(201,168,76,0.10), transparent 70%)",
            pointerEvents: "none",
            filter: "blur(8px)",
          }}
        />
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div
              className='font-mono'
              style={{
                fontSize: 11,
                color: "var(--gold)",
                letterSpacing: "0.12em",
                marginBottom: 18,
              }}
            >
              AFFILIATE PROGRAM
            </div>
            <h2
              className='font-display'
              style={{
                fontSize: "clamp(36px, 5vw, 64px)",
                letterSpacing: "0.04em",
                lineHeight: 1.02,
              }}
            >
              GET PAID TO SHARE
              <br />
              <span className='gold-shimmer'>WHAT YOU ALREADY LOVE.</span>
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "var(--text-secondary)",
                lineHeight: 1.8,
                maxWidth: 600,
                margin: "22px auto 0",
              }}
            >
              You&apos;re already talking cards with your audience. Turn that
              into recurring income — and get the full Pro toolkit free while
              you do it. No fees to join, real payouts in dollars.
            </p>
          </div>

          {/* Benefits */}
          <div
            className='landing-4col-grid'
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
              marginBottom: 56,
            }}
          >
            {[
              {
                k: "5% / 7%",
                t: "Recurring commission",
                d: "Earn 5% on Collector and 7% on Pro — every month a member you referred stays subscribed.",
              },
              {
                k: "FREE",
                t: "Pro, on us",
                d: "Approved partners get a full Pro account at no cost — the exact tools you're recommending.",
              },
              {
                k: "PayPal",
                t: "Real payouts",
                d: "Paid monthly via PayPal once your balance hits $75. No points, no store credit — actual money.",
              },
              {
                k: "∞",
                t: "Keep earning",
                d: "Commission continues for as long as each member you bring in stays subscribed.",
              },
            ].map((b) => (
              <div
                key={b.t}
                className='card-hover'
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "28px 24px",
                  textAlign: "left",
                }}
              >
                <div
                  className='font-display'
                  style={{
                    fontSize: 30,
                    color: "var(--gold)",
                    letterSpacing: "0.02em",
                    marginBottom: 14,
                  }}
                >
                  {b.k}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 8,
                  }}
                >
                  {b.t}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                  }}
                >
                  {b.d}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center" }}>
            <Link
              href='/affiliates'
              className='btn-primary'
              style={{
                padding: "18px 48px",
                fontSize: 16,
                display: "inline-block",
              }}
            >
              Become an Affiliate
            </Link>
            <div
              style={{
                marginTop: 18,
                fontSize: 13,
                color: "var(--text-dim)",
              }}
            >
              Free to join · Takes 2 minutes ·{" "}
              <Link
                href='/affiliate-terms'
                target='_blank'
                style={{ color: "var(--gold)" }}
              >
                See the full terms →
              </Link>
            </div>
          </div>
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
            className='landing-3col-grid'
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
            className='landing-4col-grid'
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

      {/* ── Testimonials ─────────────────────────────────────────── */}
      <section
        id='testimonials'
        style={{ borderTop: "1px solid var(--border)", padding: "120px 24px" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 56, textAlign: "center" }}>
            <div
              className='font-mono'
              style={{
                fontSize: 11,
                color: "var(--gold)",
                letterSpacing: "0.12em",
                marginBottom: 16,
              }}
            >
              TESTIMONIALS
            </div>
            <h2
              className='font-display'
              style={{
                fontSize: "clamp(36px, 5vw, 64px)",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              COLLECTORS
              <br />
              <span style={{ color: "var(--text-secondary)" }}>
                RATE TRUEPOINT.
              </span>
            </h2>
          </div>

          <div
            className='landing-3col-grid'
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className='card-hover'
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "32px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                <div style={{ display: "flex", gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <span
                      key={s}
                      style={{ color: "var(--gold)", fontSize: 14 }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text-primary)",
                    lineHeight: 1.7,
                    flex: 1,
                  }}
                >
                  “{t.quote}”
                </p>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    className='font-mono'
                    style={{
                      fontSize: 11,
                      color: "var(--text-dim)",
                      marginTop: 2,
                    }}
                  >
                    {t.role.toUpperCase()}
                  </div>
                </div>
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
            className='landing-pricing-grid'
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

      {/* ── Affiliate program ────────────────────────────────────── */}

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
            className='landing-4col-grid'
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
            className='landing-2col-grid'
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
        <div
          className='landing-cta-btns'
          style={{ display: "flex", gap: 16, justifyContent: "center" }}
        >
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

      {/* ── Contact ─────────────────────────────────────────────── */}
      <section
        id='contact'
        style={{
          borderTop: "1px solid var(--border)",
          padding: "120px 24px",
          background: "var(--surface)",
        }}
      >
        <div
          className='landing-2col-grid'
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "start",
          }}
        >
          <div>
            <div
              className='font-mono'
              style={{
                fontSize: 11,
                color: "var(--gold)",
                letterSpacing: "0.12em",
                marginBottom: 16,
              }}
            >
              CONTACT
            </div>
            <h2
              className='font-display'
              style={{
                fontSize: "clamp(32px, 4vw, 52px)",
                letterSpacing: "0.04em",
                lineHeight: 1,
                marginBottom: 20,
              }}
            >
              TALK TO US.
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                lineHeight: 1.8,
                marginBottom: 16,
              }}
            >
              Questions, feedback, or a bug to report? Reach the team directly —
              we read everything.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className='font-mono'
              style={{
                fontSize: 13,
                color: "var(--gold)",
                textDecoration: "none",
              }}
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
          <ContactForm />
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
          className='landing-footer-inner'
          style={{
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
            <a
              href='#'
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                textDecoration: "none",
              }}
            >
              Privacy
            </a>
            <a
              href='#'
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                textDecoration: "none",
              }}
            >
              Terms
            </a>
            <a
              href='#contact'
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                textDecoration: "none",
              }}
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
