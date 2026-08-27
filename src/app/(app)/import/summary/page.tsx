"use client";

/**
 * Import Collection — post-commit summary. Web port of mobile's
 * summary.tsx. "Done" clears the import flow store (reset()) and returns
 * to Inventory — this page is the end of the wizard.
 */

import { ImportSummaryView } from "@/components/import/ImportSummaryView";
import { ImportStepHeader } from "@/components/import/ImportStepHeader";
import { ROUTES } from "@/constants/routes";
import { useImportFlowStore } from "@/stores/importFlow.store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ImportSummaryPage() {
  const router = useRouter();
  const commitResult = useImportFlowStore((s) => s.commitResult);
  const reset = useImportFlowStore((s) => s.reset);

  useEffect(() => {
    if (!commitResult) {
      router.replace(ROUTES.IMPORT);
    }
  }, [commitResult, router]);

  const handleDone = () => {
    reset();
    router.push(ROUTES.INVENTORY);
  };

  if (!commitResult) return null;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 24px" }}>
      <ImportStepHeader title="Import Complete" showBack={false} />

      <ImportSummaryView
        importedCount={commitResult.imported}
        portfolioValue={commitResult.portfolioValue}
        notImported={commitResult.notImported}
      />

      <button
        onClick={handleDone}
        style={{
          marginTop: 32,
          width: "100%",
          background: "var(--gold)",
          color: "#0D0E11",
          border: "none",
          borderRadius: 6,
          padding: "13px 20px",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Done
      </button>
    </div>
  );
}
