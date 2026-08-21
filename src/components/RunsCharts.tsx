import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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

/** High-contrast fills on light chart cards */
const COLORS = [
  "#0d6e4f",
  "#1d4ed8",
  "#b45309",
  "#be123c",
  "#6d28d9",
  "#a16207",
  "#0f766e",
  "#9d174d",
  "#3f6212",
  "#0369a1",
];

const TICK = { fill: "#1a2e24", fontSize: 12, fontWeight: 600 as const };
const GRID = "#c5d0c9";
const TOOLTIP_STYLE = {
  background: "#ffffff",
  border: "1px solid #8a9a90",
  borderRadius: 6,
  color: "#14201a",
  fontSize: 13,
  fontWeight: 500,
};

function colorFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length]!;
}

function shortLabel(name: string, max = 16): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
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
        label: shortLabel(approach),
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
        label: shortLabel(approach),
        rate: n ? Math.round((ok / n) * 100) : 0,
        counts: `${ok}/${n}`,
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
        <p className="chart-hint">Lower weighted + higher rating is better. Click a point.</p>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 12, right: 16, bottom: 12, left: 8 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="weighted"
                name="weighted"
                tick={TICK}
                stroke="#4a5c52"
                label={{
                  value: "weighted_total",
                  position: "insideBottom",
                  offset: -4,
                  fill: "#1a2e24",
                  fontSize: 12,
                  fontWeight: 600,
                }}
                tickFormatter={(v) => formatNumber(Number(v), 0)}
              />
              <YAxis
                type="number"
                dataKey="rating"
                name="rating"
                domain={[0, 10]}
                tick={TICK}
                stroke="#4a5c52"
                label={{
                  value: "rating",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#1a2e24",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
              <ZAxis range={[80, 80]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3", stroke: "#1a2e24" }}
                contentStyle={TOOLTIP_STYLE}
                itemStyle={{ color: "#14201a" }}
                labelStyle={{ color: "#14201a", fontWeight: 700 }}
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
                  <Cell
                    key={p.id}
                    fill={p.fill}
                    stroke="#14201a"
                    strokeWidth={1}
                    cursor="pointer"
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>Median weighted by approach</h3>
        <p className="chart-hint">Lower is better (same status assumed).</p>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={medianBars} margin={{ top: 24, right: 12, bottom: 64, left: 8 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="label"
                interval={0}
                angle={-40}
                textAnchor="end"
                height={72}
                tick={TICK}
                stroke="#4a5c52"
              />
              <YAxis
                tick={TICK}
                stroke="#4a5c52"
                tickFormatter={(v) => formatNumber(Number(v), 0)}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                itemStyle={{ color: "#14201a" }}
                labelStyle={{ color: "#14201a", fontWeight: 700 }}
                formatter={(value, _n, item) => {
                  const full = (item?.payload as { approach?: string } | undefined)?.approach;
                  return [formatNumber(Number(value), 0), full || "median weighted"];
                }}
              />
              <Bar dataKey="median" radius={[4, 4, 0, 0]}>
                {medianBars.map((p) => (
                  <Cell key={p.approach} fill={p.fill} stroke="#14201a" strokeWidth={0.5} />
                ))}
                <LabelList
                  dataKey="median"
                  position="top"
                  fill="#1a2e24"
                  fontSize={11}
                  fontWeight={700}
                  formatter={(v) => formatNumber(Number(v), 0)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>Success rate by approach</h3>
        <p className="chart-hint">Share of runs with harness status success.</p>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={successBars} margin={{ top: 24, right: 12, bottom: 64, left: 8 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="label"
                interval={0}
                angle={-40}
                textAnchor="end"
                height={72}
                tick={TICK}
                stroke="#4a5c52"
              />
              <YAxis domain={[0, 100]} tick={TICK} stroke="#4a5c52" unit="%" />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                itemStyle={{ color: "#14201a" }}
                labelStyle={{ color: "#14201a", fontWeight: 700 }}
                formatter={(value, _n, item) => {
                  const p = item?.payload as
                    | { approach?: string; counts?: string }
                    | undefined;
                  return [`${value}% (${p?.counts || ""})`, p?.approach || "success rate"];
                }}
              />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {successBars.map((p) => (
                  <Cell key={p.approach} fill={p.fill} stroke="#14201a" strokeWidth={0.5} />
                ))}
                <LabelList
                  dataKey="rate"
                  position="top"
                  fill="#1a2e24"
                  fontSize={11}
                  fontWeight={700}
                  formatter={(v) => `${v}%`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
