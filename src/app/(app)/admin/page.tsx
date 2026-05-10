'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserStats {
  totalUsers: number;
  newLast30Days: number;
  newLast7Days: number;
  subscriptions: {
    free: number;
    collector: number;
    pro: number;
    trialing: number;
    canceled: number;
    pastDue: number;
    totalPaid: number;
    conversionRate: number;
  };
}

interface CollectionStats {
  inventory: { totalItems: number; byType: Record<string, number>; uniqueUsers: number; avgSizePerUser: number };
  masterSets: { totalTrackedSets: number; usersTrackingSets: number; avgSetsPerUser: number; mostTracked: { setId: string; count: number }[] };
  portfolio: { totalSnapshots: number; usersWithPortfolio: number; avgPortfolioValue: number; totalPortfolioValue: number };
  centering: { totalReports: number };
  database: { totalCards: number; totalSets: number; cardsWithPrices: number; priceCoveragePct: number };
}

type Tab = 'users' | 'collection' | 'variants' | 'settings';

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'var(--text-primary)' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color, fontFamily: 'DM Mono, monospace', marginBottom: sub ? 2 : 0 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{sub}</div>}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em', marginBottom: 12, marginTop: 24, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
      {title}
    </div>
  );
}

// ─── User analytics tab ───────────────────────────────────────────────────────

function UserAnalytics() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: UserStats }>('/admin/analytics/users')
      .then((r) => setStats(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;
  if (!stats) return null;

  const total = stats.totalUsers || 1;

  return (
    <div>
      <SectionHeader title="USER OVERVIEW" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard label="TOTAL USERS" value={stats.totalUsers.toLocaleString()} />
        <StatCard label="NEW (7 DAYS)" value={stats.newLast7Days} color="#10B981" />
        <StatCard label="NEW (30 DAYS)" value={stats.newLast30Days} color="#3B82F6" />
        <StatCard label="PAID USERS" value={stats.subscriptions.totalPaid} color="var(--gold)" sub={`${stats.subscriptions.conversionRate}% conversion`} />
      </div>

      <SectionHeader title="SUBSCRIPTION BREAKDOWN" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard label="FREE TIER" value={stats.subscriptions.free} sub={`${Math.round(stats.subscriptions.free / total * 100)}% of users`} color="#6B7280" />
        <StatCard label="COLLECTOR" value={stats.subscriptions.collector} sub={`${Math.round(stats.subscriptions.collector / total * 100)}% of users`} color="#3B82F6" />
        <StatCard label="PRO" value={stats.subscriptions.pro} sub={`${Math.round(stats.subscriptions.pro / total * 100)}% of users`} color="var(--gold)" />
      </div>

      <SectionHeader title="SUBSCRIPTION STATUS" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <StatCard label="TRIALING" value={stats.subscriptions.trialing} color="#F59E0B" />
        <StatCard label="CANCELED" value={stats.subscriptions.canceled} color="#EF4444" />
        <StatCard label="PAST DUE" value={stats.subscriptions.pastDue} color="#EF4444" />
      </div>

      {/* Visual breakdown bar */}
      <div style={{ marginTop: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>USER DISTRIBUTION</div>
        <div style={{ height: 24, borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
          {[
            { label: 'Free', count: stats.subscriptions.free, color: '#374151' },
            { label: 'Trial', count: stats.subscriptions.trialing, color: '#F59E0B' },
            { label: 'Collector', count: stats.subscriptions.collector, color: '#3B82F6' },
            { label: 'Pro', count: stats.subscriptions.pro, color: '#C9A84C' },
          ].filter(s => s.count > 0).map((s) => (
            <div key={s.label} title={`${s.label}: ${s.count}`}
              style={{ width: `${(s.count / total) * 100}%`, background: s.color, transition: 'width 0.5s ease' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Free', color: '#374151' },
            { label: 'Trial', color: '#F59E0B' },
            { label: 'Collector', color: '#3B82F6' },
            { label: 'Pro', color: '#C9A84C' },
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-dim)' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Collection analytics tab ─────────────────────────────────────────────────

function CollectionAnalytics() {
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: CollectionStats }>('/admin/analytics/collection')
      .then((r) => setStats(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;
  if (!stats) return null;

  const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;

  return (
    <div>
      <SectionHeader title="INVENTORY" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard label="TOTAL ITEMS" value={stats.inventory.totalItems.toLocaleString()} />
        <StatCard label="UNIQUE COLLECTORS" value={stats.inventory.uniqueUsers} />
        <StatCard label="AVG COLLECTION SIZE" value={stats.inventory.avgSizePerUser} sub="cards per user" />
        <StatCard label="RAW CARDS" value={stats.inventory.byType.raw_card?.toLocaleString() ?? 0} color="#3B82F6" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard label="GRADED CARDS" value={stats.inventory.byType.graded_card?.toLocaleString() ?? 0} color="var(--gold)" />
        <StatCard label="SEALED PRODUCTS" value={stats.inventory.byType.sealed_product?.toLocaleString() ?? 0} color="#8B5CF6" />
      </div>

      <SectionHeader title="PORTFOLIO" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard label="USERS WITH PORTFOLIO" value={stats.portfolio.usersWithPortfolio} />
        <StatCard label="AVG PORTFOLIO VALUE" value={fmt(stats.portfolio.avgPortfolioValue)} color="var(--gold)" />
        <StatCard label="TOTAL VALUE TRACKED" value={fmt(stats.portfolio.totalPortfolioValue)} color="#10B981" />
      </div>

      <SectionHeader title="MASTER SETS" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard label="SETS BEING TRACKED" value={stats.masterSets.totalTrackedSets} />
        <StatCard label="USERS TRACKING" value={stats.masterSets.usersTrackingSets} />
        <StatCard label="AVG SETS PER USER" value={stats.masterSets.avgSetsPerUser} />
      </div>

      {/* Most tracked sets */}
      {stats.masterSets.mostTracked.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '10px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em' }}>
            MOST TRACKED SETS
          </div>
          {stats.masterSets.mostTracked.slice(0, 8).map((s, i) => (
            <div key={s.setId} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 16px', borderBottom: i < 7 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{s.setId}</span>
              <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--gold)' }}>{s.count} users</span>
            </div>
          ))}
        </div>
      )}

      <SectionHeader title="DATABASE & PRICING" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard label="TOTAL CARDS" value={stats.database.totalCards.toLocaleString()} />
        <StatCard label="TOTAL SETS" value={stats.database.totalSets} />
        <StatCard label="CARDS WITH PRICES" value={stats.database.cardsWithPrices.toLocaleString()} color="#10B981" />
        <StatCard label="PRICE COVERAGE" value={`${stats.database.priceCoveragePct}%`} color={stats.database.priceCoveragePct > 90 ? '#10B981' : '#F59E0B'} />
      </div>

      <SectionHeader title="OTHER" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <StatCard label="CENTERING REPORTS" value={stats.centering.totalReports.toLocaleString()} />
      </div>
    </div>
  );
}

// ─── Main admin page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'users', label: 'User Analytics' },
    { key: 'collection', label: 'Collection Analytics' },
    { key: 'variants', label: 'Variants' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '28px 40px 0', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace', marginBottom: 6 }}>ADMIN</div>
        <h1 style={{ fontSize: 26, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 16 }}>Dashboard</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => {
              if (tab.key === 'variants') { router.push('/admin/variants'); return; }
              if (tab.key === 'settings') { router.push('/admin/settings'); return; }
              setActiveTab(tab.key);
            }}
              style={{
                padding: '10px 20px', border: 'none',
                borderBottom: `2px solid ${activeTab === tab.key ? 'var(--gold)' : 'transparent'}`,
                background: 'transparent',
                color: activeTab === tab.key ? 'var(--gold)' : 'var(--text-dim)',
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: activeTab === tab.key ? 500 : 400,
                transition: 'color 0.15s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: '28px 40px', maxWidth: 1100, margin: '0 auto' }}>
        {activeTab === 'users' && <UserAnalytics />}
        {activeTab === 'collection' && <CollectionAnalytics />}
      </div>
    </div>
  );
}
