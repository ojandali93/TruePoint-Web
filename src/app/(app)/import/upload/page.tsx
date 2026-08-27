"use client";

/**
 * Import Collection — file upload, then parse/match progress. Web port of
 * mobile's upload.tsx: pick a .csv -> read its text (native File.text(),
 * no document-picker dependency needed on web) -> POST /import/parse ->
 * POST /import/match -> store both results (importFlow.store) -> push to
 * the review page. Every failure mode is a friendly state, not a crash.
 */

import { ImportStepHeader } from "@/components/import/ImportStepHeader";
import { ROUTES } from "@/constants/routes";
import { matchImportRows, parseImportCsv } from "@/hooks/useCsvImport";
import { useImportFlowStore } from "@/stores/importFlow.store";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Step = "idle" | "reading" | "parsing" | "matching" | "error";

export default function ImportUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startNewImport = useImportFlowStore((s) => s.startNewImport);
  const setParseResult = useImportFlowStore((s) => s.setParseResult);
  const setMatchResult = useImportFlowStore((s) => s.setMatchResult);

  const [step, setStep] = useState<Step>("idle");
  const [errorTitle, setErrorTitle] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const fail = (title: string, detail: string) => {
    setErrorTitle(title);
    setErrorDetail(detail);
    setStep("error");
  };

  const runImport = async (name: string, csvText: string) => {
    startNewImport(name, csvText);

    setStep("parsing");
    let parseResult;
    try {
      parseResult = await parseImportCsv(csvText);
    } catch (err: unknown) {
      fail(
        "Couldn't reach ReverseHolo",
        err instanceof Error ? err.message : "Check your connection and try again.",
      );
      return;
    }
    if (parseResult.rows.length === 0) {
      fail(
        "This file doesn't look right",
        parseResult.errors[0]?.message ??
          "We couldn't find any Pokémon or One Piece rows in this file. Make sure it's a Collectr collection export CSV.",
      );
      return;
    }
    setParseResult(parseResult);

    setStep("matching");
    try {
      const matchResult = await matchImportRows(parseResult.rows);
      setMatchResult(matchResult);
    } catch (err: unknown) {
      fail(
        "Couldn't reach ReverseHolo",
        err instanceof Error ? err.message : "Check your connection and try again.",
      );
      return;
    }

    router.push(ROUTES.IMPORT_REVIEW);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = "";
    if (!file) return;

    setFileName(file.name);

    const looksLikeCsv =
      file.name.toLowerCase().endsWith(".csv") || file.type.includes("csv");
    if (!looksLikeCsv) {
      fail(
        "That's not a CSV file",
        `"${file.name}" doesn't look like a CSV export. Export your collection from Collectr as a CSV and try again.`,
      );
      return;
    }

    setStep("reading");
    let csvText: string;
    try {
      csvText = await file.text();
    } catch (err: unknown) {
      fail(
        "Couldn't read that file",
        err instanceof Error ? err.message : "Please try picking it again.",
      );
      return;
    }

    if (csvText.trim() === "") {
      fail("This file is empty", `"${file.name}" doesn't have any rows in it.`);
      return;
    }

    await runImport(file.name, csvText);
  };

  const handleRetryPick = () => {
    setStep("idle");
    setErrorTitle("");
    setErrorDetail("");
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px" }}>
      <ImportStepHeader title="Import Collection" showBack={step === "idle" || step === "error"} />

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv,text/comma-separated-values"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        {step === "idle" && (
          <>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
              Choose your Collectr export
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 320, marginBottom: 24 }}>
              In Collectr: Settings → Data Exports → CSV. Then pick that file here.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--gold)",
                color: "#0D0E11",
                border: "none",
                borderRadius: 6,
                padding: "12px 32px",
                fontSize: 15,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D0E11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Choose file
            </button>
          </>
        )}

        {(step === "reading" || step === "parsing" || step === "matching") && (
          <>
            <div
              style={{
                width: 32,
                height: 32,
                border: "3px solid var(--border)",
                borderTopColor: "var(--gold)",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
                marginBottom: 20,
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontSize: 17, fontWeight: 500, color: "var(--text-primary)" }}>
              {step === "reading" && "Reading your file…"}
              {step === "parsing" && "Checking your file…"}
              {step === "matching" && "Matching against ReverseHolo's catalog…"}
            </div>
            {fileName && (
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>{fileName}</div>
            )}
          </>
        )}

        {step === "error" && (
          <>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                background: "var(--surface)",
                border: "1px solid var(--red)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
              {errorTitle}
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 340, marginBottom: 24 }}>
              {errorDetail}
            </p>
            <button
              onClick={handleRetryPick}
              style={{
                background: "transparent",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "10px 24px",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Choose a different file
            </button>
          </>
        )}
      </div>
    </div>
  );
}
