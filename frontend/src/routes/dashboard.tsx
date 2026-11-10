import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanSearch, ShieldCheck, ShieldAlert, ShieldX, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScans } from "@/lib/store";
import { Page, Panel, StatCard, StatusBadge, RiskBar, EmptyState, SampleBanner } from "@/components/app/ui-bits";
import { ResultPie, TrendChart, countBy } from "@/components/app/charts";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — FraudGuard" },
      { name: "description", content: "Overview of scanned URLs, legitimate and suspicious detections, and trends." },
      { property: "og:title", content: "Dashboard — FraudGuard" },
      { property: "og:description", content: "Overview of your fraud detection scans." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { scans, isSample } = useScans();
  const c = countBy(scans);
  return (
    <Page title="Dashboard" description="Overview of your website scans and detection results."
      actions={<Button asChild className="bg-gradient-primary"><Link to="/scanner"><ScanSearch /> New scan</Link></Button>}>
      {isSample && <SampleBanner />}
      {scans.length === 0 ? (
        <EmptyState icon={ScanSearch} title="No scans yet" description="Your dashboard fills up with real results once you scan websites. You can also enable sample data in Settings for a preview."
          action={<Button asChild><Link to="/scanner">Scan a website</Link></Button>} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total URLs scanned" value={scans.length} icon={ScanSearch} />
            <StatCard label="Legitimate" value={c.legitimate} icon={ShieldCheck} tone="success" />
            <StatCard label="Suspicious" value={c.suspicious} icon={ShieldAlert} tone="warning" />
            <StatCard label="High risk" value={c.high_risk} icon={ShieldX} tone="danger" />
          </div>
          <div className="grid gap-6 lg:grid-cols-5">
            <Panel title="Scan results" className="lg:col-span-2"><ResultPie scans={scans} /></Panel>
            <Panel title="Detection trend (14 days)" className="lg:col-span-3"><TrendChart scans={scans} /></Panel>
          </div>
          <Panel title="Recent scans" action={<Button asChild variant="ghost" size="sm"><Link to="/history"><History /> View all</Link></Button>}>
            <ul className="divide-y">
              {scans.slice(0, 6).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link to="/analysis" search={{ id: s.id }} className="block truncate font-mono text-sm hover:text-primary">{s.url}</Link>
                    <p className="text-xs text-muted-foreground">{new Date(s.scannedAt).toLocaleString()}</p>
                  </div>
                  <RiskBar score={s.riskScore} />
                  <StatusBadge prediction={s.prediction} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </Page>
  );
}
