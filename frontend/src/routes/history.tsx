import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpDown, Download, Eye, History as HistoryIcon, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useScans, deleteScan, scansToCsv, downloadFile } from "@/lib/store";
import { Page, EmptyState, SampleBanner, StatusBadge, RiskBar } from "@/components/app/ui-bits";
import { ScanResultView } from "@/components/app/ScanResultView";
import type { Prediction, ScanResult } from "@/lib/types";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Scan History — FraudGuard" },
      { name: "description", content: "Search, filter, sort and export your website scan history." },
      { property: "og:title", content: "Scan History — FraudGuard" },
      { property: "og:description", content: "All your website fraud scans in one table." },
    ],
  }),
  component: HistoryPage,
});

type SortKey = "date" | "risk" | "url";
const PAGE_SIZE = 10;

function HistoryPage() {
  const { scans, isSample } = useScans();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Prediction>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "date", dir: -1 });
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ScanResult | null>(null);

  const rows = useMemo(() => {
    const r = scans.filter((s) => (filter === "all" || s.prediction === filter) && s.url.toLowerCase().includes(q.toLowerCase()));
    r.sort((a, b) => {
      const v = sort.key === "date" ? a.scannedAt.localeCompare(b.scannedAt) : sort.key === "risk" ? a.riskScore - b.riskScore : a.url.localeCompare(b.url);
      return v * sort.dir;
    });
    return r;
  }, [scans, q, filter, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const visible = rows.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const toggle = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }));

  const SortBtn = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button onClick={() => toggle(k)} className="inline-flex items-center gap-1 hover:text-foreground" aria-label={`Sort by ${k}`}>
      {children}<ArrowUpDown className={`h-3 w-3 ${sort.key === k ? "text-primary" : ""}`} />
    </button>
  );

  return (
    <Page title="Scan History" description="Every website you've scanned, with its prediction and risk score."
      actions={<Button variant="outline" disabled={!rows.length} onClick={() => { downloadFile(`scan-history${isSample ? "-sample" : ""}.csv`, scansToCsv(rows)); toast.success("CSV exported"); }}><Download /> Export CSV</Button>}>
      {isSample && <SampleBanner />}
      {scans.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="No scan history" description="Scans you run will be saved here." action={<Button asChild><Link to="/scanner">Scan a website</Link></Button>} />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search URLs" placeholder="Search URLs…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={filter} onValueChange={(v) => { setFilter(v as typeof filter); setPage(1); }}>
              <SelectTrigger className="sm:w-48" aria-label="Filter by status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="legitimate">Legitimate</SelectItem>
                <SelectItem value="suspicious">Suspicious</SelectItem>
                <SelectItem value="high_risk">High Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="px-4 py-3"><SortBtn k="url">URL</SortBtn></th>
                  <th className="px-4 py-3"><SortBtn k="date">Scan date</SortBtn></th>
                  <th className="px-4 py-3">Prediction</th>
                  <th className="px-4 py-3"><SortBtn k="risk">Risk score</SortBtn></th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="max-w-xs truncate px-4 py-3 font-mono" title={s.url}>{s.url}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{new Date(s.scannedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 capitalize">{s.prediction === "legitimate" ? "Safe" : "Phishing"}</td>
                    <td className="px-4 py-3"><RiskBar score={s.riskScore} /></td>
                    <td className="px-4 py-3"><StatusBadge prediction={s.prediction} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" aria-label="View details" onClick={() => setView(s)}><Eye /></Button>
                      {!s.isSample && <Button variant="ghost" size="icon" aria-label="Delete scan" onClick={() => { deleteScan(s.id); toast("Scan deleted"); }}><Trash2 /></Button>}
                    </td>
                  </tr>
                ))}
                {!visible.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No scans match your filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
            <span>{rows.length} result{rows.length === 1 ? "" : "s"}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>Previous</Button>
              <span>Page {cur} of {pages}</span>
              <Button variant="outline" size="sm" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Scan details</DialogTitle></DialogHeader>
          {view && <ScanResultView result={view} />}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
