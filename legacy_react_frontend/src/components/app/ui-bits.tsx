import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, FlaskConical, PlugZap, ShieldAlert, ShieldX, type LucideIcon } from "lucide-react";
import { PREDICTION_LABEL, type Prediction } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Page({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10 animate-fade-up">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, children, className, action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border bg-card p-5 sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS: Record<Prediction, { cls: string; icon: LucideIcon }> = {
  legitimate: { cls: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  suspicious: { cls: "bg-warning/15 text-warning border-warning/30", icon: ShieldAlert },
  high_risk: { cls: "bg-danger/15 text-danger border-danger/30", icon: ShieldX },
};
export function StatusBadge({ prediction, className }: { prediction: Prediction; className?: string }) {
  const { cls, icon: Icon } = STATUS[prediction];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold", cls, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {PREDICTION_LABEL[prediction]}
    </span>
  );
}
export const riskColor = (score: number) => (score >= 75 ? "text-danger" : score >= 40 ? "text-warning" : "text-success");
export const riskBg = (score: number) => (score >= 75 ? "bg-danger" : score >= 40 ? "bg-warning" : "bg-success");

export function RiskBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Risk score">
        <div className={cn("h-full rounded-full", riskBg(score))} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("font-mono text-xs font-semibold", riskColor(score))}>{score}</span>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = "primary", hint }: { label: string; value: ReactNode; icon: LucideIcon; tone?: "primary" | "success" | "warning" | "danger"; hint?: string }) {
  const toneCls = { primary: "text-primary bg-primary/10", success: "text-success bg-success/10", warning: "text-warning bg-warning/10", danger: "text-danger bg-danger/10" }[tone];
  return (
    <div className="rounded-xl border bg-card p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={cn("grid h-9 w-9 place-items-center rounded-lg", toneCls)}><Icon className="h-4 w-4" aria-hidden /></span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><Icon className="h-6 w-6" aria-hidden /></span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SampleBanner() {
  return (
    <div role="note" className="mb-6 flex items-start gap-3 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
      <p><strong>Sample data preview.</strong> These figures are mock data for UI demonstration only, not real scan results. Turn this off in <Link to="/settings" className="text-primary underline">Settings</Link>.</p>
    </div>
  );
}

export function BackendBanner() {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
      <PlugZap className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
      <div>
        <p className="font-semibold">ML backend not connected</p>
        <p className="mt-1 text-muted-foreground">
          Scanning is disabled — this app won't fake a prediction. Set <code className="rounded bg-muted px-1 font-mono">VITE_API_BASE_URL</code> to your Django REST API (endpoint <code className="rounded bg-muted px-1 font-mono">POST /api/scan/</code>).
        </p>
      </div>
    </div>
  );
}

export function WarningBanner({ prediction }: { prediction: Prediction }) {
  if (prediction === "legitimate") return null;
  const high = prediction === "high_risk";
  return (
    <div role="alert" className={cn("flex items-start gap-3 rounded-lg border p-4", high ? "border-danger/40 bg-danger/10" : "border-warning/40 bg-warning/10")}>
      <AlertTriangle className={cn("mt-0.5 h-5 w-5 shrink-0", high ? "text-danger" : "text-warning")} aria-hidden />
      <div className="text-sm">
        <p className="font-semibold">{high ? "High risk — do not visit or enter any information" : "Caution — this website looks suspicious"}</p>
        <p className="mt-1 text-muted-foreground">Avoid entering passwords, payment or personal details. Verify the site through an official source.</p>
      </div>
    </div>
  );
}
