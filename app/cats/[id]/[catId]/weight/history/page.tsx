'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Use hooks for client components
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Re-use interface from main page or define locally
interface WeightMeasurement {
    id: number;
    catId: number;
    weight: number;
    unit: string;
    measuredAt: string; // ISO Date string
    createdAt: string;
    updatedAt: string;
}

export default function WeightHistoryPage() {
    const params = useParams();
    const router = useRouter();
    const catId = params.catId as string; // Get catId from route

    const [history, setHistory] = useState<WeightMeasurement[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!catId) return; // Don't fetch if catId isn't available yet

            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/cats/${catId}/weight`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch weight history: ${response.statusText}`);
                }
                const data: WeightMeasurement[] = await response.json();
                setHistory(data); // Assuming API returns sorted desc
            } catch (err) {
                console.error("Error fetching weight history:", err);
                const message = err instanceof Error ? err.message : 'An unknown error occurred';
                setError(message);
                toast.error(`Failed to load history: ${message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [catId]);

    return (
        <div className="container mx-auto px-4 py-8">
            <Button variant="outline" size="icon" className="mb-4" onClick={() => router.back()}>
                 <ArrowLeft className="h-4 w-4" />
                 <span className="sr-only">Back</span>
            </Button>
            <h1 className="text-3xl font-bold mb-6">Weight Measurement History (Cat ID: {catId})</h1>

            {error && (
                <p className="text-destructive mb-4">Error loading history: {error}</p>
            )}

            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : (
                <Table>
                    <TableCaption>{history.length === 0 ? 'No weight measurements recorded yet.' : 'A list of recorded weight measurements.'}</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Measured Date</TableHead>
                            <TableHead className="text-right">Weight</TableHead>
                            <TableHead className="w-[80px] text-right">Unit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.length > 0 ? (
                            history.map((measurement) => (
                                <TableRow key={measurement.id}>
                                    <TableCell className="font-medium">
                                        {format(new Date(measurement.measuredAt), 'PPpp')} {/* e.g., Apr 6, 2025 at 5:48:30 PM */}
                                    </TableCell>
                                    <TableCell className="text-right">{measurement.weight.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{measurement.unit}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">
                                    No measurements found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}
        </div>
    );
} 