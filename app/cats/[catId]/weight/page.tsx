'use client'; // Required for hooks and event handlers

import { useState, useEffect } from 'react'; // Import hooks
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { toast } from 'sonner'; // For error feedback
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'; // Import later for graph

// Define interfaces for fetched data
interface CatData {
  name: string;
  currentWeight: number | null;
  weightUnit?: string; // Assuming default 'kg' if not specified
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
  const [catData, setCatData] = useState<CatData | null>(null); // For name, current weight
  const [goalData, setGoalData] = useState<GoalData | null>(null); // For weight goal
  const [weightHistory, setWeightHistory] = useState<WeightMeasurement[]>([]); // For calculations
  const [feedingHistory, setFeedingHistory] = useState<FeedingLog[]>([]); // For calculations
  const [calculatedData, setCalculatedData] = useState<CalculatedData>({ portionsSinceLast: null, avgPortionsPerDay: null });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // --- Fetch required data in parallel ---
        const [goalResponse, weightHistoryResponse, /* basicInfoResponse */ /* feedingResponse */] = await Promise.all([
          fetch(`/api/cats/${catId}/goal`),
          fetch(`/api/cats/${catId}/weight`),
          // TODO: Add fetch for basic cat info API
          // TODO: Add fetch for feeding log API - simulating for now
          new Promise<any>((resolve) => setTimeout(() => resolve({ // Simulate basic info
                ok: true,
                json: async () => ({ name: 'Mittens', weight: 5.2, unit: 'kg' }),
             }), 500)),
          new Promise<any>((resolve) => setTimeout(() => resolve({ // Simulate feeding logs
                ok: true,
                json: async () => [
                    { id: 1, catId: parseInt(catId), userId: 1, timestamp: new Date(Date.now() - 2*24*60*60*1000).toISOString(), portionSize: 50 },
                    { id: 2, catId: parseInt(catId), userId: 1, timestamp: new Date(Date.now() - 1*24*60*60*1000).toISOString(), portionSize: 60 },
                    { id: 3, catId: parseInt(catId), userId: 1, timestamp: new Date().toISOString(), portionSize: 55 },
                ]
             }), 600)),
        ]);

        // --- Process Responses ---
        // Basic Info (Simulated)
        if (!simulatedBasicInfoResponse.ok) throw new Error('Failed to fetch basic cat info'); // Replace simulation later
        const basicInfoData = await simulatedBasicInfoResponse.json();
        setCatData({
            name: basicInfoData.name,
            currentWeight: basicInfoData.weight,
            weightUnit: basicInfoData.unit || 'kg',
        });

        // Goal
        if (!goalResponse.ok) throw new Error(`Failed to fetch weight goal: ${goalResponse.statusText}`);
        const fetchedGoalData: GoalData = await goalResponse.json();
        setGoalData(fetchedGoalData);

        // Weight History
        if (!weightHistoryResponse.ok) throw new Error(`Failed to fetch weight history: ${weightHistoryResponse.statusText}`);
        const fetchedWeightHistory: WeightMeasurement[] = await weightHistoryResponse.json();
        setWeightHistory(fetchedWeightHistory); // Assuming sorted desc by API

        // Feeding History (Simulated)
        if (!simulatedFeedingResponse.ok) throw new Error('Failed to fetch feeding history'); // Replace simulation later
        const fetchedFeedingHistory: FeedingLog[] = await simulatedFeedingResponse.json();
        setFeedingHistory(fetchedFeedingHistory);

        // --- Perform Calculations ---
        if (fetchedWeightHistory.length >= 1) {
            const lastMeasurement = fetchedWeightHistory[0]; // Newest measurement
            const lastMeasurementTime = new Date(lastMeasurement.measuredAt);

            // Find timestamp of the measurement *before* the latest one for calculations
            const previousMeasurementTime = fetchedWeightHistory.length > 1
                ? new Date(fetchedWeightHistory[1].measuredAt)
                : null; // No previous measurement

            if (previousMeasurementTime) {
                // Calculate Portions Since Last
                const feedingsSinceLast = fetchedFeedingHistory.filter(log =>
                    new Date(log.timestamp) > previousMeasurementTime && new Date(log.timestamp) <= lastMeasurementTime
                );
                const totalPortions = feedingsSinceLast.reduce((sum, log) => sum + (log.portionSize || 0), 0);
                setCalculatedData(prev => ({ ...prev, portionsSinceLast: totalPortions }));

                // Calculate Avg Daily Portions (since previous measurement)
                const timeDiff = lastMeasurementTime.getTime() - previousMeasurementTime.getTime();
                const daysDiff = Math.max(1, timeDiff / (1000 * 60 * 60 * 24)); // Avoid division by zero, minimum 1 day
                const avgPortions = totalPortions / daysDiff;
                setCalculatedData(prev => ({ ...prev, avgPortionsPerDay: avgPortions }));
            } else {
                // Not enough history for calculations
                 setCalculatedData({ portionsSinceLast: 0, avgPortionsPerDay: null });
            }
        } else {
            // No weight history yet
             setCalculatedData({ portionsSinceLast: 0, avgPortionsPerDay: null });
        }

      } catch (err) {
        console.error("Error fetching weight tracker data:", err);
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(message);
        toast.error(`Failed to load data: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [catId]); // Re-fetch if catId changes

  const displayWeight = (weight: number | null, unit: string = 'kg') => {
      return weight !== null ? `${weight} ${unit}` : 'N/A';
  };

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
          ) : (
            <div className="flex items-center justify-center h-full border rounded-md">
              <p className="text-muted-foreground">Graph Placeholder</p>
              {/* TODO: Implement actual chart using Recharts or similar */}
              {/* <ResponsiveContainer width="100%" height="100%">
                <LineChart data={placeholderChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer> */}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
         {/* TODO: Implement Add Weight functionality (e.g., a Dialog) */}
         <Button>Add New Weight Measurement</Button>
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