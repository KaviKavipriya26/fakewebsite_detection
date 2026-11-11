import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, Bell, History, LayoutDashboard, Menu, ScanSearch, Settings, Shield, Microscope, X, Home } from "lucide-react";
import { useSettings } from "@/lib/store";
import { isBackendConfigured } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/scanner", label: "Scanner", icon: ScanSearch },
  { to: "/analysis", label: "URL Analysis", icon: Microscope },
  { to: "/history", label: "Scan History", icon: History },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const settings = useSettings();
  const [connected, setConnected] = useState(false);

  useEffect(() => setConnected(isBackendConfigured()), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.classList.toggle("light", settings.theme === "light");
  }, [settings.theme]);

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link key={to} to={to}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-sidebar-accent text-primary" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground")}>
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary shadow-glow">
        <Shield className="h-5 w-5 text-primary-foreground" aria-hidden />
      </span>
      <span className="font-display text-lg font-bold leading-none">Fraud<span className="text-primary">Guard</span></span>
    </Link>
  );

  const status = (
    <div className="mt-auto rounded-lg border bg-card p-3 text-xs">
      <div className="flex items-center gap-2 font-medium">
        <span className={cn("h-2 w-2 rounded-full", connected ? "bg-success" : "bg-warning")} />
        {connected ? "ML backend connected" : "Backend not connected"}
      </div>
      <p className="mt-1 text-muted-foreground">{connected ? "Scans use your Django API." : "Set VITE_API_BASE_URL to enable scans."}</p>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 border-r bg-sidebar p-5 lg:flex">
        {brand}
        {nav}
        {status}
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-sidebar/90 px-4 py-3 backdrop-blur lg:hidden">
        {brand}
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-md p-2 hover:bg-sidebar-accent">
          <Menu className="h-5 w-5" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-8 border-r bg-sidebar p-5 animate-in slide-in-from-left">
            <div className="flex items-center justify-between">
              {brand}
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-md p-2 hover:bg-sidebar-accent"><X className="h-5 w-5" /></button>
            </div>
            {nav}
            {status}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
