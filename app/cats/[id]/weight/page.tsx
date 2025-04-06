'use client';

// ... imports ...

// ... interfaces ...

export default function CatWeightTrackerPage({
  params,
}: {
  params: { id: string }; // Updated param name
}) {
  const catId = params.id; // Use params.id

  // ... State hooks ...

  // --- Data Fetching Logic ---
  const fetchData = useCallback(async () => {
    // ... (inside try block) ...
      const [goalResponse, weightHistoryResponse, basicInfoResponse] = await Promise.all([
        fetch(`/api/cats/${catId}/goal`), // Use catId variable
        fetch(`/api/cats/${catId}/weight`), // Use catId variable
        fetch(`/api/cats/${catId}/basic-info`), // Use catId variable
      ]);
      // ... (process responses) ...

      // --- Fetch Feeding History ---
      if (previousMeasurementTime) {
          const feedingApiUrl = `/api/cats/${catId}/feeding?since=${previousMeasurementTime.toISOString()}`; // Use catId variable
          // ... (fetch feeding logs) ...
      }
      // ... (perform calculations) ...
  }, [catId]); // Dependency is correct

  // ... useEffect(() => { fetchData(); }, [fetchData]); ...

  // --- Form Submission Handler ---
  const handleWeightSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // ... (validation) ...
    try {
        const response = await fetch(`/api/cats/${catId}/weight`, { // Use catId variable
            // ... (method, headers, body) ...
        });
        // ... (handle response) ...
    } catch (err) {
        // ... (handle error) ...
    }
  };

  // ... displayWeight helper ...

  // ... formattedChartData ...

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        {/* ... */} (ID: {catId})
      </h1>
      {/* ... Error Card ... */}
      {/* ... Info Cards ... */}
      {/* ... Graph Section ... */}
      {/* ... Action Buttons ... */}
         <Link href={`/cats/${catId}/feeding`} passHref> {/* Use catId variable */}
             <Button variant="secondary">Log Feeding</Button>
         </Link>
         <Link href={`/cats/${catId}/weight/history`} passHref> {/* Use catId variable */}
            <Button variant="outline">View Full History</Button>
         </Link>
      {/* ... */}
    </div>
  );
} 