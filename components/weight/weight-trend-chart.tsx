"use client";

import React, { useRef } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const WeightTrendChartImpl = dynamic(
  () => import("./weight-trend-chart-impl"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[300px] flex items-center justify-center">
        <Skeleton className="h-full w-full rounded-md" />
      </div>
    ),
  }
);

export { sampleWeightLogs } from "./weight-trend-chart-impl";

export default function WeightTrendChart(
  props: React.ComponentProps<typeof WeightTrendChartImpl>
) {
  return <WeightTrendChartImpl {...props} />;
}
