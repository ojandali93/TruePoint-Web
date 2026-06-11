/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "../../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type AffiliateType = "vendor" | "creator" | "page" | "event" | "other";

interface Affiliate {
  id: string;
  name: string;
  slug: string | null;
  type: AffiliateType;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  instagram: string | null;
  website: string | null;
  notes: string | null;
  active: boolean;
  signup_count?: number;
  created_at: string;
  updated_at: string;
}

interface FormState {
  name: string;
  type: AffiliateType;
  slug: string;
  instagram: string;
  website: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  type: "vendor",
  slug: "",
  instagram: "",
  website: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  notes: "",
  active: true,
};

const TYPE_OPTIONS: AffiliateType[] = [
  "vendor",
  "creator",
  "page",
  "event",
  "other",
];

const typeColor = (t: string) =>
  t === "vendor"
    ? "#3B82F6"
    : t === "creator"
      ? "#8B5CF6"
      : t === "page"
        ? "#10B981"
        : t === "event"
          ? "var(--gold)"
          : "#6B7280";

// ─── Shared bits (match the admin design language) ──────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  color: "var(--text-primary)",
  fontFamily: "inherit",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-dim)",
  marginBottom: 6,
  display: "block",
  fontFamily: "DM Mono, monospace",
  letterSpacing: "0.04em",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

function AffiliateModal({
  editingId,
  form,
  setForm,
  onClose,
  onSave,
  saving,
  error,
}: {
  editingId: string | null;
  form: FormState;
  setForm: (f: FormState) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
}) {
  const set = (k: keyof FormState, v: string | boolean) =>
    setForm({ ...form, [k]: v });

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
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
          width: 520,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 18,
          }}
        >
          {editingId ? "Edit affiliate" : "Add affiliate"}
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              padding: "9px 12px",
              fontSize: 12,
              color: "#EF4444",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label='NAME *'>
            <input
              style={inputStyle}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Joe's Cards"
              autoFocus
            />
          </Field>

          <div style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <Field label='TYPE'>
                <select
                  style={inputStyle}
                  value={form.type}
                  onChange={(e) => set("type", e.target.value as AffiliateType)}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                paddingBottom: 9,
              }}
            >
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {form.active ? "Active" : "Inactive"}
              </span>
              <button
                type='button'
                onClick={() => set("active", !form.active)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  background: form.active ? "#10B981" : "var(--surface-3)",
                  position: "relative",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    left: form.active ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>
          </div>

          <Field label='SLUG / REFERRAL CODE (optional)'>
            <input
              style={inputStyle}
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder='joes-cards'
            />
          </Field>

          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <Field label='INSTAGRAM'>
                <input
                  style={inputStyle}
                  value={form.instagram}
                  onChange={(e) => set("instagram", e.target.value)}
                  placeholder='@joescards'
                />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label='WEBSITE'>
                <input
                  style={inputStyle}
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder='joescards.com'
                />
              </Field>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <Field label='CONTACT NAME'>
                <input
                  style={inputStyle}
                  value={form.contact_name}
                  onChange={(e) => set("contact_name", e.target.value)}
                />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label='CONTACT EMAIL'>
                <input
                  style={inputStyle}
                  value={form.contact_email}
                  onChange={(e) => set("contact_email", e.target.value)}
                  placeholder='joe@joescards.com'
                />
              </Field>
            </div>
          </div>

          <Field label='CONTACT PHONE'>
            <input
              style={inputStyle}
              value={form.contact_phone}
              onChange={(e) => set("contact_phone", e.target.value)}
            />
          </Field>

          <Field label='NOTES (internal)'>
            <textarea
              style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              background: "var(--gold)",
              color: "#0D0E11",
              fontSize: 13,
              fontWeight: 500,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirm modal ───────────────────────────────────────────────────

function DeleteModal({
  target,
  onCancel,
  onConfirm,
  deleting,
}: {
  target: Affiliate;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
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
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
          width: 380,
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          Delete “{target.name}”?
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          {target.signup_count
            ? `${target.signup_count} signup${target.signup_count === 1 ? "" : "s"} are attributed to this affiliate. `
            : ""}
          Those signups keep their attribution label, so historical tracking is
          preserved — but this affiliate will no longer appear in the signup
          dropdown. This can&apos;t be undone.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 8,
              border: "none",
              background: "#EF4444",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              cursor: deleting ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManageAffiliatesPage() {
  const router = useRouter();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Affiliate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await api.get<{ data: Affiliate[] }>("/admin/affiliates");
      setAffiliates(r.data.data);
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to load affiliates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (a: Affiliate) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      type: a.type,
      slug: a.slug ?? "",
      instagram: a.instagram ?? "",
      website: a.website ?? "",
      contact_name: a.contact_name ?? "",
      contact_email: a.contact_email ?? "",
      contact_phone: a.contact_phone ?? "",
      notes: a.notes ?? "",
      active: a.active,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const save = async () => {
    if (form.name.trim().length < 2) {
      setFormError("Name is required (min 2 characters).");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      slug: form.slug.trim() || null,
      instagram: form.instagram.trim() || null,
      website: form.website.trim() || null,
      contact_name: form.contact_name.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      notes: form.notes.trim() || null,
      active: form.active,
    };
    try {
      if (editingId) {
        await api.patch(`/admin/affiliates/${editingId}`, payload);
      } else {
        await api.post("/admin/affiliates", payload);
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      setFormError(e?.message ?? "Failed to save affiliate");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/affiliates/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      // surface inline on the row list via loadError fallback
      setLoadError(e?.message ?? "Failed to delete affiliate");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const totalSignups = affiliates.reduce(
    (sum, a) => sum + (a.signup_count ?? 0),
    0,
  );

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              Manage Affiliates
            </h1>
            <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
              {affiliates.length} affiliate
              {affiliates.length === 1 ? "" : "s"} · {totalSignups} attributed
              signup{totalSignups === 1 ? "" : "s"}
            </div>
          </div>
          <button
            onClick={openCreate}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: "var(--gold)",
              color: "#0D0E11",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            + Add affiliate
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "28px 40px", maxWidth: 1200, margin: "0 auto" }}>
        {loadError && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#EF4444",
              marginBottom: 16,
            }}
          >
            {loadError}
          </div>
        )}

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {/* table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 90px 1.3fr 90px 90px 150px",
              padding: "10px 18px",
              background: "var(--surface-2)",
              borderBottom: "1px solid var(--border)",
              fontSize: 10,
              color: "var(--text-dim)",
              fontFamily: "DM Mono, monospace",
              letterSpacing: "0.06em",
            }}
          >
            <span>NAME</span>
            <span>TYPE</span>
            <span>CONTACT</span>
            <span>SIGNUPS</span>
            <span>STATUS</span>
            <span></span>
          </div>

          {loading ? (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                color: "var(--text-dim)",
              }}
            >
              Loading…
            </div>
          ) : affiliates.length === 0 ? (
            <div
              style={{
                padding: "48px 0",
                textAlign: "center",
                color: "var(--text-dim)",
                fontSize: 13,
              }}
            >
              No affiliates yet — add your first one to start tracking signups.
            </div>
          ) : (
            affiliates.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 90px 1.3fr 90px 90px 150px",
                  padding: "12px 18px",
                  borderBottom: "1px solid var(--border)",
                  alignItems: "center",
                  fontSize: 13,
                }}
              >
                <div>
                  <div
                    style={{ color: "var(--text-primary)", fontWeight: 500 }}
                  >
                    {a.name}
                  </div>
                  {a.slug && (
                    <div
                      style={{
                        color: "var(--text-dim)",
                        fontFamily: "DM Mono, monospace",
                        fontSize: 11,
                        marginTop: 2,
                      }}
                    >
                      {a.slug}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    color: typeColor(a.type),
                    fontFamily: "DM Mono, monospace",
                    fontSize: 11,
                    textTransform: "uppercase",
                  }}
                >
                  {a.type}
                </span>
                <span
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.instagram || a.contact_email || a.website || "—"}
                </span>
                <span
                  style={{
                    color: a.signup_count ? "var(--gold)" : "var(--text-dim)",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {a.signup_count ?? 0}
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    color: a.active ? "#10B981" : "var(--text-dim)",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: a.active ? "#10B981" : "var(--text-dim)",
                    }}
                  />
                  {a.active ? "Active" : "Inactive"}
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => openEdit(a)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(a)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 6,
                      border: "1px solid rgba(239,68,68,0.4)",
                      background: "transparent",
                      color: "#EF4444",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modalOpen && (
        <AffiliateModal
          editingId={editingId}
          form={form}
          setForm={setForm}
          onClose={() => setModalOpen(false)}
          onSave={save}
          saving={saving}
          error={formError}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={doDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}
