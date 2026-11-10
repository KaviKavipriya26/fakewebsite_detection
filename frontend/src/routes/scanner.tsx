import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, ScanSearch, AlertCircle, RotateCcw, Microscope } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Page, Panel, BackendBanner } from "@/components/app/ui-bits";
import { ScanResultView } from "@/components/app/ScanResultView";
import { scanUrl, isBackendConfigured } from "@/lib/api";
import { validateUrl } from "@/lib/url-validate";
import { addScan } from "@/lib/store";
import type { ScanResult } from "@/lib/types";

export const Route = createFileRoute("/scanner")({
  validateSearch: (s: Record<string, unknown>): { url?: string } => (typeof s["url"] === "string" ? { url: s["url"] } : {}),
  head: () => ({
    meta: [
      { title: "Website Scanner — FraudGuard" },
      { name: "description", content: "Scan a website URL with machine learning to detect phishing and fraud." },
      { property: "og:title", content: "Website Scanner — FraudGuard" },
      { property: "og:description", content: "Check any URL for phishing and fraud risk." },
    ],
  }),
  component: Scanner,
});

const STAGES = ["Validating URL", "Sending to ML backend", "Extracting URL features", "Running prediction"];

function Scanner() {
  const { url: initial } = Route.useSearch();
  const [url, setUrl] = useState(initial ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [connected, setConnected] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setConnected(isBackendConfigured()), []);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const v = validateUrl(url);
    if (!v.ok) { setFieldError(v.error); return; }
    setFieldError(null);
    if (!connected) { setError("The ML backend is not connected, so no prediction can be made."); return; }
    setLoading(true);
    setStage(0);
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 700);
    abortRef.current = new AbortController();
    try {
      const r = await scanUrl(v.url, abortRef.current.signal);
      addScan(r);
      setResult(r);
      toast.success("Scan complete");
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }

  return (
    <Page title="Website Scanner" description="Enter a website URL to check it for phishing and fraud indicators.">
      <div className="space-y-6">
        {!connected && <BackendBanner />}
        <Panel className="relative overflow-hidden">
          <form onSubmit={onSubmit} noValidate className="space-y-3">
            <Label htmlFor="url">Website URL</Label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input id="url" type="url" inputMode="url" autoComplete="off" placeholder="https://example.com"
                value={url} onChange={(e) => { setUrl(e.target.value); setFieldError(null); }}
                aria-invalid={!!fieldError} aria-describedby={fieldError ? "url-error" : "url-help"}
                className="h-12 font-mono" disabled={loading} />
              <Button type="submit" size="lg" className="h-12 bg-gradient-primary shadow-glow hover:opacity-90" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin" /> Scanning…</> : <><ScanSearch /> Scan Website</>}
              </Button>
            </div>
            {fieldError
              ? <p id="url-error" className="flex items-center gap-1.5 text-sm text-danger"><AlertCircle className="h-4 w-4" />{fieldError}</p>
              : <p id="url-help" className="text-xs text-muted-foreground">Supports http and https. If you omit the scheme, http:// is assumed.</p>}
          </form>
          {loading && (
            <div className="mt-6" aria-live="polite">
              <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-primary animate-scan-line" />
              </div>
              <ol className="mt-4 grid gap-2 sm:grid-cols-4">
                {STAGES.map((s, i) => (
                  <li key={s} className={`flex items-center gap-2 text-xs ${i <= stage ? "text-foreground" : "text-muted-foreground"}`}>
                    {i < stage ? <span className="h-2 w-2 rounded-full bg-success" /> : i === stage ? <Loader2 className="h-3 w-3 animate-spin text-primary" /> : <span className="h-2 w-2 rounded-full bg-muted" />}
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Panel>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <div className="flex-1"><p className="font-semibold">Scan failed</p><p className="mt-1 text-muted-foreground">{error}</p></div>
            {connected && <Button variant="outline" size="sm" onClick={(e) => onSubmit(e as unknown as React.FormEvent)}><RotateCcw /> Retry</Button>}
          </div>
        )}

        {result && (
          <>
            <ScanResultView result={result} />
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline"><Link to="/analysis" search={{ id: result.id }}><Microscope /> Full URL analysis</Link></Button>
              <Button variant="ghost" onClick={() => { setResult(null); setUrl(""); }}><RotateCcw /> Scan another</Button>
            </div>
          </>
        )}
      </div>
    </Page>
  );
}
