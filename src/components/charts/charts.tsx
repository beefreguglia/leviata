"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "@/lib/finance";
import type { ChartSeries } from "./chart-card";

export type ValueFormat = "money" | "percent";

const CHART_1 = "var(--chart-1)";
const TICK = { fill: "var(--grey-300)", fontSize: 12 };
const GRID = "var(--grey-700)";

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const formatValue = (value: number, format: ValueFormat) => (format === "percent" ? `${value}%` : money(value));
const formatTick = (value: number, format: ValueFormat) => (format === "percent" ? `${value}%` : `R$ ${compact.format(value)}`);

type TooltipEntry = { name?: unknown; value?: unknown; color?: string; dataKey?: unknown };
type TooltipProps = { active?: boolean; label?: unknown; payload?: readonly TooltipEntry[]; format: ValueFormat };

function ChartTooltip({ active, label, payload, format }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-grey-600 bg-popover px-3 py-2 text-sm shadow-lg">
      {label != null && <p className="mb-1 font-bold text-grey-100">{String(label)}</p>}
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="flex items-center gap-2 text-grey-200">
          <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          {String(entry.name)}: <strong className="tabular-nums text-grey-100">{formatValue(Number(entry.value), format)}</strong>
        </p>
      ))}
    </div>
  );
}

const axisProps = { axisLine: false, tickLine: false, tick: TICK } as const;
const MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };

export function LineTrendChart({ data, xKey, series, format = "money", height = 260 }: { data: object[]; xKey: string; series: ChartSeries[]; format?: ValueFormat; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={MARGIN}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey={xKey} {...axisProps} minTickGap={24} />
          <YAxis {...axisProps} width={84} tickFormatter={(v: number) => formatTick(v, format)} />
          <Tooltip cursor={{ stroke: "var(--grey-500)" }} content={(p) => <ChartTooltip {...(p as object)} format={format} />} />
          {series.map((s) => (
            <Line key={s.key} dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--card-glass)", strokeWidth: 2 }} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarTrendChart({
  data,
  xKey,
  series,
  format = "money",
  stacked,
  height = 260,
}: {
  data: object[];
  xKey: string;
  series: ChartSeries[];
  format?: ValueFormat;
  stacked?: boolean;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={MARGIN} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey={xKey} {...axisProps} minTickGap={12} />
          <YAxis {...axisProps} width={84} domain={format === "percent" ? [0, 100] : undefined} tickFormatter={(v: number) => formatTick(v, format)} />
          <Tooltip cursor={{ fill: "rgb(255 255 255 / 0.05)" }} content={(p) => <ChartTooltip {...(p as object)} format={format} />} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              stackId={stacked ? "total" : undefined}
              stroke="var(--card-glass)"
              strokeWidth={2}
              radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : undefined}
              maxBarSize={36}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const ROW_HEIGHT = 34;

/** Barras horizontais ordenadas, com o valor escrito na ponta. */
export function RankedBars({ data, label, format = "money", target }: { data: { name: string; value: number }[]; label: string; format?: ValueFormat; target?: number }) {
  return (
    <div style={{ height: data.length * ROW_HEIGHT + 8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: format === "money" ? 96 : 48, bottom: 4, left: 0 }}>
          <XAxis type="number" hide domain={format === "percent" ? [0, 100] : [0, "dataMax"]} />
          <YAxis type="category" dataKey="name" {...axisProps} width={128} interval={0} tickFormatter={(v: string) => (v.length > 15 ? `${v.slice(0, 14)}…` : v)} />
          <Tooltip cursor={{ fill: "rgb(255 255 255 / 0.05)" }} content={(p) => <ChartTooltip {...(p as object)} format={format} />} />
          {target != null && <ReferenceLine x={target} stroke="var(--grey-400)" strokeDasharray="4 4" />}
          <Bar dataKey="value" name={label} fill={CHART_1} radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
            <LabelList dataKey="value" position="right" fill="var(--grey-200)" fontSize={12} formatter={(v: unknown) => formatValue(Number(v), format)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
