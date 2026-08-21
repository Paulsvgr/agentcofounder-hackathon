import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  approachKey,
  formatNumber,
  medianWeightedByApproach,
  weightedOf,
} from "../lib/stats";
import type { HackathonRunRecord } from "../types/runExport";

const COLORS = [
  "#7dffb3",
  "#7db8ff",
  "#ffb86b",
  "#ff7a9a",
  "#c4a7ff",
  "#ffe066",
  "#5eead4",
  "#f472b6",
  "#a3e635",
  "#38bdf8",
];

function colorFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length]!;
}

type Props = {
  runs: HackathonRunRecord[];
  onSelectRun: (id: string) => void;
};

export function RunsCharts({ runs, onSelectRun }: Props) {
  const scatter = useMemo(() => {
    return runs
      .map((run) => {
        const w = weightedOf(run);
        const rating = run.data.app_rating;
        if (w === null || rating === null || rating === undefined) return null;
        const approach = approachKey(run);
        return {
          id: run.id,
          runId: run.data.export?.meta?.run_id || run.id.slice(0, 8),
          approach,
          weighted: w,
          rating,
          fill: colorFor(approach),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [runs]);

  const medianBars = useMemo(() => {
    const med = medianWeightedByApproach(runs);
    return [...med.entries()]
      .map(([approach, median]) => ({
        approach,
        median: Math.round(median),
        fill: colorFor(approach),
      }))
      .sort((a, b) => a.median - b.median);
  }, [runs]);

  const successBars = useMemo(() => {
    const buckets = new Map<string, { ok: number; n: number }>();
    for (const run of runs) {
      const key = approachKey(run);
      const b = buckets.get(key) ?? { ok: 0, n: 0 };
      b.n += 1;
      if ((run.data.export?.harness?.status || "").toLowerCase() === "success") {
        b.ok += 1;
      }
      buckets.set(key, b);
    }
    return [...buckets.entries()]
      .map(([approach, { ok, n }]) => ({
        approach,
        rate: n ? Math.round((ok / n) * 100) : 0,
        label: `${ok}/${n}`,
        fill: colorFor(approach),
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [runs]);

  if (runs.length === 0) {
    return <p className="muted chart-empty">No runs in this filter set for charts.</p>;
  }

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <h3>Weighted vs rating</h3>
        <p className="muted chart-hint">Lower weighted + higher rating is better. Click a point.</p>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="rgba(180,210,190,0.12)" />
              <XAxis
                type="number"
                dataKey="weighted"
                name="weighted"
                tick={{ fill: "#8fa399", fontSize: 11 }}
                tickFormatter={(v) => formatNumber(Number(v), 0)}
              />
              <YAxis
                type="number"
                dataKey="rating"
                name="rating"
                domain={[0, 10]}
                tick={{ fill: "#8fa399", fontSize: 11 }}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "#121a17",
                  border: "1px solid rgba(180,210,190,0.2)",
                  borderRadius: 8,
                }}
                formatter={(value, name) => [
                  typeof value === "number" ? formatNumber(value) : String(value ?? ""),
                  String(name),
                ]}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as
                    | { approach?: string; runId?: string }
                    | undefined;
                  return p ? `${p.approach} · ${p.runId}` : "";
                }}
              />
              <Scatter
                data={scatter}
                onClick={(d) => {
                  const id = (d as { id?: string })?.id;
                  if (id) onSelectRun(id);
                }}
              >
                {scatter.map((p) => (
                  <Cell key={p.id} fill={p.fill} cursor="pointer" />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>Median weighted by approach</h3>
        <p className="muted chart-hint">Lower is better (same status assumed).</p>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={medianBars}
              margin={{ top: 8, right: 8, bottom: 48, left: 0 }}
            >
              <CartesianGrid stroke="rgba(180,210,190,0.12)" vertical={false} />
              <XAxis
                dataKey="approach"
                interval={0}
                angle={-35}
                textAnchor="end"
                height={60}
                tick={{ fill: "#8fa399", fontSize: 10 }}
              />
              <YAxis tick={{ fill: "#8fa399", fontSize: 11 }} tickFormatter={(v) => formatNumber(Number(v), 0)} />
              <Tooltip
                contentStyle={{
                  background: "#121a17",
                  border: "1px solid rgba(180,210,190,0.2)",
                  borderRadius: 8,
                }}
                formatter={(value) => [formatNumber(Number(value), 0), "median weighted"]}
              />
              <Bar dataKey="median" radius={[4, 4, 0, 0]}>
                {medianBars.map((p) => (
                  <Cell key={p.approach} fill={p.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>Success rate by approach</h3>
        <p className="muted chart-hint">Share of runs with harness status success.</p>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={successBars} margin={{ top: 8, right: 8, bottom: 48, left: 0 }}>
              <CartesianGrid stroke="rgba(180,210,190,0.12)" vertical={false} />
              <XAxis
                dataKey="approach"
                interval={0}
                angle={-35}
                textAnchor="end"
                height={60}
                tick={{ fill: "#8fa399", fontSize: 10 }}
              />
              <YAxis domain={[0, 100]} tick={{ fill: "#8fa399", fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{
                  background: "#121a17",
                  border: "1px solid rgba(180,210,190,0.2)",
                  borderRadius: 8,
                }}
                formatter={(value, _n, item) => {
                  const label = (item?.payload as { label?: string } | undefined)?.label;
                  return [`${value}% (${label || ""})`, "success rate"];
                }}
              />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {successBars.map((p) => (
                  <Cell key={p.approach} fill={p.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
