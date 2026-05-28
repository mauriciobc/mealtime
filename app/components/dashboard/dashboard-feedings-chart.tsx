"use client";

import { useMemo } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
} from "@/lib/recharts-dynamic";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { CatType } from "@/lib/types";

interface ChartDataPoint {
  name: string;
  [catId: string]: string | number;
}

interface DashboardFeedingsChartProps {
  data: ChartDataPoint[];
  chartCats: CatType[];
  colorPalette: string[];
}

export function DashboardFeedingsChart({ data, chartCats, colorPalette }: DashboardFeedingsChartProps) {
  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    chartCats.forEach((cat, index) => {
      config[cat.id] = {
        label: cat.name,
        color: colorPalette[index % colorPalette.length] ?? "#888888",
      };
    });
    return config;
  }, [chartCats, colorPalette]);

  const chartBars = useMemo(
    () =>
      chartCats.map((cat, index) => (
        <Bar
          key={cat.id}
          dataKey={cat.id}
          fill={colorPalette[index % colorPalette.length]}
          radius={4}
          name={cat.name}
        />
      )),
    [chartCats, colorPalette]
  );

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <RechartsBarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => `${value}g`}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        {chartBars}
      </RechartsBarChart>
    </ChartContainer>
  );
}
