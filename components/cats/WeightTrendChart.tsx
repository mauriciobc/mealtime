import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { H3 } from "@/components/ui/typography";

interface WeightEntry {
  date: string;
  weight: number;
}
interface FeedingEntry {
  date: string;
  count: number;
}
interface WeightTrendChartProps {
  weights: WeightEntry[];
  feedings: FeedingEntry[];
}

const ranges = [30, 60, 90];

export function WeightTrendChart({ weights, feedings }: WeightTrendChartProps) {
  const [range, setRange] = React.useState(30);
  return (
    <div>
      <H3>Weight Trend</H3>
      <div className="flex gap-2 mb-4">
        {ranges.map((r) => (
          <Button
            key={r}
            variant="outline"
            aria-pressed={range === r}
            onClick={() => setRange(r)}
          >
            {r} days
          </Button>
        ))}
      </div>
      <ul>
        {weights.map((w) => (
          <li key={w.date} className="flex items-center gap-2 mb-2">
            <span>{w.date}</span>
            <span>{w.weight} kg</span>
            {feedings.find((f) => f.date === w.date) && (
              <Badge>
                {feedings.find((f) => f.date === w.date)?.count} feedings
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
} 