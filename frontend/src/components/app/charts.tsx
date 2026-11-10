import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ScanResult } from "@/lib/types";

const COLORS = { legitimate: "var(--success)", suspicious: "var(--warning)", high_risk: "var(--danger)" };
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" };

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export function countBy(scans: ScanResult[]) {
  return {
    legitimate: scans.filter((s) => s.prediction === "legitimate").length,
    suspicious: scans.filter((s) => s.prediction === "suspicious").length,
    high_risk: scans.filter((s) => s.prediction === "high_risk").length,
  };
}

export function ResultPie({ scans }: { scans: ScanResult[] }) {
  const mounted = useMounted();
  const c = countBy(scans);
  const data = [
    { name: "Legitimate", key: "legitimate", value: c.legitimate },
    { name: "Suspicious", key: "suspicious", value: c.suspicious },
    { name: "High Risk", key: "high_risk", value: c.high_risk },
  ].filter((d) => d.value > 0);
  if (!mounted) return <div className="h-64" />;
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
            {data.map((d) => <Cell key={d.key} fill={COLORS[d.key as keyof typeof COLORS]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({ scans, days = 14 }: { scans: ScanResult[]; days?: number }) {
  const mounted = useMounted();
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1 - i));
    return { date: d, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), legitimate: 0, suspicious: 0, high_risk: 0 };
  });
  for (const s of scans) {
    const d = new Date(s.scannedAt);
    d.setHours(0, 0, 0, 0);
    const b = buckets.find((x) => x.date.getTime() === d.getTime());
    if (b) b[s.prediction]++;
  }
  if (!mounted) return <div className="h-64" />;
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={buckets}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
          <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} width={28} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
          <Legend />
          <Bar dataKey="legitimate" name="Legitimate" stackId="a" fill={COLORS.legitimate} />
          <Bar dataKey="suspicious" name="Suspicious" stackId="a" fill={COLORS.suspicious} />
          <Bar dataKey="high_risk" name="High Risk" stackId="a" fill={COLORS.high_risk} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
