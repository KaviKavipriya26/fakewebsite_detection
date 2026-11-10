import { useSyncExternalStore } from "react";
import type { ScanResult } from "./types";
import { SAMPLE_SCANS } from "./mock-data";

const SCANS_KEY = "frauddetect.scans";
const SETTINGS_KEY = "frauddetect.settings";

export interface Settings {
  theme: "dark" | "light";
  saveHistory: boolean;
  historyLimit: number;
  showSampleData: boolean;
}
export const DEFAULT_SETTINGS: Settings = { theme: "dark", saveHistory: true, historyLimit: 200, showSampleData: false };

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = () => l();
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
};

let scansCache: { raw: string | null; value: ScanResult[] } = { raw: null, value: [] };
function readScans(): ScanResult[] {
  const raw = localStorage.getItem(SCANS_KEY);
  if (raw !== scansCache.raw) {
    try { scansCache = { raw, value: raw ? JSON.parse(raw) : [] }; } catch { scansCache = { raw, value: [] }; }
  }
  return scansCache.value;
}
let settingsCache: { raw: string | null; value: Settings } = { raw: null, value: DEFAULT_SETTINGS };
function readSettings(): Settings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (raw !== settingsCache.raw) {
    try { settingsCache = { raw, value: { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) } }; } catch { settingsCache = { raw, value: DEFAULT_SETTINGS }; }
  }
  return settingsCache.value;
}
const EMPTY: ScanResult[] = [];

export const useRealScans = () => useSyncExternalStore(subscribe, readScans, () => EMPTY);
export const useSettings = () => useSyncExternalStore(subscribe, readSettings, () => DEFAULT_SETTINGS);

/** Real scans, or labelled samples when the user enabled them and has no real data */
export function useScans(): { scans: ScanResult[]; isSample: boolean } {
  const real = useRealScans();
  const settings = useSettings();
  if (real.length === 0 && settings.showSampleData) return { scans: SAMPLE_SCANS, isSample: true };
  return { scans: real, isSample: false };
}

export function addScan(s: ScanResult) {
  const settings = readSettings();
  if (!settings.saveHistory) return;
  const next = [s, ...readScans()].slice(0, settings.historyLimit);
  localStorage.setItem(SCANS_KEY, JSON.stringify(next));
  emit();
}
export function deleteScan(id: string) {
  localStorage.setItem(SCANS_KEY, JSON.stringify(readScans().filter((s) => s.id !== id)));
  emit();
}
export function clearScans() { localStorage.removeItem(SCANS_KEY); emit(); }
export function updateSettings(patch: Partial<Settings>) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...readSettings(), ...patch }));
  emit();
}
export function findScan(id: string): ScanResult | undefined {
  return readScans().find((s) => s.id === id) ?? SAMPLE_SCANS.find((s) => s.id === id);
}

export function scansToCsv(scans: ScanResult[]): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["URL", "Scan date", "Prediction", "Risk score", "Reasons"]];
  for (const s of scans) rows.push([s.url, s.scannedAt, s.prediction, String(s.riskScore), s.reasons.join("; ")]);
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}
export function downloadFile(name: string, content: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
