/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * FeedbackModal — in-app feedback form.
 *
 * Mirrors mobile's useSubmitFeedback contract:
 *   POST /feedback { category, message, app_version, platform }
 *
 * Categories match the backend schema exactly: bug / feature / general / other.
 *
 * Submits → shows a success state → auto-closes after a brief beat. Errors
 * stay visible until the user retries or closes.
 */

import { useState } from "react";
import api from "../lib/api";

type Category = "bug" | "feature" | "general" | "other";

const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: "bug", label: "Bug report", icon: "🐛" },
  { key: "feature", label: "Feature request", icon: "✨" },
  { key: "general", label: "General feedback", icon: "💬" },
  { key: "other", label: "Other", icon: "•" },
];

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "web";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [category, setCategory] = useState<Category>("general");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setCategory("general");
    setMessage("");
    setDone(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/feedback", {
        category,
        message: message.trim(),
        app_version: APP_VERSION,
        platform: "web",
      });
      setDone(true);
      // Auto-close after a beat
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Couldn't send. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 32,
          maxWidth: 480,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: "var(--gold)",
                letterSpacing: "0.1em",
                fontFamily: "DM Mono, monospace",
                marginBottom: 4,
              }}
            >
              FEEDBACK
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Send us a note
            </h2>
          </div>
          <button
            onClick={handleClose}
            aria-label='Close'
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "var(--text-dim)",
              fontSize: 18,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ×
          </button>
        </div>

        {done ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div
              style={{
                fontSize: 15,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              Thanks for the feedback
            </div>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
              We&apos;ve received your note.
            </div>
          </div>
        ) : (
          <>
            {/* Category pills */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Category</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type='button'
                    onClick={() => setCategory(c.key)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: `1px solid ${category === c.key ? "var(--gold)" : "var(--border)"}`,
                      background:
                        category === c.key
                          ? "rgba(201,168,76,0.12)"
                          : "var(--surface-2)",
                      color:
                        category === c.key
                          ? "var(--gold)"
                          : "var(--text-secondary)",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{c.icon}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder='Tell us what you found, what would help, or what just feels off...'
                rows={6}
                maxLength={5000}
                style={{
                  width: "100%",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "10px 13px",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: 1.5,
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-dim)",
                  marginTop: 4,
                  textAlign: "right",
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {message.length} / 5000
              </div>
            </div>

            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--red)",
                  marginBottom: 12,
                  padding: "8px 12px",
                  background: "rgba(201,76,76,0.08)",
                  borderRadius: 6,
                  border: "1px solid rgba(201,76,76,0.3)",
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                onClick={handleClose}
                style={{
                  padding: "10px 18px",
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
                onClick={submit}
                disabled={saving || !message.trim()}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "1px solid var(--gold)",
                  background:
                    saving || !message.trim()
                      ? "rgba(201,168,76,0.15)"
                      : "var(--gold)",
                  color:
                    saving || !message.trim() ? "var(--text-dim)" : "#0D0E11",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: saving || !message.trim() ? "default" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {saving ? "Sending..." : "Send feedback"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  color: "var(--text-dim)",
  letterSpacing: "0.08em",
  marginBottom: 8,
  fontFamily: "DM Mono, monospace",
};
