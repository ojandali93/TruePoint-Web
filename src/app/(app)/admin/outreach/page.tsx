"use client";

/**
 * Outreach CRM (admin only) — /admin/outreach
 *
 * Not behind a feature flag; permanently admin-gated via requireAdmin on
 * the backend, same as /admin/affiliates and /admin/users. Own route file
 * rather than folded into the giant tabbed admin/page.tsx, matching how
 * Affiliates already got its own page.
 */

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  convertOutreachToAffiliate,
  createOutreachContact,
  deleteOutreachContact,
  deleteOutreachInteraction,
  logOutreachInteraction,
  updateOutreachContact,
  useOutreachContact,
  useOutreachContacts,
  INTERACTION_TYPES,
  OUTREACH_PLATFORMS,
  OUTREACH_STAGES,
  type ConvertToAffiliateResult,
  type InteractionType,
  type OutreachContact,
  type OutreachPlatform,
  type OutreachStage,
} from "../../../../hooks/useOutreach";

// ─── Display config ─────────────────────────────────────────────────────────

const STAGE_LABEL: Record<OutreachStage, string> = {
  prospecting: "Prospecting",
  engaging: "Engaging",
  messaging: "Messaging",
  negotiating: "Negotiating",
  partnered: "Partnered",
  declined: "Declined",
  cold: "Cold",
};

const STAGE_COLOR: Record<OutreachStage, string> = {
  prospecting: "#787d87",
  engaging: "#3B82F6",
  messaging: "#F59E0B",
  negotiating: "#D85A30",
  partnered: "#10B981",
  declined: "#e85f5f",
  cold: "#5A5D66",
};

const INTERACTION_LABEL: Record<InteractionType, string> = {
  comment: "Comment",
  like: "Like",
  dm: "DM",
  reply: "Reply",
  email: "Email",
  call: "Call",
  meeting: "Meeting",
  other: "Other",
};

const FOLLOW_UP_PRESETS = [
  { label: "Tomorrow", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
];

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function formatDate(iso: string | null): string {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

type FilterKey = "all" | "due" | "stale" | OutreachStage;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OutreachPage() {
  const router = useRouter();
  const { data: contacts, loading, error, refetch } = useOutreachContacts();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [modalContactId, setModalContactId] = useState<
    string | null | undefined
  >(
    undefined, // undefined = closed, null = create mode, string = edit mode
  );

  const stats = useMemo(() => {
    const list = contacts ?? [];
    return {
      total: list.length,
      due: list.filter((c) => c.isDueForFollowUp).length,
      stale: list.filter((c) => !c.isDueForFollowUp && c.isStale).length,
      partnered: list.filter((c) => c.stage === "partnered").length,
    };
  }, [contacts]);

  const filtered = useMemo(() => {
    const list = contacts ?? [];
    switch (filter) {
      case "all":
        return list;
      case "due":
        return list.filter((c) => c.isDueForFollowUp);
      case "stale":
        return list.filter((c) => !c.isDueForFollowUp && c.isStale);
      default:
        return list.filter((c) => c.stage === filter);
    }
  }, [contacts, filter]);

  const quickLog = async (contact: OutreachContact, type: InteractionType) => {
    try {
      await logOutreachInteraction(contact.id, type);
      refetch();
    } catch {
      // best-effort UI action; the row just won't update if this fails
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          padding: "28px 40px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <button
          onClick={() => router.push("/admin")}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-dim)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
            padding: 0,
            marginBottom: 12,
          }}
        >
          ← Admin
        </button>
        <div
          style={{
            fontSize: 10,
            color: "var(--gold)",
            letterSpacing: "0.1em",
            fontFamily: "DM Mono, monospace",
            marginBottom: 6,
          }}
        >
          MANAGEMENT
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Outreach CRM
        </h1>
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
          Tracking your influencer/creator outreach — admin only.
        </div>
      </div>

      <div style={{ padding: "28px 40px", maxWidth: 1100, margin: "0 auto" }}>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: 80,
              color: "var(--text-dim)",
              fontSize: 13,
            }}
          >
            Loading…
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: "center",
              padding: 80,
              color: "#e85f5f",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <StatCard label='Contacts' value={String(stats.total)} />
              <StatCard
                label='Due'
                value={String(stats.due)}
                tone={stats.due > 0 ? "amber" : undefined}
              />
              <StatCard
                label='Going cold'
                value={String(stats.stale)}
                tone={stats.stale > 0 ? "amber" : undefined}
              />
              <StatCard
                label='Partnered'
                value={String(stats.partnered)}
                tone='gold'
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[
                  { key: "all" as const, label: "All" },
                  { key: "due" as const, label: "Due" },
                  { key: "stale" as const, label: "Going cold" },
                  { key: "prospecting" as const, label: "Prospecting" },
                  { key: "engaging" as const, label: "Engaging" },
                  { key: "messaging" as const, label: "Messaging" },
                  { key: "negotiating" as const, label: "Negotiating" },
                  { key: "partnered" as const, label: "Partnered" },
                ].map((f) => {
                  const active = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 100,
                        border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
                        background: active
                          ? "rgba(201,168,76,0.1)"
                          : "transparent",
                        color: active ? "var(--gold)" : "var(--text-secondary)",
                        fontSize: 11,
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setModalContactId(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--gold)",
                  color: "var(--charcoal, #0E0E12)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
              >
                + Add contact
              </button>
            </div>

            {filtered.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  background: "var(--surface)",
                  color: "var(--text-dim)",
                  fontSize: 13,
                }}
              >
                {filter === "all"
                  ? "No contacts yet."
                  : "Nothing matches this filter."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.map((c) => (
                  <ContactRow
                    key={c.id}
                    contact={c}
                    onClick={() => setModalContactId(c.id)}
                    onQuickLog={(type) => quickLog(c, type)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {modalContactId !== undefined && (
        <ContactModal
          contactId={modalContactId}
          onClose={() => setModalContactId(undefined)}
          onChanged={refetch}
        />
      )}
    </div>
  );
}

// ─── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "gold" | "amber";
}) {
  const color =
    tone === "gold"
      ? "var(--gold)"
      : tone === "amber"
        ? "#F59E0B"
        : "var(--text-primary)";
  return (
    <div
      style={{
        flex: 1,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "10px 14px",
      }}
    >
      <div
        style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: 0.5 }}
      >
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 20, fontWeight: 500, color, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

// ─── Contact row ────────────────────────────────────────────────────────────

function ContactRow({
  contact,
  onClick,
  onQuickLog,
}: {
  contact: OutreachContact;
  onClick: () => void;
  onQuickLog: (type: InteractionType) => void;
}) {
  const stageColor = STAGE_COLOR[contact.stage];

  return (
    <div
      style={{
        border: `1px solid ${contact.isDueForFollowUp || contact.isStale ? "#F59E0B55" : "var(--border)"}`,
        borderRadius: 10,
        background: "var(--surface)",
        padding: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onClick}
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: "left",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontFamily: "inherit",
            padding: 0,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {contact.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              marginTop: 2,
            }}
          >
            {contact.handle ? `@${contact.handle}` : "No handle"}
            {contact.primary_platform ? `  ·  ${contact.primary_platform}` : ""}
            {contact.follower_count != null
              ? `  ·  ${contact.follower_count.toLocaleString()} followers`
              : ""}
          </div>
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          marginTop: 8,
        }}
      >
        <Badge
          label={STAGE_LABEL[contact.stage].toUpperCase()}
          color={stageColor}
        />
        {contact.isDueForFollowUp && (
          <Badge label='FOLLOW UP DUE' color='#F59E0B' />
        )}
        {!contact.isDueForFollowUp && contact.isStale && (
          <Badge label='GOING COLD' color='#F59E0B' />
        )}
        {contact.affiliateSignupCount !== null && (
          <Badge
            label={`${contact.affiliateSignupCount} SIGNUP${contact.affiliateSignupCount === 1 ? "" : "S"}`}
            color='var(--gold)'
          />
        )}
        <span
          style={{ fontSize: 10, color: "var(--text-dim)", marginLeft: "auto" }}
        >
          Last contact: {relativeTime(contact.last_contacted_at)}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--border)",
        }}
      >
        {(["like", "comment", "dm"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onQuickLog(t)}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 6,
              border: "none",
              background: "var(--surface-2)",
              color: "var(--text-secondary)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            + {INTERACTION_LABEL[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 100,
        background: `${color}22`,
        border: `1px solid ${color}55`,
        color,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.3,
      }}
    >
      {label}
    </span>
  );
}

// ─── Shared overlay shell ───────────────────────────────────────────────────

function ModalShell({
  width = 480,
  onClose,
  children,
}: {
  width?: number;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
          width,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const fieldLabel = {
  fontSize: 11,
  color: "var(--text-dim)",
  marginBottom: 6,
  textTransform: "uppercase" as const,
  letterSpacing: 0.5,
};

const inputStyle = {
  width: "100%",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  color: "var(--text-primary)",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box" as const,
};

function chipStyle(active: boolean, destructive?: boolean) {
  const color = destructive ? "#e85f5f" : "var(--gold)";
  return {
    padding: "6px 12px",
    borderRadius: 8,
    border: `1px solid ${active ? color : "var(--border)"}`,
    background: active ? `${color}22` : "var(--surface-2)",
    color: active ? color : "var(--text-primary)",
    fontSize: 11,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    fontFamily: "inherit",
    textTransform: "capitalize" as const,
  };
}

// ─── Contact modal — create / edit / detail ────────────────────────────────

function ContactModal({
  contactId,
  onClose,
  onChanged,
}: {
  contactId: string | null; // null = create mode
  onClose: () => void;
  onChanged: () => void;
}) {
  const isEdit = !!contactId;
  const detail = useOutreachContact(contactId);
  const c = detail.data?.contact ?? null;

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<OutreachPlatform | null>(null);
  const [followerCount, setFollowerCount] = useState("");
  const [niche, setNiche] = useState("");
  const [stage, setStage] = useState<OutreachStage>("prospecting");
  const [nextFollowUpAt, setNextFollowUpAt] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const [logType, setLogType] = useState<InteractionType>("comment");
  const [logNotes, setLogNotes] = useState("");
  const [logging, setLogging] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  // One-time prefill once detail loads (edit) — no re-sync afterward, so
  // typing isn't fought by a refetch; onChanged() outside handles the list.
  const [prefilled, setPrefilled] = useState(false);
  if (isEdit && c && !prefilled) {
    setPrefilled(true);
    setName(c.name);
    setHandle(c.handle ?? "");
    setPlatform(c.primary_platform);
    setFollowerCount(c.follower_count != null ? String(c.follower_count) : "");
    setNiche(c.niche ?? "");
    setStage(c.stage);
    setNextFollowUpAt(c.next_follow_up_at);
    setNotes(c.notes ?? "");
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setErr("Name is required");
      return;
    }
    const input = {
      name: name.trim(),
      handle: handle.trim() || null,
      primaryPlatform: platform,
      followerCount: followerCount ? Number(followerCount) : null,
      niche: niche.trim() || null,
      stage,
      nextFollowUpAt,
      notes: notes.trim() || null,
    };
    setSaving(true);
    setErr(null);
    try {
      if (isEdit && contactId) {
        await updateOutreachContact(contactId, input);
        detail.refetch();
        onChanged();
      } else {
        await createOutreachContact(input);
        onChanged();
        onClose();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleLog = async () => {
    if (!contactId) return;
    setLogging(true);
    try {
      await logOutreachInteraction(contactId, logType, logNotes.trim() || null);
      setLogNotes("");
      detail.refetch();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to log interaction");
    } finally {
      setLogging(false);
    }
  };

  const handleDeleteInteraction = async (id: string) => {
    try {
      await deleteOutreachInteraction(id);
      detail.refetch();
      onChanged();
    } catch {
      // non-fatal — history entry just stays if this fails
    }
  };

  const handleDelete = async () => {
    if (!contactId) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteOutreachContact(contactId);
      onChanged();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete");
      setDeleting(false);
    }
  };

  const submitting = saving || deleting;

  return (
    <ModalShell width={520} onClose={submitting ? () => {} : onClose}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          {isEdit ? "Contact" : "New contact"}
        </div>
        <button
          onClick={onClose}
          disabled={submitting}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 18,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {isEdit && detail.loading ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-dim)",
            fontSize: 12,
          }}
        >
          Loading…
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={fieldLabel}>Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Person or page name'
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={fieldLabel}>Handle</div>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder='username (without @)'
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={fieldLabel}>Platform</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {OUTREACH_PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(platform === p ? null : p)}
                  style={chipStyle(platform === p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={fieldLabel}>Follower count</div>
            <input
              value={followerCount}
              onChange={(e) =>
                setFollowerCount(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder='e.g. 42000'
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={fieldLabel}>Niche</div>
            <input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder='Pokemon TCG, One Piece TCG, grading content…'
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={fieldLabel}>Stage</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {OUTREACH_STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStage(s)}
                  style={chipStyle(stage === s)}
                >
                  {STAGE_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={fieldLabel}>
              Follow up ({formatDate(nextFollowUpAt)})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {FOLLOW_UP_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setNextFollowUpAt(daysFromNow(p.days))}
                  style={chipStyle(false)}
                >
                  {p.label}
                </button>
              ))}
              {nextFollowUpAt && (
                <button
                  onClick={() => setNextFollowUpAt(null)}
                  style={chipStyle(false, true)}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={fieldLabel}>Notes</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='General notes about this relationship…'
              rows={3}
              style={{ ...inputStyle, resize: "vertical" as const }}
            />
          </div>

          {err && (
            <div style={{ fontSize: 11, color: "#e85f5f", marginBottom: 12 }}>
              {err}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={submitting}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              background: "var(--gold)",
              color: "var(--charcoal, #0E0E12)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              opacity: submitting ? 0.6 : 1,
              marginBottom: isEdit ? 16 : 0,
            }}
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add contact"}
          </button>

          {isEdit && c && (
            <>
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: 16,
                  marginBottom: 16,
                }}
              >
                {c.affiliate_id ? (
                  <div
                    style={{
                      background: "rgba(201,168,76,0.1)",
                      border: "1px solid rgba(201,168,76,0.35)",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--gold)",
                      }}
                    >
                      Affiliate active
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      {c.affiliateSignupCount ?? 0} signup
                      {c.affiliateSignupCount === 1 ? "" : "s"} attributed
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConvertOpen(true)}
                    style={{
                      width: "100%",
                      padding: "9px 0",
                      borderRadius: 8,
                      border: "1px solid var(--gold)",
                      background: "transparent",
                      color: "var(--gold)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Create affiliate code
                  </button>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ ...fieldLabel, marginBottom: 8 }}>
                  Log an interaction
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  {INTERACTION_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setLogType(t)}
                      style={chipStyle(logType === t)}
                    >
                      {INTERACTION_LABEL[t]}
                    </button>
                  ))}
                </div>
                <input
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder='What happened (optional)'
                  style={{ ...inputStyle, marginBottom: 8 }}
                />
                <button
                  onClick={handleLog}
                  disabled={logging}
                  style={{
                    width: "100%",
                    padding: "8px 0",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--surface-2)",
                    color: "var(--text-primary)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {logging ? "Logging…" : "Log interaction"}
                </button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ ...fieldLabel, marginBottom: 8 }}>
                  History ({detail.data?.interactions.length ?? 0})
                </div>
                {(detail.data?.interactions.length ?? 0) === 0 ? (
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    No interactions logged yet.
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {detail.data!.interactions.map((i) => (
                      <div
                        key={i.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          background: "var(--surface-2)",
                          borderRadius: 6,
                          padding: "6px 10px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--gold)",
                          }}
                        >
                          {INTERACTION_LABEL[i.type]}
                        </span>
                        <span
                          data-ph-mask
                          style={{
                            fontSize: 11,
                            color: "var(--text-secondary)",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {i.notes || "—"}
                        </span>
                        <span
                          style={{ fontSize: 10, color: "var(--text-dim)" }}
                        >
                          {relativeTime(i.occurred_at)}
                        </span>
                        <button
                          onClick={() => handleDeleteInteraction(i.id)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--text-dim)",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}
              >
                <button
                  onClick={handleDelete}
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "8px 0",
                    borderRadius: 8,
                    border: "1px solid #e85f5f55",
                    background: "transparent",
                    color: "#e85f5f",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {deleting
                    ? "Deleting…"
                    : confirmDelete
                      ? "Click again to confirm delete"
                      : "Delete contact"}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {isEdit && c && convertOpen && (
        <ConvertModal
          contact={c}
          onClose={() => setConvertOpen(false)}
          onConverted={() => {
            detail.refetch();
            onChanged();
          }}
        />
      )}
    </ModalShell>
  );
}

// ─── Convert to affiliate ───────────────────────────────────────────────────

function ConvertModal({
  contact,
  onClose,
  onConverted,
}: {
  contact: OutreachContact;
  onClose: () => void;
  onConverted: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<
    ConvertToAffiliateResult["invite"] | null
  >(null);

  const handleConvert = async () => {
    setSaving(true);
    setErr(null);
    try {
      const res = await convertOutreachToAffiliate(contact.id, {
        name: contact.name,
        slug: slug.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        instagram:
          contact.primary_platform === "instagram"
            ? (contact.handle ?? undefined)
            : undefined,
      });
      setResult(res.invite);
      onConverted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to convert");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell width={440} onClose={saving ? () => {} : onClose}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: 4,
        }}
      >
        {result ? "Code created" : "Create affiliate code"}
      </div>

      {!result ? (
        <>
          <div
            style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 16 }}
          >
            Creates a real affiliate record for {contact.name} in the same
            system your existing codes use, and sends them a claim link to set
            up their account.
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={fieldLabel}>
              Code / slug (optional — auto-generated if blank)
            </div>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder='e.g. cardqueen'
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={fieldLabel}>Contact email</div>
            <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder='Needed to email their invite'
              style={inputStyle}
            />
            <div
              style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 6 }}
            >
              No email? You can still create the code and send the claim link
              yourself — it&apos;ll be shown after.
            </div>
          </div>

          {err && (
            <div style={{ fontSize: 11, color: "#e85f5f", marginBottom: 12 }}>
              {err}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              disabled={saving}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConvert}
              disabled={saving}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                border: "none",
                background: "var(--gold)",
                color: "var(--charcoal, #0E0E12)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Creating…" : "Create code"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              background: result.emailed
                ? "rgba(16,185,129,0.1)"
                : "rgba(245,158,11,0.1)",
              border: `1px solid ${result.emailed ? "#10B98155" : "#F59E0B55"}`,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: result.emailed ? "#10B981" : "#F59E0B",
              }}
            >
              {result.emailed
                ? "Invite emailed"
                : contactEmail
                  ? "Code created — invite email failed"
                  : "Code created — no email on file"}
            </div>
            {result.emailError && (
              <div
                style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}
              >
                {result.emailError}
              </div>
            )}
          </div>

          {!result.emailed && (
            <div style={{ marginBottom: 16 }}>
              <div style={fieldLabel}>
                Claim link — send this to them yourself
              </div>
              <div
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-primary)",
                    wordBreak: "break-all" as const,
                  }}
                >
                  {result.claimUrl}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "9px 0",
              borderRadius: 8,
              border: "none",
              background: "var(--gold)",
              color: "var(--charcoal, #0E0E12)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Done
          </button>
        </>
      )}
    </ModalShell>
  );
}
