import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BellRing, Brain, Globe, Link2, ScanSearch, ShieldCheck, ShieldAlert, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRealScans } from "@/lib/store";
import { countBy } from "@/components/app/charts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FraudGuard — ML Fake Website & Online Fraud Detection" },
      { name: "description", content: "Detect phishing and fake websites with machine learning. Scan any URL for fraud risk, features and explanations." },
      { property: "og:title", content: "FraudGuard — ML Fake Website & Online Fraud Detection" },
      { property: "og:description", content: "Scan any URL for phishing and fraud risk using machine learning." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Brain, title: "AI phishing detection", text: "A trained ML model classifies websites as legitimate, suspicious or high risk." },
  { icon: Link2, title: "URL analysis", text: "Inspects HTTPS, length, special characters, domain age, redirects and keywords." },
  { icon: BellRing, title: "Fraud alerts", text: "Clear warnings with reasons and safe-browsing advice for every flagged URL." },
];
const STEPS = [
  { icon: Globe, title: "Enter a URL", text: "Paste any website address into the scanner." },
  { icon: Activity, title: "Extract features", text: "The backend extracts lexical, domain and security features." },
  { icon: Brain, title: "ML prediction", text: "The model scores the risk from 0 to 100." },
  { icon: ShieldCheck, title: "Get the verdict", text: "See the status, risk score and why it was flagged." },
];

function Landing() {
  const scans = useRealScans();
  const c = countBy(scans);
  return (
    <div>
      <section className="relative overflow-hidden border-b bg-hero">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28 animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Machine-learning powered cybersecurity
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-6xl">
            ML-Based Fake Website & <span className="text-gradient">Online Fraud Detection</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Check whether a website is safe before you log in, pay or share personal data. Get an instant risk score with a clear explanation.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-primary shadow-glow hover:opacity-90">
              <Link to="/scanner"><ScanSearch /> Scan Website</Link>
            </Button>
            <Button asChild size="lg" variant="outline"><Link to="/dashboard">View Dashboard <ArrowRight /></Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">What it does</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/50">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary"><f.icon className="h-5 w-5" /></span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">How it works</h2>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-xl border bg-background p-6">
                <span className="font-mono text-xs text-primary">STEP {i + 1}</span>
                <s.icon className="mt-3 h-6 w-6 text-primary" />
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Your scan statistics</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">Real numbers from scans performed in this browser.</p>
        {scans.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground">No scans yet. <Link to="/scanner" className="text-primary underline">Run your first scan</Link>.</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[{ l: "URLs scanned", v: scans.length, i: ScanSearch, cls: "text-primary" },
              { l: "Legitimate", v: c.legitimate, i: ShieldCheck, cls: "text-success" },
              { l: "Suspicious / high risk", v: c.suspicious + c.high_risk, i: ShieldAlert, cls: "text-danger" }].map((x) => (
              <div key={x.l} className="rounded-xl border bg-card p-6 text-center">
                <x.i className={`mx-auto h-6 w-6 ${x.cls}`} />
                <p className="mt-2 font-display text-4xl font-bold">{x.v}</p>
                <p className="text-sm text-muted-foreground">{x.l}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
