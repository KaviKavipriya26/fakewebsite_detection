import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Microscope, Lock, Ruler, Hash, Globe, Repeat, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScans } from "@/lib/store";
import { Page, Panel, EmptyState, SampleBanner, StatusBadge, WarningBanner } from "@/components/app/ui-bits";
import { FeatureGrid } from "@/components/app/ScanResultView";
import type { ScanResult } from "@/lib/types";

export const Route = createFileRoute("/analysis")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s["id"] === "string" ? { id: s["id"] } : {}),
  head: () => ({
    meta: [
      { title: "URL Analysis — FraudGuard" },
      { name: "description", content: "Detailed URL feature analysis: HTTPS, length, special characters, domain, redirects and keywords." },
      { property: "og:title", content: "URL Analysis — FraudGuard" },
      { property: "og:description", content: "See exactly which URL features drove the fraud prediction." },
    ],
  }),
  component: Analysis,
});

const KEY_CHECKS: { label: string; icon: typeof Lock; keys: string[]; explain: string }[] = [
  { label: "HTTPS status", icon: Lock, keys: ["https", "has_https", "ssl", "is_https"], explain: "Missing HTTPS means data is sent unencrypted." },
  { label: "URL length", icon: Ruler, keys: ["url_length", "length"], explain: "URLs over ~75 characters can hide the real destination." },
  { label: "Special characters", icon: Hash, keys: ["special_chars", "special_characters", "num_special_chars"], explain: "@, -, %, = and similar are used to obfuscate URLs." },
  { label: "Domain information", icon: Globe, keys: ["domain_age_days", "domain_age", "domain", "has_ip_address", "tld"], explain: "New domains and raw IPs are common in fraud." },
  { label: "Redirects", icon: Repeat, keys: ["redirects", "redirect_count", "num_redirects"], explain: "Chains of redirects can mask malicious sites." },
  { label: "Suspicious keywords", icon: KeyRound, keys: ["suspicious_keywords", "keywords", "num_suspicious_words"], explain: "login, verify, secure, bank, update and similar words." },
];

function KeyChecks({ s }: { s: ScanResult }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {KEY_CHECKS.map((k) => {
        const found = k.keys.filter((key) => key in s.features);
        return (
          <div key={k.label} className="rounded-lg border bg-background/40 p-4">
            <div className="flex items-center gap-2"><k.icon className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">{k.label}</h3></div>
            {found.length ? (
              <dl className="mt-2 space-y-1">
                {found.map((key) => {
                  const v = s.features[key];
                  return <div key={key} className="flex justify-between gap-2 text-sm"><dt className="text-muted-foreground">{key}</dt><dd className="font-mono font-semibold">{typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}</dd></div>;
                })}
              </dl>
            ) : <p className="mt-2 text-sm text-muted-foreground">Not returned by backend</p>}
            <p className="mt-2 text-xs text-muted-foreground">{k.explain}</p>
          </div>
        );
      })}
    </div>
  );
}

function Analysis() {
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/analysis" });
  const { scans, isSample } = useScans();
  const selected = scans.find((s) => s.id === id) ?? scans[0];

  return (
    <Page title="URL Analysis" description="Inspect the features returned by the ML backend for a scanned URL.">
      {isSample && <SampleBanner />}
      {!selected ? (
        <EmptyState icon={Microscope} title="Nothing to analyse yet" description="Scan a website first — its URL features will appear here."
          action={<Button asChild><Link to="/scanner">Go to scanner</Link></Button>} />
      ) : (
        <div className="space-y-6">
          <div className="max-w-xl">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="pick">Choose a scanned URL</label>
            <Select value={selected.id} onValueChange={(v) => navigate({ search: { id: v } })}>
              <SelectTrigger id="pick" className="font-mono"><SelectValue /></SelectTrigger>
              <SelectContent>{scans.map((s) => <SelectItem key={s.id} value={s.id} className="font-mono">{s.url}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <WarningBanner prediction={selected.prediction} />
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-all font-mono text-sm">{selected.url}</p>
              <div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">Risk {selected.riskScore}/100</span><StatusBadge prediction={selected.prediction} /></div>
            </div>
          </Panel>
          <Panel title="Key security checks"><KeyChecks s={selected} /></Panel>
          <Panel title="All features returned by the backend"><FeatureGrid features={selected.features} /></Panel>
          <Panel title="Risk explanation">
            {selected.reasons.length ? <ul className="list-inside list-disc space-y-1 text-sm">{selected.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
              : <p className="text-sm text-muted-foreground">No reasons were returned.</p>}
          </Panel>
        </div>
      )}
    </Page>
  );
}
