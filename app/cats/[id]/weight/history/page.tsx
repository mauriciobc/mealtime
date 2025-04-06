'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
// ... other imports ...

// ... interface WeightMeasurement ...

export default function WeightHistoryPage() {
    const params = useParams();
    const router = useRouter();
    const catId = params.id as string; // Get id from route

    // ... State hooks ...

    useEffect(() => {
        const fetchHistory = async () => {
            if (!catId) return;

            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/cats/${catId}/weight`); // Use catId variable
                // ... (handle response) ...
            } catch (err) {
                // ... (handle error) ...
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [catId]); // Dependency is correct

    return (
        <div className="container mx-auto px-4 py-8">
            {/* ... Back button ... */}
            <h1 className="text-3xl font-bold mb-6">Weight Measurement History (Cat ID: {catId})</h1> {/* Use catId variable */}
            {/* ... Error message ... */}
            {/* ... Loading Skeleton or Table ... */}
        </div>
    );
} 