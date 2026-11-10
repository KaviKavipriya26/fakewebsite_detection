import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun, Trash2, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSettings, updateSettings, clearScans, useRealScans } from "@/lib/store";
import { API_BASE_URL, SCAN_PATH } from "@/lib/api";
import { Page, Panel } from "@/components/app/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — FraudGuard" },
      { name: "description", content: "Theme, scan history and backend connection settings." },
      { property: "og:title", content: "Settings — FraudGuard" },
      { property: "og:description", content: "Configure FraudGuard preferences." },
    ],
  }),
  component: SettingsPage,
});

function Row({ id, title, desc, children }: { id: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div><Label htmlFor={id} className="text-sm font-semibold">{title}</Label><p className="text-sm text-muted-foreground">{desc}</p></div>
      {children}
    </div>
  );
}

function SettingsPage() {
  const s = useSettings();
  const real = useRealScans();
  const [base, setBase] = useState("");
  useEffect(() => setBase(API_BASE_URL), []);

  return (
    <Page title="Settings" description="Personalise the app and manage your scan data.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Appearance">
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Theme">
            {(["dark", "light"] as const).map((t) => (
              <button key={t} role="radio" aria-checked={s.theme === t} onClick={() => updateSettings({ theme: t })}
                className={cn("flex items-center justify-center gap-2 rounded-lg border p-4 text-sm font-medium capitalize transition", s.theme === t ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
                {t === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}{t}
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Profile">
          <div className="flex items-center gap-4">
            <UserCircle className="h-12 w-12 text-muted-foreground" />
            <div><p className="font-semibold">Guest user</p><p className="text-sm text-muted-foreground">Authentication is not enabled. History is stored in this browser only.</p></div>
          </div>
        </Panel>

        <Panel title="Scan history" className="lg:col-span-2">
          <div className="divide-y">
            <Row id="save" title="Save scan history" desc="Store completed scans in this browser.">
              <Switch id="save" checked={s.saveHistory} onCheckedChange={(v) => updateSettings({ saveHistory: v })} />
            </Row>
            <Row id="limit" title="History limit" desc="Oldest scans are removed beyond this number.">
              <Select value={String(s.historyLimit)} onValueChange={(v) => updateSettings({ historyLimit: Number(v) })}>
                <SelectTrigger id="limit" className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{[50, 100, 200, 500].map((n) => <SelectItem key={n} value={String(n)}>{n} scans</SelectItem>)}</SelectContent>
              </Select>
            </Row>
            <Row id="sample" title="Show sample data" desc="Preview the dashboards with clearly labelled mock data when you have no real scans.">
              <Switch id="sample" checked={s.showSampleData} onCheckedChange={(v) => updateSettings({ showSampleData: v })} />
            </Row>
            <Row id="clear" title="Clear history" desc={`${real.length} saved scan${real.length === 1 ? "" : "s"}.`}>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button id="clear" variant="destructive" disabled={!real.length}><Trash2 /> Clear all</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete all scan history?</AlertDialogTitle><AlertDialogDescription>This permanently removes {real.length} scans from this browser.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { clearScans(); toast.success("History cleared"); }}>Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Row>
          </div>
        </Panel>

        <Panel title="Backend connection" className="lg:col-span-2">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">API base URL (VITE_API_BASE_URL)</dt><dd className="font-mono">{base || "Not set"}</dd></div>
            <div><dt className="text-muted-foreground">Scan endpoint</dt><dd className="font-mono">POST {SCAN_PATH}</dd></div>
          </dl>
        </Panel>
      </div>
    </Page>
  );
}
