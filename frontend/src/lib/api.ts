/**
 * API service for the Django REST backend.
 * Configure with VITE_API_BASE_URL (e.g. http://localhost:8000).
 * Expected endpoint: POST {base}/api/scan/  body: { url }
 * Response: { url, prediction, risk_score, features, reasons }
 */
import type { Prediction, ScanResult } from "./types";

export const API_BASE_URL = (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";
export const SCAN_PATH = (import.meta.env["VITE_API_SCAN_PATH"] as string | undefined) ?? "/api/scan/";

export const isBackendConfigured = () => API_BASE_URL.length > 0;

export class BackendNotConnectedError extends Error {
  constructor() {
    super("The ML backend is not connected. Set VITE_API_BASE_URL to your Django REST API.");
  }
}

function normalizePrediction(raw: unknown, score: number): Prediction {
  const s = String(raw ?? "").toLowerCase().replace(/[\s-]/g, "_");
  if (s.includes("high")) return "high_risk";
  if (s.includes("legit") || s === "safe" || s === "benign" || s === "0") return "legitimate";
  if (s.includes("suspic") || s.includes("phish") || s.includes("fraud") || s === "1") return score >= 75 ? "high_risk" : "suspicious";
  return score >= 75 ? "high_risk" : score >= 40 ? "suspicious" : "legitimate";
}

export async function scanUrl(url: string, signal?: AbortSignal): Promise<ScanResult> {
  if (!isBackendConfigured()) throw new BackendNotConnectedError();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${SCAN_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ url }),
      signal: signal ?? null,
    });
  } catch {
    throw new Error("Could not reach the backend. Check that the Django server is running and CORS is enabled.");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Backend returned ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  }
  const data = await res.json();
  let score = Number(data.risk_score ?? data.riskScore ?? data.score ?? 0);
  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    id: crypto.randomUUID(),
    url: data.url ?? url,
    scannedAt: new Date().toISOString(),
    prediction: normalizePrediction(data.prediction ?? data.label ?? data.result, score),
    riskScore: score,
    features: (data.features && typeof data.features === "object" ? data.features : {}) as ScanResult["features"],
    reasons: Array.isArray(data.reasons) ? data.reasons.map(String) : [],
  };
}
