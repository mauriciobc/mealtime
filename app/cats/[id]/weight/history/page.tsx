'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

// Define the WeightMeasurement interface
interface WeightMeasurement {
  id: number;
  catId: number;
  weight: number;
  unit: string;
  measuredAt: string; // ISO Date string
}

export default function WeightHistoryPage() {
    const params = useParams();
    const router = useRouter();
    const catId = params.id as string; // Get id from route

    // State hooks
    const [weightHistory, setWeightHistory] = useState<WeightMeasurement[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [catName, setCatName] = useState<string>(''); // Optional: Add cat name

    useEffect(() => {
        const fetchHistoryAndName = async () => { // Renamed function
            if (!catId) return;

            setIsLoading(true);
            setError(null);
            setWeightHistory([]); // Clear previous history on new fetch

            try {
                 // Fetch both history and basic info concurrently
                const [historyResponse, basicInfoResponse] = await Promise.all([
                    fetch(`/api/cats/${catId}/weight`),
                    fetch(`/api/cats/${catId}/basic-info`) // Fetch basic info for name
                ]);

                // Handle Basic Info Response
                if (basicInfoResponse.ok) {
                    const basicInfoData = await basicInfoResponse.json();
                    setCatName(basicInfoData.name || '');
                } else {
                    console.warn('Failed to fetch cat name');
                    // Don't block history display if name fails
                }

                // Handle History Response
                if (!historyResponse.ok) {
                    const errorData = await historyResponse.json().catch(() => ({}));
                    throw new Error(errorData.error || `Falha ao buscar histórico de peso: ${historyResponse.statusText}`);
                }

                const data: WeightMeasurement[] = await historyResponse.json();
                // Sort data descending by date (most recent first)
                const sortedData = data.sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
                setWeightHistory(sortedData);

            } catch (err) {
                console.error("Error fetching weight history:", err);
                const message = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido';
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistoryAndName(); // Call the combined function
    }, [catId]); // Dependency is correct

    const handleBack = () => {
        router.back(); // Navigate back
    };

    // Helper to display weight consistently
    const displayWeight = (weight: number | null | undefined, unit: string | null | undefined) => {
        if (weight === null || weight === undefined) return 'N/A';
        return `${weight} ${unit || 'kg'}`;
    };


    return (
        <div className="container mx-auto px-4 py-8 pb-24"> {/* Added bottom padding */}
             <div className="flex items-center gap-4 mb-6">
                 <Button variant="ghost" size="icon" onClick={handleBack}>
                     <ArrowLeft className="h-5 w-5" />
                     <span className="sr-only">Voltar</span>
                 </Button>
                <h2 className="text-2xl font-semibold tracking-tight">
                    Histórico de Peso {catName ? `de ${catName}` : ''}
                </h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Medições</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading && (
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    )}
                    {error && (
                        <p className="text-destructive text-center">{error}</p>
                    )}
                    {!isLoading && !error && weightHistory.length === 0 && (
                        <p className="text-muted-foreground text-center">Nenhum histórico de peso registrado ainda.</p>
                    )}
                    {!isLoading && !error && weightHistory.length > 0 && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead className="text-right">Peso</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {weightHistory.map((measurement) => (
                                    <TableRow key={measurement.id}>
                                        <TableCell>{format(new Date(measurement.measuredAt), 'PPP')}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {displayWeight(measurement.weight, measurement.unit)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 