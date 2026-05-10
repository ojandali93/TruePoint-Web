'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../../../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Submission {
  id: string;
  cardName: string;
  cardSet: string;
  cardNumber: string | null;
  cardImage: string | null;
  gradingCompany: string;
  serviceTier: string;
  declaredValue: number | null;
  gradingCost: number | null;
  status: string;
  submittedAt: string;
  receivedAt: string | null;
  gradedAt: string | null;
  shippedBackAt: string | null;
  returnedAt: string | null;
  submissionNumber: string | null;
  trackingToGrader: string | null;
  trackingFromGrader: string | null;
  gradeReceived: string | null;
  certNumber: string | null;
  gradedValue: number | null;
  notes: string | null;
  daysInTransit: number;
  roi: number | null;
}

interface Summary {
  totalSubmissions: number;
  activeInPipeline: number;
  returned: number;
  totalSpentOnGrading: number;
  totalReturnedValue: number;
  totalROI: number | null;
  byStatus: Record<string, number>;
  byCompany: Record<string, number>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STEPS = ['submitted', 'received', 'grading', 'shipped_back', 'returned'];
const STATUS_LABELS: Record<string, string> = {
  submitted:    'Submitted',
  received:     'Received',
  grading:      'Being Graded',
  shipped_back: 'Shipped Back',
  returned:     'Returned',
};
const STATUS_COLORS: Record<string, string> = {
  submitted:    '#6B7280',
  received:     '#3B82F6',
  grading:      '#F59E0B',
  shipped_back: '#8B5CF6',
  returned:     '#10B981',
};
const COMPANIES = ['PSA', 'BGS', 'CGC', 'SGC'];
const TIERS: Record<string, Record<string, number>> = {
  PSA: { value: 25, regular: 50, express: 150, walkthrough: 600 },
  BGS: { economy: 22, standard: 35, express: 80, premium: 200 },
  CGC: { economy: 20, standard: 30, express: 60 },
  SGC: { standard: 25, express: 60 },
};

const fmt = (v: number | null) =>
  v != null ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// ─── Status pipeline component ────────────────────────────────────────────────

function StatusPipeline({ status }: { status: string }) {
  const currentIdx = STATUS_STEPS.indexOf(status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        const color = STATUS_COLORS[step];
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
            <div title={STATUS_LABELS[step]} style={{
              width: active ? 12 : 8, height: active ? 12 : 8,
              borderRadius: '50%',
              background: done ? color : 'var(--border)',
              border: active ? `2px solid ${color}` : 'none',
              transition: 'all 0.2s',
              flexShrink: 0,
            }} />
            {i < STATUS_STEPS.length - 1 && (
              <div style={{ width: 20, height: 2, background: i < currentIdx ? STATUS_COLORS[STATUS_STEPS[i + 1]] : 'var(--border)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── New submission modal ─────────────────────────────────────────────────────

function NewSubmissionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    cardName: '', cardSet: '', cardNumber: '',
    gradingCompany: 'PSA', serviceTier: 'value',
    declaredValue: '', submissionNumber: '',
    trackingToGrader: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const tierOptions = Object.keys(TIERS[form.gradingCompany] ?? {});
  const tierCost = TIERS[form.gradingCompany]?.[form.serviceTier] ?? 0;

  const handleSubmit = async () => {
    if (!form.cardName || !form.cardSet) { setError('Card name and set are required'); return; }
    setSaving(true);
    try {
      await api.post('/grading/submissions', {
        ...form,
        declaredValue: form.declaredValue ? parseFloat(form.declaredValue) : undefined,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create submission');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 480, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em', marginBottom: 2 }}>NEW SUBMISSION</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Send a card for grading</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Card info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'CARD NAME', key: 'cardName', placeholder: 'Charizard ex', span: true },
              { label: 'SET', key: 'cardSet', placeholder: 'Obsidian Flames' },
              { label: 'CARD #', key: 'cardNumber', placeholder: '223' },
            ].map((f) => (
              <div key={f.key} style={{ gridColumn: f.span ? '1 / -1' : undefined }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', marginBottom: 5 }}>{f.label}</div>
                <input value={(form as any)[f.key]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>

          {/* Grading company + tier */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', marginBottom: 5 }}>GRADING COMPANY</div>
              <select value={form.gradingCompany}
                onChange={(e) => setForm((p) => ({ ...p, gradingCompany: e.target.value, serviceTier: Object.keys(TIERS[e.target.value] ?? {})[0] }))}
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none' }}>
                {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', marginBottom: 5 }}>SERVICE TIER</div>
              <select value={form.serviceTier} onChange={(e) => setForm((p) => ({ ...p, serviceTier: e.target.value }))}
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none' }}>
                {tierOptions.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} (${TIERS[form.gradingCompany][t]})</option>)}
              </select>
            </div>
          </div>

          {/* Declared value + submission number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', marginBottom: 5 }}>DECLARED VALUE ($)</div>
              <input value={form.declaredValue} onChange={(e) => setForm((p) => ({ ...p, declaredValue: e.target.value }))}
                type="number" placeholder="0.00"
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', marginBottom: 5 }}>SUBMISSION # (optional)</div>
              <input value={form.submissionNumber} onChange={(e) => setForm((p) => ({ ...p, submissionNumber: e.target.value }))}
                placeholder="12345678"
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', marginBottom: 5 }}>TRACKING TO GRADER (optional)</div>
            <input value={form.trackingToGrader} onChange={(e) => setForm((p) => ({ ...p, trackingToGrader: e.target.value }))}
              placeholder="1Z999AA10123456784"
              style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Cost summary */}
          <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
            Grading fee: <span style={{ color: 'var(--gold)', fontWeight: 500 }}>${tierCost}</span>
            {form.declaredValue && (
              <span> · Total cost: <span style={{ color: 'var(--gold)', fontWeight: 500 }}>${(tierCost + parseFloat(form.declaredValue || '0')).toFixed(2)}</span></span>
            )}
          </div>

          {error && <div style={{ fontSize: 12, color: '#EF4444' }}>{error}</div>}

          <button onClick={handleSubmit} disabled={saving}
            style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: 'var(--gold)', color: '#0D0E11', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Submitting...' : 'Submit for Grading →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Advance status modal ─────────────────────────────────────────────────────

function AdvanceModal({ submission, onClose, onAdvanced }: { submission: Submission; onClose: () => void; onAdvanced: () => void }) {
  const nextIdx = STATUS_STEPS.indexOf(submission.status) + 1;
  const nextStatus = STATUS_STEPS[nextIdx];
  const [form, setForm] = useState({ gradeReceived: '', certNumber: '', gradedValue: '', trackingFromGrader: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const isReturned = nextStatus === 'returned';

  const handleAdvance = async () => {
    setSaving(true);
    try {
      await api.post(`/grading/submissions/${submission.id}/advance`, {
        ...form,
        gradedValue: form.gradedValue ? parseFloat(form.gradedValue) : undefined,
      });
      onAdvanced();
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 400, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'DM Mono, monospace', marginBottom: 2 }}>ADVANCE STATUS</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
              → {STATUS_LABELS[nextStatus]}
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {nextStatus === 'shipped_back' && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', marginBottom: 5 }}>TRACKING FROM GRADER</div>
              <input value={form.trackingFromGrader} onChange={(e) => setForm((p) => ({ ...p, trackingFromGrader: e.target.value }))}
                placeholder="Return tracking number"
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}
          {isReturned && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', marginBottom: 5 }}>GRADE RECEIVED</div>
                  <input value={form.gradeReceived} onChange={(e) => setForm((p) => ({ ...p, gradeReceived: e.target.value }))}
                    placeholder="10 / 9.5 / 9"
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', marginBottom: 5 }}>CERT NUMBER</div>
                  <input value={form.certNumber} onChange={(e) => setForm((p) => ({ ...p, certNumber: e.target.value }))}
                    placeholder="12345678"
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', marginBottom: 5 }}>GRADED VALUE ($)</div>
                <input value={form.gradedValue} onChange={(e) => setForm((p) => ({ ...p, gradedValue: e.target.value }))}
                  type="number" placeholder="Current market value at this grade"
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </>
          )}
          <button onClick={handleAdvance} disabled={saving}
            style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: STATUS_COLORS[nextStatus], color: '#fff', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : `Mark as ${STATUS_LABELS[nextStatus]} →`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GradingSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [showNew, setShowNew] = useState(false);
  const [advancing, setAdvancing] = useState<Submission | null>(null);

  const load = useCallback(async () => {
    try {
      const [subRes, sumRes] = await Promise.all([
        api.get<{ data: Submission[] }>('/grading/submissions'),
        api.get<{ data: Summary }>('/grading/submissions/summary'),
      ]);
      setSubmissions(subRes.data.data);
      setSummary(sumRes.data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = submissions.filter((s) => {
    if (filterStatus === 'active') return s.status !== 'returned';
    if (filterStatus === 'returned') return s.status === 'returned';
    return true;
  });

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace', marginBottom: 6 }}>GRADING</div>
          <h1 style={{ fontSize: 28, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Submissions</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Track your cards through the grading pipeline.</p>
        </div>
        <button onClick={() => setShowNew(true)}
          style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: 'var(--gold)', color: '#0D0E11', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Submit Card
        </button>
      </div>

      {/* Summary stats */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'TOTAL SUBMITTED', value: summary.totalSubmissions, color: 'var(--text-primary)' },
            { label: 'IN PIPELINE', value: summary.activeInPipeline, color: '#F59E0B' },
            { label: 'RETURNED', value: summary.returned, color: '#10B981' },
            { label: 'GRADING COSTS', value: fmt(summary.totalSpentOnGrading), color: '#EF4444' },
            { label: 'TOTAL ROI', value: summary.totalROI !== null ? `${summary.totalROI >= 0 ? '+' : ''}${summary.totalROI.toFixed(0)}%` : '—', color: (summary.totalROI ?? 0) >= 0 ? '#10B981' : '#EF4444' },
          ].map((s) => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.07em', fontFamily: 'DM Mono, monospace', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: s.color, fontFamily: 'DM Mono, monospace' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
        {[{ key: 'active', label: 'Active' }, { key: 'returned', label: 'Returned' }, { key: 'all', label: 'All' }].map((f) => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)}
            style={{ padding: '8px 20px', border: 'none', borderRight: f.key !== 'all' ? '1px solid var(--border)' : 'none', background: filterStatus === f.key ? 'rgba(201,168,76,0.12)' : 'var(--surface-2)', color: filterStatus === f.key ? 'var(--gold)' : 'var(--text-dim)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Submissions list */}
      {loading && <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Loading...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>📬</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>No submissions yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Submit a card for grading to start tracking it through the pipeline.</div>
          <button onClick={() => setShowNew(true)}
            style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: 'var(--gold)', color: '#0D0E11', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Submit First Card
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((sub) => {
          const statusColor = STATUS_COLORS[sub.status];
          const isReturned = sub.status === 'returned';
          const canAdvance = !isReturned;

          return (
            <div key={sub.id} style={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', display: 'flex', gap: 16, alignItems: 'center' }}>
                {/* Card image */}
                {sub.cardImage && (
                  <div style={{ width: 40, height: 56, flexShrink: 0, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-2)' }}>
                    <img src={sub.cardImage} alt={sub.cardName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}

                {/* Card info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {sub.cardName}
                    {sub.gradeReceived && (
                      <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 12, background: `${statusColor}20`, color: statusColor, fontSize: 11, fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>
                        {sub.gradingCompany} {sub.gradeReceived}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', marginBottom: 8 }}>
                    {sub.cardSet}{sub.cardNumber ? ` #${sub.cardNumber}` : ''} · {sub.gradingCompany} {sub.serviceTier}
                  </div>
                  <StatusPipeline status={sub.status} />
                </div>

                {/* Dates + cost */}
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>
                    Submitted {fmtDate(sub.submittedAt)}
                  </div>
                  {isReturned && sub.returnedAt && (
                    <div style={{ fontSize: 11, color: '#10B981', marginBottom: 2 }}>
                      Returned {fmtDate(sub.returnedAt)} · {sub.daysInTransit}d
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--gold)', fontFamily: 'DM Mono, monospace' }}>
                    {fmt(sub.gradingCost)} fee
                  </div>
                  {isReturned && sub.roi !== null && (
                    <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'DM Mono, monospace', color: sub.roi >= 0 ? '#10B981' : '#EF4444' }}>
                      {sub.roi >= 0 ? '+' : ''}{sub.roi.toFixed(0)}% ROI
                    </div>
                  )}
                </div>

                {/* Advance button */}
                {canAdvance && (
                  <button onClick={() => setAdvancing(sub)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${statusColor}40`, background: `${statusColor}10`, color: statusColor, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, flexShrink: 0 }}>
                    Advance →
                  </button>
                )}
              </div>

              {/* Tracking numbers if present */}
              {(sub.submissionNumber || sub.trackingToGrader || sub.certNumber) && (
                <div style={{ padding: '8px 18px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {sub.submissionNumber && (
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      Submission: <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text-secondary)' }}>{sub.submissionNumber}</span>
                    </span>
                  )}
                  {sub.trackingToGrader && (
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      Tracking out: <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text-secondary)' }}>{sub.trackingToGrader}</span>
                    </span>
                  )}
                  {sub.certNumber && (
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      Cert: <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--gold)' }}>{sub.certNumber}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNew && <NewSubmissionModal onClose={() => setShowNew(false)} onCreated={load} />}
      {advancing && <AdvanceModal submission={advancing} onClose={() => setAdvancing(null)} onAdvanced={load} />}
    </div>
  );
}
