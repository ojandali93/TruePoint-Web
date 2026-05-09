export interface BorderPositions {
  outerLeft: number;
  outerRight: number;
  outerTop: number;
  outerBottom: number;
  innerLeft: number;
  innerRight: number;
  innerTop: number;
  innerBottom: number;
}

export interface CenteringReport {
  id: string;
  userId: string;
  cardId: string | null;
  side: "front" | "back";
  imageWidth: number;
  imageHeight: number;
  dpi: number;
  rotation: number;
  borders: BorderPositions;
  measurements: {
    leftMm: number;
    rightMm: number;
    topMm: number;
    bottomMm: number;
  };
  percentages: {
    leftPct: number;
    rightPct: number;
    topPct: number;
    bottomPct: number;
    lrWorse: number;
    tbWorse: number;
    worstAxis: number;
  };
  truepointScore: number;
  grades: { psa: string; bgs: string; cgc: string; sgc: string; tag: string };
  createdAt: string;
}

export interface CenteringAnalysis {
  measurements: CenteringReport["measurements"];
  percentages: CenteringReport["percentages"];
  truepointScore: number;
  grades: CenteringReport["grades"];
}

export interface CenteringInput {
  cardId?: string | null;
  inventoryItemId?: string | null;
  side: "front" | "back";
  imageWidth: number;
  imageHeight: number;
  dpi: number;
  rotation: number;
  borders: BorderPositions;
  label?: string | null; // ← make sure this exists
  imageUrl?: string | null; // ← add this
}
