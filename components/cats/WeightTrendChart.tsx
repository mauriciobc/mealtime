import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { H3 } from "@/components/ui/typography";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
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
        {weights.map((w, i) => {
          const feeding = feedings.find((f) => f.date === w.date);
          return (
            <li key={w.date} className="flex items-center gap-2 mb-2">
              <Popover open={openIndex === i} onOpenChange={(open) => setOpenIndex(open ? i : null)}>
                <PopoverTrigger asChild>
                  <span
                    tabIndex={0}
                    role="button"
                    onClick={() => setOpenIndex(i)}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOpenIndex(i)}
                    className="underline cursor-pointer"
                  >
                    {w.date}
                  </span>
                </PopoverTrigger>
                <PopoverContent role="dialog">
                  <div><strong>Date:</strong> {w.date}</div>
                  <div><strong>Weight:</strong> {w.weight}</div>
                  {feeding && <div><strong>Feedings:</strong> {feeding.count}</div>}
                </PopoverContent>
              </Popover>
              <span>{w.weight} kg</span>
              {feeding && (
                <Badge>
                  {feeding.count} feedings
                </Badge>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
} 