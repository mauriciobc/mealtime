"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "@/lib/recharts-dynamic";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TimeSeriesDataPoint, CatPortion } from "@/lib/selectors/statisticsSelectors";

export const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042']

const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isMobile };
};

interface TimeDistributionDataPoint {
  name: string;
  valor: number;
}

interface _ChartConfig {
  [key: string]: {
    label: string;
    color: string;
  }
}

interface _CatPortionConfig {
  [key: string]: {
    label: string;
    theme: {
      light: string;
      dark: string;
    };
    color: string;
  }
}

export const LineChartComponent = ({ data }: { data: TimeSeriesDataPoint[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="relative w-full aspect-[16/9] flex items-center justify-center">
        <p className="text-muted-foreground text-xs">Sem dados para exibir</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/9]">
      <ChartContainer
        config={{
          valor: {
            label: "Consumo (g)",
            color: "hsl(var(--primary))",
          }
        }}
        className="absolute inset-0 [&_.recharts-cartesian-grid-horizontal_line]:stroke-muted [&_.recharts-cartesian-grid-vertical_line]:stroke-muted"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart 
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={data.length > 10 ? 'preserveStartEnd' : 0}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
              allowDecimals={false}
              width={35}
            />
            <ChartTooltip 
              cursor={{ stroke: 'hsl(var(--muted-foreground))', opacity: 0.1 }}
            />
            <Line 
              type="monotone" 
              dataKey="valor" 
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 1, r: 2 }}
              activeDot={{ r: 4 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

export const BarChartComponent = ({ data }: { data: TimeDistributionDataPoint[] }) => {
  const { isMobile } = useResponsive();

  if (!data || data.length === 0) {
    return (
      <div className="relative w-full aspect-[16/9] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Sem dados para exibir</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/9]">
      <ChartContainer
        config={{
          valor: {
            label: "Quantidade",
            color: "hsl(var(--primary))",
          }
        }}
        className="absolute inset-0 [&_.recharts-cartesian-grid-horizontal_line]:stroke-muted [&_.recharts-cartesian-grid-vertical_line]:stroke-muted"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart 
            data={data}
            margin={{
              top: 16,
              right: isMobile ? 8 : 16,
              left: 0,
              bottom: isMobile ? 8 : 16
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
              allowDecimals={false}
            />
            <ChartTooltip 
              cursor={{ fill: 'hsl(var(--muted-foreground))', opacity: 0.1 }}
              content={<ChartTooltipContent formatter={(value: number | string) => `${value}x`} />}
            />
            <Bar 
              dataKey="valor" 
              radius={[4, 4, 0, 0]}
              fill="hsl(var(--primary))"
              maxBarSize={isMobile ? 24 : 32}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

export const PieChartComponent = ({ data }: { data: CatPortion[] }) => {
  const { isMobile } = useResponsive();

  if (!data || data.length === 0) {
    return (
      <div className="relative mx-auto aspect-square max-h-[250px] flex items-center justify-center">
        <p className="text-muted-foreground text-xs">Sem dados por gato</p>
      </div>
    );
  }

  const config = data.reduce((acc, item, index) => ({
    ...acc,
    [item.name]: {
      label: item.name,
      theme: {
        light: COLORS[index % COLORS.length],
        dark: COLORS[index % COLORS.length]
      },
      color: COLORS[index % COLORS.length]
    },
  }), {});

  const chartDimensions = {
    outerRadius: isMobile ? '56%' : '70%',
    innerRadius: data.length === 1 ? '0%' : (isMobile ? '36%' : '48%'),
    startAngle: 90,
    endAngle: -270,
  };

  return (
    <ChartContainer
      config={config}
      className="mx-auto aspect-square max-h-[250px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <ChartTooltip
            content={<ChartTooltipContent hideLabel nameKey="name" formatter={((value: any, name: any) => {
              const numValue = typeof value === 'number' ? value : parseFloat(String(value));
              const nameStr = String(name);
              const item = data.find(d => d.name === nameStr);
              return [`${numValue.toFixed(1)}g (${item?.percent || 0}%)`];
            }) as any} />}
            cursor={false}
          />
          <Pie
            data={data as any[]}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={chartDimensions.outerRadius}
            innerRadius={chartDimensions.innerRadius}
            startAngle={chartDimensions.startAngle}
            endAngle={chartDimensions.endAngle}
            paddingAngle={data.length === 1 ? 0 : 2}
            minAngle={data.length === 1 ? 360 : 10}
            strokeWidth={5}
          >
            {data.map((entry, index) => {
              return (
                <Cell
                  key={`cell-${entry.name}-${entry.value}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="hsl(var(--background))"
                  strokeWidth={1}
                />
              );
            })}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export interface HourDistributionPoint {
  name: string;
  valor: number;
}

export function HourDistributionChart({ data }: { data: HourDistributionPoint[] }) {
  return (
    <div className="relative w-full aspect-[16/9]">
      <ChartContainer
        config={{
          valor: {
            label: "Quantidade",
            color: "hsl(var(--primary))",
          },
        }}
        className="absolute inset-0 [&_.recharts-cartesian-grid-horizontal_line]:stroke-muted [&_.recharts-cartesian-grid-vertical_line]:stroke-muted"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              tickFormatter={(value: number) => `${value}x`}
              width={35}
              tickMargin={4}
            />
            <ChartTooltip
              content={<ChartTooltipContent hideLabel formatter={(value: number | string) => `${value} alimentações`} />}
              cursor={{ fill: "hsl(var(--muted-foreground))", opacity: 0.1 }}
            />
            <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={24} fill="hsl(var(--primary))" />
          </RechartsBarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

