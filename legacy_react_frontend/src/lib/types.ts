export type Prediction = "legitimate" | "suspicious" | "high_risk";

export interface ScanResult {
  id: string;
  url: string;
  scannedAt: string; // ISO
  prediction: Prediction;
  riskScore: number; // 0-100
  features: Record<string, string | number | boolean | null>;
  reasons: string[];
  /** true only for clearly-labelled sample data */
  isSample?: boolean;
}

export const PREDICTION_LABEL: Record<Prediction, string> = {
  legitimate: "Legitimate",
  suspicious: "Suspicious",
  high_risk: "High Risk",
};
