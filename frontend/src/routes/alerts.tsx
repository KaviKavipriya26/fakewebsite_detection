import { createFileRoute, Link } from "@tanstack/react-router";
import { BellOff, KeyRound, Lock, MailWarning, ShieldCheck, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScans } from "@/lib/store";
import { Page, Panel, EmptyState, SampleBanner, StatusBadge } from "@/components/app/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts & Recommendations — FraudGuard" },
      { name: "description", content: "Warnings for suspicious URLs and safe browsing recommendations." },
      { property: "og:title", content: "Alerts & Recommendations — FraudGuard" },
      { property: "og:description", content: "Why URLs were flagged and how to stay safe online." },
    ],
  }),
  component: Alerts,
});

const TIPS = [
  { icon: Lock, title: "Check for HTTPS", text: "Look for https:// and verify the domain spelling — a padlock alone isn't proof of safety." },
  { icon: Eye, title: "Inspect the domain", text: "Watch for look-alikes such as paypa1.com or amazon-security-check.net." },
  { icon: MailWarning, title: "Distrust urgent links", text: "Messages demanding you 'verify now' or 'account suspended' are classic phishing." },
  { icon: KeyRound, title: "Use a password manager", text: "It won't autofill credentials on a fake domain, which is a great warning sign." },
  { icon: ShieldCheck, title: "Enable 2-factor auth", text: "Even if a password leaks, 2FA blocks most account takeovers." },
  { icon: RefreshCw, title: "Keep software updated", text: "Browser and OS updates patch vulnerabilities used by malicious sites." },
];

function Alerts() {
  const { scans, isSample } = useScans();
  const flagged = scans.filter((s) => s.prediction !== "legitimate");
  return (
    <Page title="Alerts & Recommendations" description="Websites flagged by the model, with reasons, plus tips for safe browsing.">
      {isSample && <SampleBanner />}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <h2 className="font-semibold">Active alerts ({flagged.length})</h2>
          {!flagged.length ? (
            <EmptyState icon={BellOff} title="No alerts" description="None of your scanned websites have been flagged. Stay alert anyway!"
              action={<Button asChild variant="outline"><Link to="/scanner">Scan a website</Link></Button>} />
          ) : flagged.map((s) => (
            <article key={s.id} className={cn("rounded-xl border-l-4 border bg-card p-5", s.prediction === "high_risk" ? "border-l-danger" : "border-l-warning")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge prediction={s.prediction} />
                <span className="text-xs text-muted-foreground">{new Date(s.scannedAt).toLocaleString()} · risk {s.riskScore}/100</span>
              </div>
              <p className="mt-3 break-all font-mono text-sm">{s.url}</p>
              <h3 className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Why it was flagged</h3>
              {s.reasons.length ? (
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm">{s.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
              ) : <p className="mt-1 text-sm text-muted-foreground">The model flagged this URL based on its features (no textual reasons returned).</p>}
              <Button asChild variant="link" className="mt-2 h-auto px-0"><Link to="/analysis" search={{ id: s.id }}>View full analysis →</Link></Button>
            </article>
          ))}
        </div>
        <Panel title="Safe browsing recommendations" className="h-fit lg:col-span-2">
          <ul className="space-y-4">
            {TIPS.map((t) => (
              <li key={t.title} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><t.icon className="h-4 w-4" /></span>
                <div><p className="text-sm font-semibold">{t.title}</p><p className="text-sm text-muted-foreground">{t.text}</p></div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Page>
  );
}
