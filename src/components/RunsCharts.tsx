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
import { useTheme } from "../lib/theme";
import {
  approachKey,
  formatNumber,
  medianWeightedByApproach,
  weightedOf,
} from "../lib/stats";
import type { HackathonRunRecord } from "../types/runExport";

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

function chartTheme(dark: boolean) {
  return {
    tick: { fill: dark ? "#e8eee9" : "#1a2e24", fontSize: 12, fontWeight: 600 as const },
    grid: dark ? "#3d4a42" : "#c5d0c9",
    axis: dark ? "#9aaba0" : "#4a5c52",
    tooltip: {
      background: dark ? "#1a2420" : "#ffffff",
      border: dark ? "1px solid #5a6b62" : "1px solid #8a9a90",
      borderRadius: 6,
      color: dark ? "#e8eee9" : "#14201a",
      fontSize: 13,
      fontWeight: 500,
    },
    labelFill: dark ? "#e8eee9" : "#1a2e24",
    pointStroke: dark ? "#e8eee9" : "#14201a",
  };
}

function colorFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length]!;
}

function shortLabel(name: string, max = 22): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

type Props = {
  runs: HackathonRunRecord[];
  onSelectRun: (id: string) => void;
};

export function RunsCharts({ runs, onSelectRun }: Props) {
  const { theme } = useTheme();
  const ct = chartTheme(theme === "dark");

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
      .sort((a, b) => a.rate - b.rate);
  }, [runs]);

  const barHeight = Math.max(280, medianBars.length * 28 + 48);

  if (runs.length === 0) {
    return <p className="muted chart-empty">No runs in this filter set for charts.</p>;
  }

  return (
    <div className="charts-grid">
      <div className="chart-card chart-card-wide">
        <h3>Weighted vs rating</h3>
        <p className="chart-hint">Lower weighted + higher rating is better. Click a point.</p>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 12, right: 20, bottom: 28, left: 12 }}>
              <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="weighted"
                name="weighted"
                tick={ct.tick}
                stroke={ct.axis}
                label={{
                  value: "weighted_total (lower better)",
                  position: "insideBottom",
                  offset: -10,
                  fill: ct.labelFill,
                  fontSize: 12,
                  fontWeight: 700,
                }}
                tickFormatter={(v) => formatNumber(Number(v), 0)}
              />
              <YAxis
                type="number"
                dataKey="rating"
                name="rating"
                domain={[0, 10]}
                tick={ct.tick}
                stroke={ct.axis}
                label={{
                  value: "app rating",
                  angle: -90,
                  position: "insideLeft",
                  fill: ct.labelFill,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              />
              <ZAxis range={[90, 90]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3", stroke: ct.axis }}
                contentStyle={ct.tooltip}
                itemStyle={{ color: ct.tooltip.color }}
                labelStyle={{ color: ct.tooltip.color, fontWeight: 700 }}
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
                    stroke={ct.pointStroke}
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
        <p className="chart-hint">Lower is better. Approach names on the left.</p>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={barHeight}>
            <BarChart
              layout="vertical"
              data={medianBars}
              margin={{ top: 8, right: 52, bottom: 8, left: 4 }}
            >
              <CartesianGrid stroke={ct.grid} horizontal={false} />
              <XAxis
                type="number"
                tick={ct.tick}
                stroke={ct.axis}
                tickFormatter={(v) => formatNumber(Number(v), 0)}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={140}
                tick={ct.tick}
                stroke={ct.axis}
                interval={0}
              />
              <Tooltip
                contentStyle={ct.tooltip}
                itemStyle={{ color: ct.tooltip.color }}
                labelStyle={{ color: ct.tooltip.color, fontWeight: 700 }}
                formatter={(value, _n, item) => {
                  const full = (item?.payload as { approach?: string } | undefined)?.approach;
                  return [formatNumber(Number(value), 0), full || "median"];
                }}
              />
              <Bar dataKey="median" radius={[0, 4, 4, 0]} barSize={18}>
                {medianBars.map((p) => (
                  <Cell key={p.approach} fill={p.fill} stroke={ct.pointStroke} strokeWidth={0.5} />
                ))}
                <LabelList
                  dataKey="median"
                  position="right"
                  fill={ct.labelFill}
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
        <p className="chart-hint">Share of runs with status success.</p>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={barHeight}>
            <BarChart
              layout="vertical"
              data={successBars}
              margin={{ top: 8, right: 52, bottom: 8, left: 4 }}
            >
              <CartesianGrid stroke={ct.grid} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={ct.tick} stroke={ct.axis} unit="%" />
              <YAxis
                type="category"
                dataKey="label"
                width={140}
                tick={ct.tick}
                stroke={ct.axis}
                interval={0}
              />
              <Tooltip
                contentStyle={ct.tooltip}
                itemStyle={{ color: ct.tooltip.color }}
                labelStyle={{ color: ct.tooltip.color, fontWeight: 700 }}
                formatter={(value, _n, item) => {
                  const p = item?.payload as
                    | { approach?: string; counts?: string }
                    | undefined;
                  return [`${value}% (${p?.counts || ""})`, p?.approach || "success"];
                }}
              />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={18}>
                {successBars.map((p) => (
                  <Cell key={p.approach} fill={p.fill} stroke={ct.pointStroke} strokeWidth={0.5} />
                ))}
                <LabelList
                  dataKey="rate"
                  position="right"
                  fill={ct.labelFill}
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
