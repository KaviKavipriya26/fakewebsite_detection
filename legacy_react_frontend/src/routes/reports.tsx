import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useScans, scansToCsv, downloadFile } from "@/lib/store";
import { Page, Panel, EmptyState, SampleBanner, StatCard } from "@/components/app/ui-bits";
import { ResultPie, TrendChart, countBy } from "@/components/app/charts";
import { PREDICTION_LABEL } from "@/lib/types";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — FraudGuard" },
      { name: "description", content: "Charts and downloadable reports built from your actual scan data." },
      { property: "og:title", content: "Reports & Analytics — FraudGuard" },
      { property: "og:description", content: "Scan analytics and downloadable reports." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { scans, isSample } = useScans();
  const c = countBy(scans);
  const avg = scans.length ? Math.round(scans.reduce((a, s) => a + s.riskScore, 0) / scans.length) : 0;
  const flaggedPct = scans.length ? Math.round(((c.suspicious + c.high_risk) / scans.length) * 100) : 0;

  function downloadReport() {
    const lines = [
      "FRAUDGUARD — SCAN REPORT", `Generated: ${new Date().toLocaleString()}`, isSample ? "NOTE: SAMPLE DATA — NOT REAL RESULTS" : "", "",
      `Total scans: ${scans.length}`, `Legitimate: ${c.legitimate}`, `Suspicious: ${c.suspicious}`, `High risk: ${c.high_risk}`, `Average risk score: ${avg}`, "",
      "DETAILS", ...scans.map((s) => `- [${PREDICTION_LABEL[s.prediction]}] ${s.riskScore}/100  ${s.url}  (${new Date(s.scannedAt).toLocaleString()})${s.reasons.length ? `\n    Reasons: ${s.reasons.join("; ")}` : ""}`),
    ].filter((l, i) => l !== "" || i > 2);
    downloadFile("fraudguard-report.txt", lines.join("\n"), "text/plain");
    toast.success("Report downloaded");
  }

  return (
    <Page title="Reports & Analytics" description="Insights generated from your scan data."
      actions={scans.length ? <>
        <Button variant="outline" onClick={() => { downloadFile("scan-data.csv", scansToCsv(scans)); toast.success("CSV exported"); }}><Download /> CSV</Button>
        <Button onClick={downloadReport} className="bg-gradient-primary"><FileText /> Download report</Button>
      </> : undefined}>
      {isSample && <SampleBanner />}
      {!scans.length ? (
        <EmptyState icon={BarChart3} title="No data to report" description="Reports are generated only from real scans — run some scans first."
          action={<Button asChild><Link to="/scanner">Scan a website</Link></Button>} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total scans" value={scans.length} icon={BarChart3} />
            <StatCard label="Average risk score" value={avg} icon={BarChart3} tone="warning" />
            <StatCard label="Flagged rate" value={`${flaggedPct}%`} icon={BarChart3} tone="danger" hint="Suspicious + high risk" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Legitimate vs suspicious"><ResultPie scans={scans} /></Panel>
            <Panel title="Scan trend (30 days)"><TrendChart scans={scans} days={30} /></Panel>
          </div>
        </div>
      )}
    </Page>
  );
}
