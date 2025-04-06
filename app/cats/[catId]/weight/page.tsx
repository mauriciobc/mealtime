'use client'; // Required for hooks and event handlers

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
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'; // Import later for graph

// Placeholder data - replace with actual data fetching later
const placeholderData = {
  catName: 'Mittens',
  currentWeight: 5.2,
  weightUnit: 'kg',
  weightGoal: 5.0,
  portionsSinceLast: 15,
  avgPortionsPerDay: 2.5,
};

// TODO: Define data structure for chart data
const placeholderChartData = [
  { name: 'Week 1', weight: 5.5 },
  { name: 'Week 3', weight: 5.4 },
  { name: 'Week 5', weight: 5.3 },
  { name: 'Week 7', weight: 5.2 },
];

export default function CatWeightTrackerPage({
  params,
}: { // Destructure params
  params: { catId: string };
}) {
  const { catId } = params;
  const isLoading = false; // Placeholder for loading state

  // TODO: Fetch actual cat data, weight history, goal etc. using catId

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        Weight Tracker for {isLoading ? <Skeleton className="h-8 w-32 inline-block" /> : placeholderData.catName} (ID: {catId})
      </h1>

      {/* Top Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Current Weight Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Weight</CardTitle>
            <CardDescription>Last measurement</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-3/4" />
            ) : (
              <p className="text-2xl font-semibold">
                {placeholderData.currentWeight} {placeholderData.weightUnit}
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
            {isLoading ? (
              <Skeleton className="h-10 w-3/4" />
            ) : placeholderData.weightGoal ? (
              <p className="text-2xl font-semibold">
                {placeholderData.weightGoal} {placeholderData.weightUnit}
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
            <CardDescription>Since last weigh-in</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-1/2" />
            ) : (
              <p className="text-2xl font-semibold">{placeholderData.portionsSinceLast}</p>
            )}
          </CardContent>
        </Card>

        {/* Average Portions Per Day Card */}
        <Card>
          <CardHeader>
            <CardTitle>Avg. Daily Portions</CardTitle>
            <CardDescription>Calculated average</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-1/2" />
            ) : (
              <p className="text-2xl font-semibold">{placeholderData.avgPortionsPerDay.toFixed(1)}</p>
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