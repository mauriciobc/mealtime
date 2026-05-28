"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

function lazyNamed(name: string): ComponentType<Record<string, unknown>> {
  return dynamic(
    () => import("recharts").then((mod) => mod[name as keyof typeof mod] as ComponentType<Record<string, unknown>>),
    { ssr: false }
  );
}

export const ResponsiveContainer = lazyNamed("ResponsiveContainer");
export const LineChart = lazyNamed("LineChart");
export const Line = lazyNamed("Line");
export const XAxis = lazyNamed("XAxis");
export const YAxis = lazyNamed("YAxis");
export const CartesianGrid = lazyNamed("CartesianGrid");
export const Tooltip = lazyNamed("Tooltip");
export const Legend = lazyNamed("Legend");
export const BarChart = lazyNamed("BarChart");
export const Bar = lazyNamed("Bar");
export const PieChart = lazyNamed("PieChart");
export const Pie = lazyNamed("Pie");
export const Cell = lazyNamed("Cell");
export const Label = lazyNamed("Label");
