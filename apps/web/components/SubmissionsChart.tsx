"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface ChartPoint {
  date: string;
  ok: number;
  issues: number;
}

const config = {
  ok: {
    label: "All OK",
    color: "var(--chart-2)",
  },
  issues: {
    label: "With issues",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function SubmissionsChart({ data }: { data: ChartPoint[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="fillOk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-ok)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-ok)" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="fillIssues" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-issues)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-issues)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          dataKey="issues"
          type="monotone"
          fill="url(#fillIssues)"
          stroke="var(--color-issues)"
          stackId="a"
        />
        <Area
          dataKey="ok"
          type="monotone"
          fill="url(#fillOk)"
          stroke="var(--color-ok)"
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  );
}
