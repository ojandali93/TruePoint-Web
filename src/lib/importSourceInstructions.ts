/**
 * Per-source export instructions — Phase 4.5/W2. Byte-identical data to
 * mobile's src/lib/importSourceInstructions.ts (same `icon` string keys,
 * same copy) — each platform maps `icon` through its own icon library
 * (lucide-react-native there, lucide-react here) rather than duplicating
 * the copy itself.
 *
 * Content rule (Collectr, the only wired source): describe Collectr's own
 * UI in words, never in screenshots — their copyright, and screenshots rot
 * on their redesigns. Menu names are written resiliently ("Settings" /
 * "Data Exports") because Collectr can rename them without telling us.
 */

export type ImportInstructionIcon = "settings" | "export" | "share";

export interface ImportSourceStep {
  icon: ImportInstructionIcon;
  title: string;
  detail: string;
}

export interface ImportSourceInstructions {
  key: string;
  label: string;
  /** false = picker row is disabled; this entry is a forward-looking stub. */
  available: boolean;
  /** Shown instead of steps when available is false. */
  comingSoonNote?: string;
  intro?: string;
  steps: ImportSourceStep[];
  /** Fine print under the steps — e.g. paid-tier requirements. */
  footerNote?: string;
}

export const IMPORT_SOURCE_INSTRUCTIONS: Record<string, ImportSourceInstructions> = {
  collectr: {
    key: "collectr",
    label: "Collectr",
    available: true,
    intro:
      "Export your collection from Collectr as a CSV, then bring that file back here.",
    steps: [
      {
        icon: "settings",
        title: "Open Data Exports",
        detail:
          "In Collectr, go to Settings and look for Data Exports. Exact menu names may vary with app updates.",
      },
      {
        icon: "export",
        title: "Export as CSV",
        detail: "Choose CSV as the export format and start the export.",
      },
      {
        icon: "share",
        title: "Save it somewhere you can reach",
        detail:
          "Save the file to your computer, or share it to a place you can browse from here — either way, you'll pick it in the next step.",
      },
    ],
    footerNote: "Exporting may require Collectr's paid tier.",
  },

  tcgplayer: {
    key: "tcgplayer",
    label: "TCGplayer",
    available: false,
    comingSoonNote: "TCGplayer import is coming soon.",
    steps: [],
  },

  collx: {
    key: "collx",
    label: "CollX",
    available: false,
    comingSoonNote: "CollX import is coming soon.",
    steps: [],
  },
};
