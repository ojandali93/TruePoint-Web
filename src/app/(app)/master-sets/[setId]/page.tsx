'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '../../../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Variant {
  variantType: string;
  label: string;
  color: string;
  haveCount: number;
}

interface MasterCard {
  cardId: string;
  name: string;
  number: string;
  rarity: string | null;
  imageSmall: string | null;
  imageLarge: string | null;
  marketPrice: number | null;
  variants: Variant[];
  totalVariants: number;
  ownedVariants: number;
  duplicates: number;
}

interface Progress {
  setId: string;
  setName: string;
  seriesName: string | null;
  logoUrl: string | null;
  symbolUrl: string | null;
  totalCards: number;
  totalVariants: number;
  ownedVariants: number;
  completionPct: number;
  needCount: number;
  dupeCount: number;
}

type ViewMode = 'grid' | 'table' | 'binder';
type FilterTab = 'all' | 'have' | 'need' | 'dupes';
type SortBy = 'number' | 'name' | 'rarity' | 'price';
type PocketSize = 9 | 12 | 4 | 16;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RARITY_ORDER: Record<string, number> = {
  'Common': 0, 'Uncommon': 1, 'Rare': 2, 'Rare Holo': 3,
  'Double Rare': 4, 'Ultra Rare': 5, 'Illustration Rare': 6,
  'Special Illustration Rare': 7, 'Hyper Rare': 8, 'Rare Secret': 8,
  'ACE SPEC Rare': 9,
};

const sortCards = (cards: MasterCard[], by: SortBy): MasterCard[] => {
  const c = [...cards];
  switch (by) {
    case 'number': return c.sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0));
    case 'name':   return c.sort((a, b) => a.name.localeCompare(b.name));
    case 'rarity': return c.sort((a, b) => (RARITY_ORDER[a.rarity ?? ''] ?? 3) - (RARITY_ORDER[b.rarity ?? ''] ?? 3));
    case 'price':  return c.sort((a, b) => (b.marketPrice ?? 0) - (a.marketPrice ?? 0));
    default:       return c;
  }
};

const filterCards = (cards: MasterCard[], tab: FilterTab, search: string) =>
  cards.filter((c) => {
    if (tab === 'have' && c.ownedVariants === 0) return false;
    if (tab === 'need' && c.ownedVariants >= c.totalVariants) return false;
    if (tab === 'dupes' && c.duplicates === 0) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.number.includes(q)) return false;
    }
    return true;
  });

// Expand cards for binder: when stackVariants=false, one slot per variant
// Variant display order within each card
const VARIANT_DISPLAY_ORDER: Record<string, number> = {
  normal:              0,
  unlimited:           0,
  reverseHolofoil:     1,
  holofoil:            2,
  '1stEdition':        3,
  '1stEditionHolofoil':4,
};

const expandForBinder = (cards: MasterCard[], stackVariants: boolean): { card: MasterCard; variant: Variant }[] => {
  // Always sort cards by number first
  const sorted = [...cards].sort((a, b) =>
    (parseInt(a.number) || 9999) - (parseInt(b.number) || 9999)
  );

  if (stackVariants) {
    // One slot per card — show the first (primary) variant
    return sorted.map((card) => ({ card, variant: card.variants[0] }));
  }

  // One slot per variant, interleaved by card number
  // Order: #1 Normal → #1 Reverse Holo → #2 Normal → #2 Reverse Holo → ...
  const slots: { card: MasterCard; variant: Variant }[] = [];

  for (const card of sorted) {
    // Sort variants within each card: normal → reverseHolo → holo → others
    const sortedVariants = [...card.variants].sort((a, b) =>
      (VARIANT_DISPLAY_ORDER[a.variantType] ?? 5) - (VARIANT_DISPLAY_ORDER[b.variantType] ?? 5)
    );
    for (const variant of sortedVariants) {
      slots.push({ card, variant });
    }
  }

  return slots;
};

const POCKET_COLS: Record<PocketSize, number> = { 4: 2, 9: 3, 12: 4, 16: 4 };
const POCKET_ROWS: Record<PocketSize, number> = { 4: 2, 9: 3, 12: 3, 16: 4 };

const fmt = (v: number | null) =>
  v != null ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

// ─── Variant dots ─────────────────────────────────────────────────────────────

function VariantDots({ variants, size = 10 }: { variants: Variant[]; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {variants.map((v) => (
        <div key={v.variantType} title={`${v.label}${v.haveCount > 1 ? ` (×${v.haveCount})` : ''}`}
          style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: v.haveCount > 0 ? v.color : 'transparent',
            border: `1.5px solid ${v.haveCount > 0 ? v.color : '#4B5563'}`,
          }} />
      ))}
    </div>
  );
}

// ─── Grid card ────────────────────────────────────────────────────────────────

function GridCard({ card, onToggle }: { card: MasterCard; onToggle: (variantType: string) => void }) {
  const allOwned = card.ownedVariants >= card.totalVariants;
  const anyOwned = card.ownedVariants > 0;
  const [hovered, setHovered] = useState(false);

  const border = allOwned ? 'rgba(16,185,129,0.5)' : anyOwned ? 'rgba(245,158,11,0.4)' : 'var(--border)';
  const bg = allOwned ? 'rgba(16,185,129,0.05)' : anyOwned ? 'rgba(245,158,11,0.05)' : 'var(--surface)';

  // Single variant cards — clicking the image toggles it directly
  // Multi variant cards — image click does nothing, dots are clickable
  const singleVariant = card.variants.length === 1;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1px solid ${hovered ? (allOwned ? '#10B981' : anyOwned ? '#F59E0B' : 'var(--gold)') : border}`,
        borderRadius: 10, overflow: 'hidden', background: bg,
        transition: 'all 0.12s', transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* Image — clickable only for single-variant cards */}
      <div
        onClick={() => singleVariant && onToggle(card.variants[0].variantType)}
        style={{
          position: 'relative', aspectRatio: '0.72',
          background: 'var(--surface-2)',
          cursor: singleVariant ? 'pointer' : 'default',
        }}
      >
        {card.imageSmall ? (
          <Image src={card.imageSmall} alt={card.name} fill style={{ objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 24 }}>🃏</div>
        )}
        {allOwned && (
          <div style={{ position: 'absolute', top: 5, right: 5, background: '#10B981', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>✓</div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent,rgba(0,0,0,0.65))', padding: '8px 5px 3px', fontSize: 8, color: 'rgba(255,255,255,0.6)', fontFamily: 'DM Mono, monospace', textAlign: 'center' }}>
          #{card.number}
        </div>
      </div>

      {/* Info + clickable variant dots */}
      <div style={{ padding: '7px 8px 6px' }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Each dot is independently clickable */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {card.variants.map((v) => (
              <div
                key={v.variantType}
                onClick={() => onToggle(v.variantType)}
                title={`${v.label}: ${v.haveCount > 0 ? 'Owned — click to remove' : 'Missing — click to mark'}`}
                style={{
                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                  background: v.haveCount > 0 ? v.color : 'transparent',
                  border: `2px solid ${v.haveCount > 0 ? v.color : '#4B5563'}`,
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                  transform: 'scale(1)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              />
            ))}
          </div>
          {card.marketPrice != null && (
            <span style={{ fontSize: 9, color: 'var(--gold)', fontFamily: 'DM Mono, monospace' }}>{fmt(card.marketPrice)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Binder slot ──────────────────────────────────────────────────────────────

function BinderSlot({ card, variant, onToggle, size }: {
  card: MasterCard; variant: Variant;
  onToggle: (cardId: string, variantType: string) => void;
  size: number;
}) {
  const owned = variant.haveCount > 0;
  return (
    <div
      onClick={() => onToggle(card.cardId, variant.variantType)}
      style={{
        position: 'relative', width: size, height: size * 1.4,
        borderRadius: 5, overflow: 'hidden', cursor: 'pointer',
        border: `2px solid ${owned ? variant.color : '#374151'}`,
        background: 'var(--surface-2)',
        opacity: owned ? 1 : 0.45,
        transition: 'all 0.1s',
      }}
      title={`${card.name} — ${variant.label}`}
    >
      {card.imageSmall && (
        <Image src={card.imageSmall} alt={card.name} fill style={{ objectFit: 'cover' }} />
      )}
      {/* Variant type indicator */}
      <div style={{
        position: 'absolute', bottom: 2, left: 2, right: 2,
        display: 'flex', gap: 2, justifyContent: 'flex-end',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: owned ? variant.color : '#374151',
          flexShrink: 0,
        }} />
      </div>
      {/* Dupe badge */}
      {variant.haveCount > 1 && (
        <div style={{
          position: 'absolute', top: 2, right: 2,
          background: 'rgba(0,0,0,0.7)', borderRadius: 3,
          fontSize: 8, color: '#fff', padding: '0 3px', fontFamily: 'DM Mono, monospace',
        }}>×{variant.haveCount}</div>
      )}
    </div>
  );
}

// ─── Binder page ──────────────────────────────────────────────────────────────

function BinderPage({ slots, pocketSize, onToggle }: {
  slots: { card: MasterCard; variant: Variant }[];
  pocketSize: PocketSize;
  onToggle: (cardId: string, variantType: string) => void;
}) {
  const cols = POCKET_COLS[pocketSize];
  const rows = POCKET_ROWS[pocketSize];
  const perPage = pocketSize;
  const slotSize = Math.floor(Math.min(680 / cols, 180));

  const empties = Array(Math.max(0, perPage - slots.length)).fill(null);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, ${slotSize}px)`,
      gap: 8, padding: 16,
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 8,
      minHeight: rows * (slotSize * 1.4 + 8),
    }}>
      {slots.map(({ card, variant }, i) => (
        <BinderSlot key={`${card.cardId}-${variant.variantType}-${i}`}
          card={card} variant={variant} onToggle={onToggle} size={slotSize} />
      ))}
      {empties.map((_, i) => (
        <div key={`empty-${i}`} style={{
          width: slotSize, height: slotSize * 1.4,
          borderRadius: 5, border: '1px dashed #1F2937',
          background: 'rgba(255,255,255,0.01)',
        }} />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MasterSetDetailPage() {
  const { setId } = useParams<{ setId: string }>();
  const router = useRouter();

  const [progress, setProgress] = useState<Progress | null>(null);
  const [cards, setCards] = useState<MasterCard[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewMode>('grid');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortBy>('number');
  const [search, setSearch] = useState('');
  const [pocketSize, setPocketSize] = useState<PocketSize>(9);
  const [stackVariants, setStackVariants] = useState(false);
  const [binderPage, setBinderPage] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: { progress: Progress; cards: MasterCard[] } }>(
        `/master-sets/${setId}`
      );
      setProgress(res.data.data.progress);
      setCards(res.data.data.cards);
    } finally {
      setLoading(false);
    }
  }, [setId]);

  useEffect(() => { load(); }, [load]);

  // Optimistic toggle
  const handleToggle = async (cardId: string, variantType: string = 'normal') => {
    // Optimistic update
    setCards((prev) => prev.map((c) => {
      if (c.cardId !== cardId) return c;
      const variants = c.variants.map((v) => {
        if (v.variantType !== variantType) return v;
        const newCount = v.haveCount > 0 ? 0 : 1;
        return { ...v, haveCount: newCount };
      });
      const ownedVariants = variants.filter((v) => v.haveCount > 0).length;
      return { ...c, variants, ownedVariants };
    }));

    // Update progress optimistically
    setProgress((prev) => {
      if (!prev) return prev;
      const card = cards.find((c) => c.cardId === cardId);
      const variant = card?.variants.find((v) => v.variantType === variantType);
      const adding = variant?.haveCount === 0;
      return { ...prev, ownedVariants: prev.ownedVariants + (adding ? 1 : -1), needCount: prev.needCount + (adding ? -1 : 1), completionPct: Math.round(((prev.ownedVariants + (adding ? 1 : -1)) / prev.totalVariants) * 100) };
    });

    try {
      await api.post(`/master-sets/${setId}/cards/${cardId}/toggle`, { variantType });
    } catch {
      // Revert on error
      load();
    }
  };

  const displayCards = filterCards(sortCards(cards, sortBy), filterTab, search);

  // Binder setup
  const binderSlots = expandForBinder(displayCards, stackVariants);
  const perPage = pocketSize;
  const totalPages = Math.ceil(binderSlots.length / perPage);
  const pageSlots = binderSlots.slice(binderPage * perPage, (binderPage + 1) * perPage);

  const statusColor = progress
    ? progress.completionPct === 100 ? '#10B981'
    : progress.completionPct >= 75 ? '#3B82F6'
    : progress.completionPct >= 40 ? '#F59E0B' : '#6B7280'
    : '#6B7280';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => router.push('/master-sets')}
          style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Back
        </button>

        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {/* Logo */}
          {progress?.logoUrl && (
            <img src={progress.logoUrl} alt={progress?.setName} style={{ height: 60, objectFit: 'contain' }} />
          )}

          {/* Progress */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{progress?.seriesName}</span>
            </div>

            {/* Progress bar with milestone dots */}
            <div style={{ position: 'relative', marginBottom: 6 }}>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress?.completionPct ?? 0}%`, background: `linear-gradient(90deg, #C9A84C, ${statusColor})`, borderRadius: 4, transition: 'width 0.5s ease' }} />
              </div>
              {/* Milestone markers */}
              {[25, 50, 75].map((pct) => (
                <div key={pct} style={{ position: 'absolute', top: 0, left: `${pct}%`, width: 2, height: 8, background: 'rgba(255,255,255,0.15)', transform: 'translateX(-50%)' }} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
              <span style={{ color: statusColor, fontWeight: 600 }}>
                {progress?.ownedVariants}/{progress?.totalVariants} Collected
              </span>
              <span style={{ color: 'var(--text-dim)' }}>{progress?.needCount} Needed</span>
              {(progress?.dupeCount ?? 0) > 0 && (
                <span style={{ color: '#F59E0B' }}>{progress?.dupeCount} Dupes</span>
              )}
            </div>
          </div>

          {/* Completion % */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: statusColor, fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>
              {progress?.completionPct ?? 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: '12px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or Number..."
            style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px 7px 32px', fontSize: 12, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: 13 }}>⌕</span>
        </div>

        {/* Sort buttons */}
        {(['number', 'name', 'rarity', 'price'] as SortBy[]).map((s) => (
          <button key={s} onClick={() => setSortBy(s)}
            style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${sortBy === s ? 'var(--gold)' : 'var(--border)'}`, background: sortBy === s ? 'rgba(201,168,76,0.1)' : 'var(--surface-2)', color: sortBy === s ? 'var(--gold)' : 'var(--text-dim)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 4 }}>
            {s} {sortBy === s && '↑'}
          </button>
        ))}

        {/* View toggles */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginLeft: 'auto' }}>
          {(['grid', 'table', 'binder'] as ViewMode[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '7px 14px', border: 'none', borderRight: v !== 'binder' ? '1px solid var(--border)' : 'none', background: view === v ? 'rgba(201,168,76,0.12)' : 'var(--surface-2)', color: view === v ? 'var(--gold)' : 'var(--text-dim)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
              {v === 'grid' ? '⊞ Grid' : v === 'table' ? '☰ Table' : '📒 Binder'}
            </button>
          ))}
        </div>
      </div>

      {/* Filter tabs + variant legend */}
      <div style={{ padding: '0 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex' }}>
          {([
            { key: 'all', label: 'Show All' },
            { key: 'have', label: `Have (${progress?.ownedVariants ?? 0})` },
            { key: 'need', label: `Need (${progress?.needCount ?? 0})` },
            { key: 'dupes', label: `Dupes (${progress?.dupeCount ?? 0})` },
          ] as { key: FilterTab; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setFilterTab(key)}
              style={{ padding: '12px 16px', border: 'none', borderBottom: `2px solid ${filterTab === key ? 'var(--gold)' : 'transparent'}`, background: 'transparent', color: filterTab === key ? 'var(--gold)' : 'var(--text-dim)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: filterTab === key ? 500 : 400 }}>
              {label}
            </button>
          ))}
        </div>
        {/* Variant legend */}
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-dim)' }}>
          {[
            { color: '#E5C97E', label: '=Normal' },
            { color: '#9B8EDB', label: '=Holofoil' },
            { color: '#7BC4E2', label: '=Reverse Holofoil' },
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Binder options */}
      {view === 'binder' && (
        <div style={{ padding: '10px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 1, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {([9, 12, 4, 16] as PocketSize[]).map((p) => (
              <button key={p} onClick={() => { setPocketSize(p); setBinderPage(0); }}
                style={{ padding: '6px 12px', border: 'none', borderRight: p !== 16 ? '1px solid var(--border)' : 'none', background: pocketSize === p ? 'rgba(201,168,76,0.12)' : 'transparent', color: pocketSize === p ? 'var(--gold)' : 'var(--text-dim)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                {p}-Pocket
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Stack Variants:</span>
            <div onClick={() => setStackVariants((v) => !v)}
              style={{ width: 36, height: 20, borderRadius: 10, background: stackVariants ? '#10B981' : 'var(--border)', cursor: 'pointer', transition: 'background 0.2s', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 2, left: stackVariants ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '24px 32px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-dim)' }}>Loading cards...</div>}

        {!loading && view === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
            {displayCards.map((card) => (
              <GridCard key={card.cardId} card={card}
                onToggle={(variantType) => handleToggle(card.cardId, variantType)} />
            ))}
          </div>
        )}

        {!loading && view === 'table' && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 80px 100px 80px 120px 80px', gap: 0, padding: '8px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em' }}>
              <span>#</span><span>NAME</span><span>RARITY</span><span>VARIANTS</span><span>PRICE</span><span>STATUS</span><span></span>
            </div>
            {displayCards.map((card) => (
              <div key={card.cardId}
                style={{ display: 'grid', gridTemplateColumns: '50px 1fr 80px 100px 80px 120px 80px', gap: 0, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, alignItems: 'center', background: 'var(--surface)' }}>
                <span style={{ color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace' }}>{card.number}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{card.name}</span>
                <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>{card.rarity ?? '—'}</span>
                <VariantDots variants={card.variants} />
                <span style={{ color: 'var(--gold)', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>{fmt(card.marketPrice)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: card.ownedVariants >= card.totalVariants ? '#10B981' : card.ownedVariants > 0 ? '#F59E0B' : '#374151' }} />
                  <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                    {card.ownedVariants}/{card.totalVariants}
                  </span>
                </div>
                <button
                  onClick={() => handleToggle(card.cardId, card.variants[0]?.variantType ?? 'normal')}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: card.ownedVariants > 0 ? '#10B981' : 'var(--text-dim)', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {card.ownedVariants > 0 ? '✓ Have' : '+ Mark'}
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && view === 'binder' && (
          <div>
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Left page (blank/back cover) */}
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {binderPage === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📒</div>
                    {progress?.setName}
                  </div>
                ) : (
                  <BinderPage
                    slots={binderSlots.slice((binderPage - 1) * perPage, binderPage * perPage)}
                    pocketSize={pocketSize}
                    onToggle={handleToggle}
                  />
                )}
              </div>

              {/* Right page */}
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)', minHeight: 400 }}>
                <BinderPage
                  slots={pageSlots}
                  pocketSize={pocketSize}
                  onToggle={handleToggle}
                />
              </div>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 16 }}>
              <button
                onClick={() => setBinderPage((p) => Math.max(0, p - 1))}
                disabled={binderPage === 0}
                style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: 12, cursor: binderPage === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: binderPage === 0 ? 0.4 : 1 }}>
                ← Prev
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace' }}>
                Page {binderPage + 1}
              </span>
              <button
                onClick={() => setBinderPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={binderPage >= totalPages - 1}
                style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--gold)', color: '#0D0E11', fontSize: 12, cursor: binderPage >= totalPages - 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 500, opacity: binderPage >= totalPages - 1 ? 0.4 : 1 }}>
                Next →
              </button>
            </div>
          </div>
        )}

        {!loading && displayCards.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)', fontSize: 13 }}>
            No cards match your filters
          </div>
        )}
      </div>
    </div>
  );
}
