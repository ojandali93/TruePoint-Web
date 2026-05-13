"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCollections,
  Collection,
} from "../../../../context/CollectionContext";
import { ROUTES } from "../../../../constants/routes";

const COLORS = [
  "#C9A84C",
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#EF4444",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
];

function CollectionCard({
  collection,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  collection: Collection;
  onEdit: (c: Collection) => void;
  onDelete: (c: Collection) => void;
  onSetDefault: (id: string) => void;
}) {
  const { setActiveCollectionId } = useCollections();
  const router = useRouter();

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${collection.is_default ? collection.color + "60" : "var(--border)"}`,
        borderRadius: 14,
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      {/* Color dot */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: collection.color + "22",
          border: `2px solid ${collection.color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 16 }}>◈</span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            {collection.name}
          </span>
          {collection.is_default && (
            <span
              style={{
                fontSize: 10,
                padding: "2px 7px",
                borderRadius: 4,
                background: "rgba(201,168,76,0.15)",
                color: "var(--gold)",
                fontFamily: "DM Mono, monospace",
              }}
            >
              DEFAULT
            </span>
          )}
        </div>
        {collection.description && (
          <div
            style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}
          >
            {collection.description}
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 11,
            color: "var(--text-dim)",
          }}
        >
          <span>{collection.itemCount} items</span>
          {collection.totalValue > 0 && (
            <span style={{ color: "var(--gold)" }}>
              $
              {collection.totalValue.toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexShrink: 0,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={() => {
            setActiveCollectionId(collection.id);
            router.push(ROUTES.INVENTORY);
          }}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "none",
            background: collection.color,
            color: "#0D0E11",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          View
        </button>
        {!collection.is_default && (
          <button
            onClick={() => onSetDefault(collection.id)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Set Default
          </button>
        )}
        <button
          onClick={() => onEdit(collection)}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Edit
        </button>
        {!collection.is_default && (
          <button
            onClick={() => onDelete(collection)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid rgba(201,76,76,0.3)",
              background: "transparent",
              color: "var(--red)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function CollectionModal({
  existing,
  onClose,
  onSaved,
}: {
  existing?: Collection | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { createCollection, updateCollection } = useCollections();
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [color, setColor] = useState(existing?.color ?? COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (existing) {
        await updateCollection(existing.id, { name, description, color });
      } else {
        await createCollection({ name, description, color });
      }
      onSaved();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to save collection",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 28,
          width: 400,
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 20,
          }}
        >
          {existing ? "Edit Collection" : "New Collection"}
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-dim)",
              marginBottom: 6,
              fontFamily: "DM Mono, monospace",
            }}
          >
            NAME
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. Trade Binder, Personal Collection'
            autoFocus
            style={{
              width: "100%",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
              color: "var(--text-primary)",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-dim)",
              marginBottom: 6,
              fontFamily: "DM Mono, monospace",
            }}
          >
            DESCRIPTION (OPTIONAL)
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's in this collection?"
            style={{
              width: "100%",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
              color: "var(--text-primary)",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
        </div>

        {/* Color */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-dim)",
              marginBottom: 8,
              fontFamily: "DM Mono, monospace",
            }}
          >
            COLOR
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: c,
                  border: `3px solid ${color === c ? "#fff" : "transparent"}`,
                  cursor: "pointer",
                  outline: color === c ? `2px solid ${c}` : "none",
                  outlineOffset: 1,
                }}
              />
            ))}
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(201,76,76,0.1)",
              border: "1px solid rgba(201,76,76,0.3)",
              fontSize: 12,
              color: "var(--red)",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
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
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              background: color,
              color: "#0D0E11",
              fontSize: 13,
              fontWeight: 500,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {saving
              ? "Saving…"
              : existing
                ? "Save Changes"
                : "Create Collection"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  const { collections, loading, reload, deleteCollection, setDefault } =
    useCollections();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Collection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (strategy: "reassign" | "delete") => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCollection(deleteTarget.id, strategy);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: "var(--gold)",
              letterSpacing: "0.1em",
              fontFamily: "DM Mono, monospace",
              marginBottom: 8,
            }}
          >
            INVENTORY
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            Collections
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Organize your cards into separate collections — personal, trade
            stock, sealed inventory, and more.
          </p>
        </div>
        <button
          onClick={() => {
            setEditTarget(null);
            setShowModal(true);
          }}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: "var(--gold)",
            color: "#0D0E11",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
            flexShrink: 0,
          }}
        >
          + New Collection
        </button>
      </div>

      {/* Plan info */}
      <div
        style={{
          background: "rgba(201,168,76,0.06)",
          border: "1px solid rgba(201,168,76,0.2)",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 24,
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        Collector plan: 1 collection · Pro plan: 3 collections ·{" "}
        <a
          href={ROUTES.SETTINGS_BILLING}
          style={{ color: "var(--gold)", textDecoration: "none" }}
        >
          Upgrade
        </a>
      </div>

      {/* Collections list */}
      {loading ? (
        <div
          style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}
        >
          Loading…
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {collections.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              onEdit={(c) => {
                setEditTarget(c);
                setShowModal(true);
              }}
              onDelete={setDeleteTarget}
              onSetDefault={setDefault}
            />
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {showModal && (
        <CollectionModal
          existing={editTarget}
          onClose={() => {
            setShowModal(false);
            setEditTarget(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditTarget(null);
            reload();
          }}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 28,
              width: 400,
              maxWidth: "90vw",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              Delete &quot;{deleteTarget.name}&quot;?
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginBottom: 24,
              }}
            >
              This collection has {deleteTarget.itemCount} items. What should
              happen to them?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => handleDelete("reassign")}
                disabled={deleting}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: 2 }}>
                  Move items to default collection
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  Items stay in your inventory, moved to your default collection
                </div>
              </button>
              <button
                onClick={() => handleDelete("delete")}
                disabled={deleting}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(201,76,76,0.3)",
                  background: "transparent",
                  color: "var(--red)",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: 2 }}>
                  Delete everything
                </div>
                <div
                  style={{ fontSize: 11, color: "var(--red)", opacity: 0.7 }}
                >
                  Permanently delete all items in this collection
                </div>
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: "10px 0",
                  borderRadius: 10,
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
