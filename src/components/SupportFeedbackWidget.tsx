/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// src/components/SupportFeedbackWidget.tsx
//
// A self-contained floating "Help" button + modal for submitting feedback OR
// support. Drop it in once in your authenticated layout (e.g. app/(app)/layout.tsx):
//
//     import SupportFeedbackWidget from "@/components/SupportFeedbackWidget";
//     ...
//     <SupportFeedbackWidget />
//
// Posts to POST /feedback { category, message, app_version, platform, contact_email }.
// No external icon deps. Match `api` to however you import your axios client
// elsewhere (FeedbackModal uses `import api from "@/lib/api"`).

import { useState } from "react";
import api from "@/lib/api";

const APP_VERSION = "1.0.0"; // or import from your version constant

type Category = "support" | "bug" | "feature" | "general";

const CATEGORIES: { key: Category; label: string; hint: string }[] = [
  {
    key: "support",
    label: "Get help",
    hint: "Something's broken or you're stuck",
  },
  { key: "bug", label: "Report a bug", hint: "Something isn't working right" },
  {
    key: "feature",
    label: "Request a feature",
    hint: "An idea to make it better",
  },
  { key: "general", label: "General feedback", hint: "Anything else" },
];

const GOLD = "#C9A961";

export default function SupportFeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("support");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCategory("support");
    setMessage("");
    setEmail("");
    setError(null);
    setDone(false);
  };

  const close = () => {
    setOpen(false);
    // small delay so the closing animation (if any) doesn't show a reset flash
    setTimeout(reset, 200);
  };

  const submit = async () => {
    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await api.post("/feedback", {
        category,
        message: message.trim(),
        app_version: APP_VERSION,
        platform: "web",
        contact_email: email.trim() || undefined,
      });
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Couldn't send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label='Help & feedback'
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 900,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            borderRadius: 999,
            border: "none",
            background: GOLD,
            color: "#0D0E11",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
          }}
        >
          <svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
            <path
              d='M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.6A8.5 8.5 0 1 1 21 11.5Z'
              stroke='#0D0E11'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
          Help
        </button>
      )}

      {/* Modal */}
      {open && (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              background: "#141519",
              border: "1px solid #2a2b30",
              borderRadius: 16,
              padding: 20,
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            {done ? (
              <div style={{ textAlign: "center", padding: "16px 8px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>
                  Thanks — we got it.
                </div>
                <p style={{ color: "#9aa0a6", marginTop: 8 }}>
                  {category === "support"
                    ? "Our team will follow up by email if needed."
                    : "We read every note. Appreciate you taking the time."}
                </p>
                <button
                  onClick={close}
                  style={{
                    marginTop: 16,
                    padding: "10px 20px",
                    borderRadius: 999,
                    border: "none",
                    background: GOLD,
                    color: "#0D0E11",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 18, color: "#fff" }}>
                    Help & feedback
                  </h2>
                  <button
                    onClick={close}
                    aria-label='Close'
                    style={{
                      background: "none",
                      border: "none",
                      color: "#9aa0a6",
                      fontSize: 22,
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    margin: "14px 0",
                  }}
                >
                  {CATEGORIES.map((c) => {
                    const active = c.key === category;
                    return (
                      <button
                        key={c.key}
                        onClick={() => setCategory(c.key)}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: `1px solid ${active ? GOLD : "#2a2b30"}`,
                          background: active
                            ? "rgba(201,169,97,0.12)"
                            : "#1a1b20",
                          color: active ? GOLD : "#e6e7e9",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {c.label}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9aa0a6",
                            marginTop: 2,
                          }}
                        >
                          {c.hint}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    category === "support"
                      ? "Describe what's happening and what you expected…"
                      : "What's on your mind?"
                  }
                  rows={5}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#0f1013",
                    border: "1px solid #2a2b30",
                    borderRadius: 10,
                    color: "#fff",
                    padding: 12,
                    fontSize: 14,
                    resize: "vertical",
                  }}
                />

                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='Email for a reply (optional)'
                  inputMode='email'
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    marginTop: 10,
                    background: "#0f1013",
                    border: "1px solid #2a2b30",
                    borderRadius: 10,
                    color: "#fff",
                    padding: 12,
                    fontSize: 14,
                  }}
                />

                {error && (
                  <p style={{ color: "#ff6b6b", fontSize: 13, marginTop: 10 }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={submit}
                  disabled={sending}
                  style={{
                    width: "100%",
                    marginTop: 14,
                    padding: 13,
                    borderRadius: 999,
                    border: "none",
                    background: GOLD,
                    color: "#0D0E11",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: sending ? "default" : "pointer",
                    opacity: sending ? 0.7 : 1,
                  }}
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
