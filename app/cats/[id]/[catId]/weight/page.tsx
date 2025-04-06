'use client'; // Required for hooks and event handlers

import { useState, useEffect, useCallback, FormEvent } from 'react'; // Added useCallback, FormEvent
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { toast } from 'sonner'; // For error feedback
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { format } from 'date-fns'; // For formatting dates

// Define interfaces for fetched data
interface CatBasicInfo { // Updated interface name
    id: number;
    name: string;
    currentWeight: number | null;
    weightUnit: string | null;
}

interface GoalData {
  weightGoal: number | null;
}

// Add interfaces for History and Feedings
interface WeightMeasurement { // Assuming structure from API
    id: number;
    catId: number;
    weight: number;
    unit: string;
    measuredAt: string; // ISO Date string
    createdAt: string;
    updatedAt: string;
}

interface FeedingLog { // Assuming structure from API
    id: number;
    catId: number;
    userId: number;
    timestamp: string; // ISO Date string
    portionSize: number | null;
    notes?: string | null;
    status?: string | null;
}

// State for calculations
interface CalculatedData {
    portionsSinceLast: number | null;
    avgPortionsPerDay: number | null;
}

// Placeholder data - REMOVED, will use state

// TODO: Define data structure for chart data
const placeholderChartData = [
  { name: 'Week 1', weight: 5.5 },
  { name: 'Week 3', weight: 5.4 },
  { name: 'Week 5', weight: 5.3 },
  { name: 'Week 7', weight: 5.2 },
];

export default function CatWeightTrackerPage({
  params,
}: {
  params: { catId: string };
}) {
  const { catId } = params;

  // State hooks
  const [catData, setCatData] = useState<CatBasicInfo | null>(null); // Use updated interface
  const [goalData, setGoalData] = useState<GoalData | null>(null); // For weight goal
  const [weightHistory, setWeightHistory] = useState<WeightMeasurement[]>([]); // For calculations
  const [feedingHistory, setFeedingHistory] = useState<FeedingLog[]>([]); // For calculations
  const [calculatedData, setCalculatedData] = useState<CalculatedData>({ portionsSinceLast: null, avgPortionsPerDay: null });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [weightInput, setWeightInput] = useState<string>("");
  const [unitInput, setUnitInput] = useState<string>("kg");
  const [dateInput, setDateInput] = useState<string>(""); // Store as string from datetime-local

  // --- Data Fetching Logic --- Trigger refetch on demand
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let fetchedWeightHistory: WeightMeasurement[] = []; // Define here for broader scope

    try {
      // --- Fetch required data in parallel ---
      const [goalResponse, weightHistoryResponse, basicInfoResponse] = await Promise.all([
        fetch(`/api/cats/${catId}/goal`),
        fetch(`/api/cats/${catId}/weight`),
        fetch(`/api/cats/${catId}/basic-info`),
      ]);

      // --- Process Initial Responses ---
      // Basic Info
      if (!basicInfoResponse.ok) {
        const errorData = await basicInfoResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch basic cat info: ${basicInfoResponse.statusText}`);
      }
      const basicInfoData: CatBasicInfo = await basicInfoResponse.json();
      setCatData(basicInfoData);

      // Goal
      if (!goalResponse.ok) {
        const errorData = await goalResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch weight goal: ${goalResponse.statusText}`);
      }
      const fetchedGoalData: GoalData = await goalResponse.json();
      setGoalData(fetchedGoalData);

      // Weight History
      if (!weightHistoryResponse.ok) {
        const errorData = await weightHistoryResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch weight history: ${weightHistoryResponse.statusText}`);
      }
      fetchedWeightHistory = await weightHistoryResponse.json(); // Assign to scoped variable
      // Sort ASC for chart
      setWeightHistory(fetchedWeightHistory.sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()));

      // --- Fetch Feeding History (conditionally based on weight history) ---
      let fetchedFeedingHistory: FeedingLog[] = [];
      const previousMeasurementTime = fetchedWeightHistory.length > 1
          ? new Date(fetchedWeightHistory[1].measuredAt) // Use the already fetched history (unsorted)
          : null;

      if (previousMeasurementTime) {
          // Construct URL with 'since' parameter
          const feedingApiUrl = `/api/cats/${catId}/feeding?since=${previousMeasurementTime.toISOString()}`;
          const feedingResponse = await fetch(feedingApiUrl);
          if (!feedingResponse.ok) {
                const errorData = await feedingResponse.json().catch(() => ({}));
                // Log error but don't necessarily block rendering calculations (might show 0)
                console.error(`Failed to fetch feeding history: ${errorData.error || feedingResponse.statusText}`);
                toast.error(`Could not load feeding data for calculations: ${errorData.error || feedingResponse.statusText}`);
          } else {
                fetchedFeedingHistory = await feedingResponse.json();
          }
      } // No need to fetch feedings if there's no previous measurement period
      setFeedingHistory(fetchedFeedingHistory);

      // --- Perform Calculations (using fetchedFeedingHistory) ---
      if (fetchedWeightHistory.length >= 1) {
          const lastMeasurement = fetchedWeightHistory[0]; // Use unsorted history from fetch
          const lastMeasurementTime = new Date(lastMeasurement.measuredAt);

          if (previousMeasurementTime) {
                // Filter the already fetched & filtered feeding history
                const feedingsSinceLast = fetchedFeedingHistory.filter(log =>
                    new Date(log.timestamp) <= lastMeasurementTime // Ensure logs are not *after* the last measurement
                    // No need for > previousMeasurementTime check as API handled it with `since`
                );
                const totalPortions = feedingsSinceLast.reduce((sum, log) => sum + (log.portionSize || 0), 0);
                const timeDiff = lastMeasurementTime.getTime() - previousMeasurementTime.getTime();
                const daysDiff = Math.max(1, timeDiff / (1000 * 60 * 60 * 24));
                const avgPortions = totalPortions / daysDiff;
                setCalculatedData({ portionsSinceLast: totalPortions, avgPortionsPerDay: avgPortions });
          } else {
               setCalculatedData({ portionsSinceLast: 0, avgPortionsPerDay: null });
          }
      } else {
          setCalculatedData({ portionsSinceLast: 0, avgPortionsPerDay: null });
      }

    } catch (err) {
      console.error("Error fetching weight tracker data:", err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  // Dependencies: Now only depends on catId as calculations use fetched data directly
  }, [catId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Run fetchData on mount and when fetchData definition changes (due to deps)

  // --- Form Submission Handler ---
  const handleWeightSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const weightValue = parseFloat(weightInput);
    if (isNaN(weightValue) || weightValue <= 0) {
        setFormError("Please enter a valid positive weight.");
        setIsSubmitting(false);
        return;
    }

    const payload: any = {
        weight: weightValue,
        unit: unitInput,
    };

    // Only include measuredAt if dateInput is not empty
    if (dateInput) {
        payload.measuredAt = new Date(dateInput).toISOString();
    }

    try {
        const response = await fetch(`/api/cats/${catId}/weight`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to add weight: ${response.statusText}`);
        }

        toast.success("Weight measurement added successfully!");
        setIsDialogOpen(false); // Close dialog on success
        setWeightInput(""); // Reset form
        setUnitInput("kg");
        setDateInput("");
        await fetchData(); // Refetch data to update the UI

    } catch (err) {
        console.error("Error submitting weight:", err);
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        setFormError(message);
        toast.error(`Failed to add weight: ${message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const displayWeight = (weight: number | null, unit: string = 'kg') => {
      return weight !== null ? `${weight} ${unit}` : 'N/A';
  };

  // --- Chart Data Formatting ---
  const formattedChartData = weightHistory.map(item => ({
      // Format date for display on X-axis
      measuredAtFormatted: format(new Date(item.measuredAt), 'MMM d'), // e.g., Apr 6
      weight: item.weight,
      // Include original date for tooltip
      fullDate: format(new Date(item.measuredAt), 'PPpp'), // e.g., Apr 6, 2025 at 5:48 PM
      unit: item.unit,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        Weight Tracker for {isLoading || !catData ? (
            <Skeleton className="h-8 w-32 inline-block" />
            ) : (
            catData.name
            )} (ID: {catId})
      </h1>

      {error && (
        <Card className="mb-6 bg-destructive/10 border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">Error Loading Data</CardTitle>
            </CardHeader>
            <CardContent>
                <p>{error}</p>
            </CardContent>
        </Card>
      )}

      {/* Top Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Current Weight Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Weight</CardTitle>
            <CardDescription>Last measurement</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || !catData ? (
              <Skeleton className="h-10 w-3/4" />
            ) : (
              <p className="text-2xl font-semibold">
                {displayWeight(catData.currentWeight, catData.weightUnit)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Goal Weight Card */}
        <Card>
          <CardHeader>
            <CardTitle>Weight Goal</CardTitle>
            <CardDescription>Target weight</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || !goalData ? (
              <Skeleton className="h-10 w-3/4" />
            ) : goalData.weightGoal !== null ? (
              <p className="text-2xl font-semibold">
                {displayWeight(goalData.weightGoal, catData?.weightUnit)}
              </p>
            ) : (
              <p className="text-muted-foreground italic">No goal set</p>
            )}
          </CardContent>
          {/* TODO: Add button/modal to set/edit goal */}
        </Card>

        {/* Portions Since Last Measurement Card */}
        <Card>
          <CardHeader>
            <CardTitle>Portions Fed</CardTitle>
            <CardDescription>Between last two weigh-ins</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-1/2" />
            ) : calculatedData.portionsSinceLast !== null ? (
              <p className="text-2xl font-semibold">{calculatedData.portionsSinceLast}</p>
            ) : (
              <p className="text-2xl font-semibold text-muted-foreground">N/A</p>
            )}
          </CardContent>
        </Card>

        {/* Average Portions Per Day Card */}
        <Card>
          <CardHeader>
            <CardTitle>Avg. Daily Portions</CardTitle>
            <CardDescription>Between last two weigh-ins</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-1/2" />
            ) : calculatedData.avgPortionsPerDay !== null ? (
              <p className="text-2xl font-semibold">{calculatedData.avgPortionsPerDay.toFixed(1)}</p>
            ) : (
              <p className="text-2xl font-semibold text-muted-foreground">N/A</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Graph Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Weight Progress</CardTitle>
          <CardDescription>Weight measured over time</CardDescription>
        </CardHeader>
        <CardContent className="h-64 md:h-96"> {/* Fixed height for chart container */}
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : weightHistory.length > 0 ? ( // Only render chart if data exists
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                  data={formattedChartData}
                  margin={{
                      top: 5,
                      right: 30,
                      left: 0, // Adjusted left margin
                      bottom: 5,
                  }}
              >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="measuredAtFormatted" />
                  {/* Add domain to YAxis if needed, e.g., domain={['dataMin - 1', 'dataMax + 1']} */}
                  <YAxis unit={catData?.weightUnit || 'kg'} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number, name: string, props) => [`${value} ${props.payload.unit}`, `Weight`]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload.fullDate || label}
                  />
                  <Legend />
                  <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))" // Use theme primary color
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                      dot={{ r: 4 }}
                      name="Weight" // Name for Legend/Tooltip
                      unit={catData?.weightUnit || 'kg'} // Pass unit for tooltip context
                  />
                  {/* Optional: Add Line for weightGoal if it exists */}
                   {goalData?.weightGoal && (
                      <Line
                          type="monotone"
                          dataKey={() => goalData.weightGoal} // Constant value line
                          stroke="hsl(var(--destructive))" // Use theme destructive color
                          strokeDasharray="5 5"
                          dot={false}
                          activeDot={false}
                          name="Goal"
                          strokeWidth={1}
                      />
                  )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
             <div className="flex items-center justify-center h-full border rounded-md">
              <p className="text-muted-foreground">No weight history recorded yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button>Add New Weight Measurement</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Weight Measurement</DialogTitle>
                    <DialogDescription>
                        Enter the cat's weight and optionally the measurement date.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleWeightSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="weight" className="text-right">
                                Weight
                            </Label>
                            <Input
                                id="weight"
                                type="number"
                                step="0.01" // Allow decimals
                                value={weightInput}
                                onChange={(e) => setWeightInput(e.target.value)}
                                className="col-span-2" // Span 2 cols for input
                                required
                                disabled={isSubmitting}
                            />
                            {/* Unit Selector */}
                            <Select
                                value={unitInput}
                                onValueChange={setUnitInput}
                                required
                                disabled={isSubmitting}
                            >
                                <SelectTrigger id="unit" className="col-span-1">
                                    <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="lb">lb</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="measuredAt" className="text-right">
                                Date (Optional)
                            </Label>
                            <Input
                                id="measuredAt"
                                type="datetime-local"
                                value={dateInput}
                                onChange={(e) => setDateInput(e.target.value)}
                                className="col-span-3"
                                disabled={isSubmitting}
                                // Optional: Add max property for current time
                                max={new Date().toISOString().slice(0, 16)}
                            />
                        </div>
                         {formError && (
                            <p className="col-span-4 text-sm text-destructive text-center">
                                {formError}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                         <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isSubmitting}>
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save Measurement"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

         {/* TODO: Determine correct link for feeding log */}
         <Link href={`/cats/${catId}/feeding`} passHref>
             <Button variant="secondary">Log Feeding</Button>
         </Link>
         {/* TODO: Link to history page when created */}
         <Link href={`/cats/${catId}/weight/history`} passHref>
            <Button variant="outline">View Full History</Button>
         </Link>
      </div>
    </div>
  );
} 