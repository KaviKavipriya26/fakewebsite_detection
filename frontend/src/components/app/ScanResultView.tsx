import { CheckCircle2, Info, XCircle } from "lucide-react";
import type { ScanResult } from "@/lib/types";
import { Panel, StatusBadge, WarningBanner, riskBg, riskColor } from "./ui-bits";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const pretty = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const FEATURE_HELP: Record<string, string> = {
  https: "Encrypted connection. Phishing sites often skip HTTPS, though many now use it too.",
  url_length: "Very long URLs are often used to hide the real destination.",
  special_chars: "Characters like @, -, _, % and = are common in obfuscated URLs.",
  domain_age_days: "Newly registered domains are frequently used for fraud.",
  redirects: "Multiple redirects can hide where you are actually sent.",
  suspicious_keywords: "Words like login, verify, secure, bank, update are common in phishing.",
  has_ip_address: "A raw IP address instead of a domain name is a strong phishing signal.",
};

function featureRisk(k: string, v: ScanResult["features"][string]): "good" | "bad" | "neutral" {
  if (typeof v === "boolean") {
    if (k.includes("https") || k.includes("ssl")) return v ? "good" : "bad";
    return v ? "bad" : "good";
  }
  if (typeof v === "number") {
    if (k.includes("age")) return v < 180 ? "bad" : "good";
    if (k.includes("length")) return v > 75 ? "bad" : "good";
    if (k.includes("redirect") || k.includes("keyword") || k.includes("special")) return v > 2 ? "bad" : v > 0 ? "neutral" : "good";
  }
  return "neutral";
}

export function FeatureGrid({ features }: { features: ScanResult["features"] }) {
  const entries = Object.entries(features);
  if (!entries.length) return <p className="text-sm text-muted-foreground">The backend did not return any URL features for this scan.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([k, v]) => {
        const r = featureRisk(k, v);
        const Icon = r === "good" ? CheckCircle2 : r === "bad" ? XCircle : Info;
        return (
          <div key={k} className="flex items-start gap-3 rounded-lg border bg-background/40 p-3">
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", r === "good" ? "text-success" : r === "bad" ? "text-danger" : "text-muted-foreground")} aria-hidden />
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {pretty(k)}
                {FEATURE_HELP[k] && (
                  <Tooltip>
                    <TooltipTrigger aria-label={`About ${pretty(k)}`}><Info className="h-3 w-3" /></TooltipTrigger>
                    <TooltipContent className="max-w-xs">{FEATURE_HELP[k]}</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="truncate font-mono text-sm font-semibold">{typeof v === "boolean" ? (v ? "Yes" : "No") : String(v ?? "—")}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ScanResultView({ result }: { result: ScanResult }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <WarningBanner prediction={result.prediction} />
      <Panel>
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="relative grid h-32 w-32 shrink-0 place-items-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-muted" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${result.riskScore} 100`} className={riskColor(result.riskScore)} />
            </svg>
            <div className="text-center">
              <p className={cn("font-display text-3xl font-bold", riskColor(result.riskScore))}>{result.riskScore}</p>
              <p className="text-xs text-muted-foreground">risk score</p>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <StatusBadge prediction={result.prediction} className="text-sm" />
            <p className="mt-3 break-all font-mono text-sm">{result.url}</p>
            <p className="mt-1 text-xs text-muted-foreground">Scanned {new Date(result.scannedAt).toLocaleString()}{result.isSample && " · sample data"}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-all duration-700", riskBg(result.riskScore))} style={{ width: `${result.riskScore}%` }} />
            </div>
          </div>
        </div>
      </Panel>
      <Panel title="Why this prediction?">
        {result.reasons.length ? (
          <ul className="space-y-2">
            {result.reasons.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{r}</li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">The backend did not return explanation reasons.</p>}
      </Panel>
      <Panel title="Detected URL features"><FeatureGrid features={result.features} /></Panel>
    </div>
  );
}
