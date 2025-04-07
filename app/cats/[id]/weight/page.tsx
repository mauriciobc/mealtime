'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useParams } from 'next/navigation'; // Import useParams hook
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link'; // Import Link from next/link
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, formatDistanceToNow, differenceInYears, differenceInMonths, differenceInDays } from 'date-fns'; // Import formatDistanceToNow
import { ptBR } from 'date-fns/locale'; // Import ptBR locale
// Import only FeedingLog
import { FeedingLog } from '@/lib/types';
import { ArrowLeft } from 'lucide-react'; // Import ArrowLeft icon
// Import icons for cards
import { Scale, Target, Drumstick, CalendarDays, History, Plus, Cake, UtensilsCrossed } from 'lucide-react';

// Define missing types locally (based on previous context/usage)
interface CatBasicInfo {
  id: number;
  name: string;
  currentWeight: number | null;
  weightUnit: string | null;
  birthdate?: string | Date | null; // Can be string from API, then Date
  portion_size?: number | null;
}

interface GoalData {
  weightGoal: number | null;
}

interface WeightMeasurement {
  id: number;
  catId: number;
  weight: number;
  unit: string;
  measuredAt: string; // ISO Date string
}

interface CalculatedData {
  portionsSinceLast: number | null;
  avgPortionsPerDay: number | null;
}

// Remove params from function signature
export default function CatWeightTrackerPage() {
  const params = useParams(); // Call the hook inside the component
  const catId = params.id as string; // Extract id, cast to string
  console.log("[WeightTrackerPage] Rendering with catId:", catId); // Log catId

  // State hooks
  const [catData, setCatData] = useState<CatBasicInfo | null>(null);
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [weightHistory, setWeightHistory] = useState<WeightMeasurement[]>([]);
  const [feedingHistory, setFeedingHistory] = useState<FeedingLog[]>([]);
  const [calculatedData, setCalculatedData] = useState<CalculatedData>({ portionsSinceLast: null, avgPortionsPerDay: null });
  const [isLoading, setIsLoading] = useState<boolean>(true); // Ensure isLoading state is declared
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [weightInput, setWeightInput] = useState<string>("");
  const [unitInput, setUnitInput] = useState<string>("kg");
  const [dateInput, setDateInput] = useState<string>("");

  // --- Data Fetching Logic (fetchData) ---
  const fetchData = useCallback(async () => {
    // Ensure catId is valid before proceeding within the fetch logic
    if (!catId || typeof catId !== 'string') {
        console.warn("[WeightTrackerPage] fetchData called with invalid catId:", catId);
        setError("ID do Gato inválido.");
        setIsLoading(false);
        return;
    }
    console.log("[WeightTrackerPage] Starting fetchData for catId:", catId);
    setIsLoading(true);
    setError(null);
    // Clear potentially stale calculation data on new fetch
    setCalculatedData({ portionsSinceLast: null, avgPortionsPerDay: null });
    setFeedingHistory([]); // Clear old feeding logs

    try {
      // --- Fetch initial data (excluding feedings) ---
      const [goalResponse, weightHistoryResponse, basicInfoResponse] = await Promise.all([
        fetch(`/api/cats/${catId}/goal`),
        fetch(`/api/cats/${catId}/weight`),
        fetch(`/api/cats/${catId}/basic-info`),
      ]);
      console.log("[WeightTrackerPage] Initial fetches completed:", {
          goalStatus: goalResponse.status,
          weightHistoryStatus: weightHistoryResponse.status,
          basicInfoStatus: basicInfoResponse.status
      });

      // --- Process Initial Responses ---
      // Basic Info
      if (!basicInfoResponse.ok) {
        const errorData = await basicInfoResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao buscar informações básicas do gato: ${basicInfoResponse.statusText}`);
      }
      const basicInfoData: CatBasicInfo = await basicInfoResponse.json();
      console.log("[WeightTrackerPage] Fetched Basic Info:", basicInfoData);
      setCatData(basicInfoData);

      // Goal
      if (!goalResponse.ok) {
         const errorData = await goalResponse.json().catch(() => ({}));
         throw new Error(errorData.error || `Falha ao buscar meta de peso: ${goalResponse.statusText}`);
      }
      const fetchedGoalData: GoalData = await goalResponse.json();
      console.log("[WeightTrackerPage] Fetched Goal Data:", fetchedGoalData);
      setGoalData(fetchedGoalData);

      // Weight History
      if (!weightHistoryResponse.ok) {
        const errorData = await weightHistoryResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao buscar histórico de peso: ${weightHistoryResponse.statusText}`);
      }
      const fetchedWeightHistoryRaw: WeightMeasurement[] = await weightHistoryResponse.json();
      console.log(`[WeightTrackerPage] Fetched Weight History (Raw Count: ${fetchedWeightHistoryRaw.length}):`, fetchedWeightHistoryRaw);
      // Sort ASC for chart and update state
      const sortedWeightHistory = fetchedWeightHistoryRaw.sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
      setWeightHistory(sortedWeightHistory);

      // --- Fetch Feedings & Calculate (only if enough weight history) ---
      let calculatedPortions: number | null = 0;
      let calculatedAvg: number | null = null;

      // Use the raw fetched history (API default is desc) for finding previous date
      if (fetchedWeightHistoryRaw.length > 1) {
          const lastMeasurement = fetchedWeightHistoryRaw[0]; // API returns desc, so [0] is latest
          const lastMeasurementTime = new Date(lastMeasurement.measuredAt);
          // IMPORTANT: Access [1] only *after* confirming length > 1
          const previousMeasurementTime = new Date(fetchedWeightHistoryRaw[1].measuredAt);
          console.log("[WeightTrackerPage] Found previous measurement time:", previousMeasurementTime.toISOString());

          // Fetch feeding logs since the previous measurement
          const feedingApiUrl = `/api/cats/${catId}/feeding?since=${previousMeasurementTime.toISOString()}`;
          console.log("[WeightTrackerPage] Fetching feeding logs:", feedingApiUrl);
          let fetchedFeedingHistory: FeedingLog[] = [];
          try {
            const feedingResponse = await fetch(feedingApiUrl);
            console.log("[WeightTrackerPage] Feeding log fetch status:", feedingResponse.status);
            if (!feedingResponse.ok) {
                  const errorData = await feedingResponse.json().catch(() => ({}));
                  console.error(`Failed to fetch feeding history: ${errorData.error || feedingResponse.statusText}`);
                  toast.error(`Não foi possível carregar dados de alimentação para cálculos: ${errorData.error || feedingResponse.statusText}`);
            } else {
                  fetchedFeedingHistory = await feedingResponse.json();
                  console.log(`[WeightTrackerPage] Fetched Feeding History (Count: ${fetchedFeedingHistory.length}):`, fetchedFeedingHistory);
            }
          } catch (feedingErr) {
             console.error("Error fetching feeding history:", feedingErr);
             toast.error("Não foi possível carregar dados de alimentação para cálculos.");
          }
          setFeedingHistory(fetchedFeedingHistory); // Update state even if empty/errored

          // Perform calculations using the fetched feedings
          const feedingsSinceLast = fetchedFeedingHistory.filter(log =>
              new Date(log.timestamp) <= lastMeasurementTime // Ensure logs are not *after* the last measurement
          );
          const totalPortions = feedingsSinceLast.reduce((sum, log) => sum + (log.portionSize || 0), 0);
          const timeDiff = lastMeasurementTime.getTime() - previousMeasurementTime.getTime();
          const daysDiff = Math.max(1, timeDiff / (1000 * 60 * 60 * 24));
          const avgPortions = totalPortions / daysDiff;

          console.log("[WeightTrackerPage] Calculated Data:", { totalPortions, avgPortions });
          calculatedPortions = totalPortions;
          calculatedAvg = avgPortions;
      }
      // If length <= 1, defaults (0, null) are used

      // Update calculated data state
      setCalculatedData({ portionsSinceLast: calculatedPortions, avgPortionsPerDay: calculatedAvg });

    } catch (err) {
      console.error("Error fetching weight tracker data:", err);
      const message = err instanceof Error ? err.message : 'Ocorreu um erro inesperado';
      setError(message);
    } finally {
      console.log("[WeightTrackerPage] Setting isLoading to false.");
      setIsLoading(false);
    }
  }, [catId]);

  // --- useEffect Hook ---
  useEffect(() => {
    // Only run fetch if catId is valid
    if (catId && typeof catId === 'string') {
      fetchData();
    } else {
      // Handle the case where catId is not yet available or invalid
      console.warn("[WeightTrackerPage] useEffect: catId not valid on mount or change:", catId);
      // Optionally set an error state or leave loading
      // setError("Cat ID not found in URL.");
      // setIsLoading(false); // Or keep loading until catId resolves
    }
  // Depend only on catId for triggering the fetch
  }, [catId, fetchData]); // Include fetchData because it's used in the effect

  // --- Form Submission Handler ---
  const handleWeightSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default form submission
    setFormError(null); // Clear previous form errors

    // Basic Validation
    const weightValue = parseFloat(weightInput);
    if (isNaN(weightValue) || weightValue <= 0) {
      setFormError("Por favor, insira um peso positivo válido.");
      return;
    }
    if (!dateInput) {
      setFormError("Por favor, selecione uma data válida.");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("[WeightTrackerPage] Submitting weight:", { weight: weightValue, unit: unitInput, measuredAt: dateInput });
      const response = await fetch(`/api/cats/${catId}/weight`, { // Use catId variable
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weight: weightValue,
          unit: unitInput,
          measuredAt: new Date(dateInput).toISOString(), // Ensure ISO format for backend
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error || `Falha ao salvar medição: ${response.statusText}`;
        console.error("[WeightTrackerPage] API Error saving weight:", message);
        setFormError(message);
        toast.error(message);
      } else {
        const newMeasurement = await response.json();
        console.log("[WeightTrackerPage] Weight saved successfully:", newMeasurement);
        toast.success("Medição de peso salva!");
        setIsDialogOpen(false); // Close dialog on success
        // Reset form fields
        setWeightInput("");
        // Keep unit as is? Or reset to default? Let's keep it for now.
        setDateInput("");
        fetchData(); // Re-fetch data to update the page
      }
    } catch (err) {
      console.error("[WeightTrackerPage] Network/Client Error saving weight:", err);
      const message = err instanceof Error ? err.message : 'Ocorreu um erro inesperado.';
      setFormError(message);
      toast.error(`Falha ao salvar medição: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Helper to display weight consistently ---
  const displayWeight = (weight: number | null | undefined, unit: string | null | undefined) => {
    if (weight === null || weight === undefined) return 'N/A';
    return `${weight} ${unit || 'kg'}`;
  };

  // --- Helper to display age ---
  const displayAge = (birthdate: string | Date | null | undefined): string => {
    if (!birthdate) return 'N/A';
    try {
      const bd = new Date(birthdate);
      if (isNaN(bd.getTime())) return 'Data Inválida'; // Handle invalid date string

      const now = new Date();
      const years = differenceInYears(now, bd);
      if (years > 0) return `${years} ano${years > 1 ? 's' : ''}`;

      const months = differenceInMonths(now, bd);
      if (months > 0) return `${months} ${months > 1 ? 'meses' : 'mês'}`;

      const days = differenceInDays(now, bd);
      return `${days} dia${days > 1 ? 's' : ''}`;
    } catch (e) {
      console.error("Error parsing birthdate:", e);
      return 'Erro ao calcular';
    }
  };

  // --- Format data for Recharts ---
  const formattedChartData = weightHistory.map(item => ({
    ...item,
    measuredAtFormatted: format(new Date(item.measuredAt), 'MMM d'), // Format for X-axis
    fullDate: format(new Date(item.measuredAt), 'PPP'), // Format for Tooltip
    unit: item.unit || catData?.weightUnit || 'kg' // Ensure unit consistency for tooltip
  }));

  // Add a check before rendering
  console.log("[WeightTrackerPage] State before render:", { isLoading, error, catData, goalData, calculatedData, weightHistory });

  return (
    <div className="container mx-auto px-4 py-8 pb-32">
        <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
                <Link href={`/cats/${catId}`} passHref>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Voltar para o Perfil do Gato</span>
                    </Button>
                </Link>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Monitor de Peso para {isLoading || !catData ? (
                        <Skeleton className="h-7 w-32 inline-block" />
                    ) : (
                        catData.name
                    )}
                </h1>
            </div>
            <Link href={`/cats/${catId}/weight/history`} passHref>
                 <Button variant="ghost" size="icon">
                    <History className="h-5 w-5" />
                    <span className="sr-only">Ver Histórico Completo</span>
                </Button>
            </Link>
        </div>

      {error && (
        <Card className="mb-6 bg-destructive/10 border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">Erro ao Carregar Dados</CardTitle>
            </CardHeader>
            <CardContent>
                <p>{error}</p>
            </CardContent>
        </Card>
      )}

      {/* --- Info Cards --- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {/* Current Weight Card */}
        <Card className="lg:col-span-1"> {/* Span 1 */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2"> {/* Container for icon and title */}
                <Scale className="h-4 w-4 text-muted-foreground" /> {/* Icon */}
                <CardTitle className="text-sm font-medium">Peso Atual</CardTitle>
              </div>
          </CardHeader>
          <CardContent>
            {isLoading || !catData ? (
              <Skeleton className="h-7 w-3/4 mt-1" />
            ) : (
              <div className="text-2xl font-bold">
                {displayWeight(catData.currentWeight, catData.weightUnit || 'kg')}
              </div>
            )}
             {/* Display relative time or fallback text */}
             <p className="text-xs text-muted-foreground mt-1">
               {!isLoading && weightHistory.length > 0
                 ? formatDistanceToNow(new Date(weightHistory[weightHistory.length - 1].measuredAt), { addSuffix: true, locale: ptBR })
                 : "Última medição"}
             </p>
          </CardContent>
        </Card>

        {/* Cat Age Card (New) */}
        <Card className="lg:col-span-1"> {/* Span 1 */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Cake className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Idade</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading || !catData ? (
              <Skeleton className="h-7 w-3/4 mt-1" />
            ) : (
              <div className="text-2xl font-bold">
                {displayAge(catData.birthdate)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {!isLoading && catData?.birthdate ? format(new Date(catData.birthdate), 'PPP', { locale: ptBR }) : "Data de nascimento"}
            </p>
          </CardContent>
        </Card>

        {/* Portion Size Card (New) */}
        <Card className="lg:col-span-1"> {/* Span 1 */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Porção Padrão</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading || !catData ? (
              <Skeleton className="h-7 w-3/4 mt-1" />
            ) : catData.portion_size !== null && catData.portion_size !== undefined ? (
              <div className="text-2xl font-bold">
                {/* Assuming portion size is in grams, adjust if needed */}
                {catData.portion_size} g
              </div>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground italic">-</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Por refeição (padrão)
            </p>
          </CardContent>
        </Card>

        {/* Goal Weight Card */}
        <Card className="lg:col-span-1"> {/* Ensure span 1 on LG */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Meta de Peso</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading || !goalData ? (
                  <Skeleton className="h-7 w-3/4 mt-1" />
                ) : goalData.weightGoal !== null ? (
                  <div className="text-2xl font-bold">
                    {displayWeight(goalData.weightGoal, catData?.weightUnit || 'kg')}
                  </div>
                ) : (
                    <div className="text-2xl font-bold text-muted-foreground italic">-</div>
                )}
                 {/* Conditionally render description text or 'Set goal' button */}
                 {!isLoading && goalData && (
                    goalData.weightGoal !== null ? (
                        <p className="text-xs text-muted-foreground mt-1">
                            Peso alvo
                        </p>
                    ) : (
                        <Button
                            variant="link"
                            className="text-xs text-muted-foreground h-auto p-0 mt-1 font-normal block" // Use block to align margin correctly
                            // TODO: Add onClick handler to open goal setting modal/page
                            onClick={() => toast.info('Funcionalidade Definir Meta ainda não implementada.')} // Placeholder action
                        >
                            Definir meta
                        </Button>
                    )
                 )}
                 {/* Show skeleton for description if main content is loading */}
                 {isLoading && <Skeleton className="h-4 w-1/2 mt-1" />}
            </CardContent>
        </Card>

        {/* Portions Since Last Measurement Card */}
        <Card className="lg:col-span-1"> {/* Removed col-span-2 md:col-span-1 */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                    <Drumstick className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Porções Fornecidas</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                  <Skeleton className="h-7 w-1/2 mt-1" />
                ) : calculatedData.portionsSinceLast !== null ? (
                  <div className="text-2xl font-bold">{calculatedData.portionsSinceLast}</div>
                ) : (
                    <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                    Entre as duas últimas pesagens
                </p>
            </CardContent>
        </Card>

        {/* Average Portions Per Day Card */}
        <Card className="lg:col-span-1"> {/* Removed col-span-2 md:col-span-1 */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Média Diária de Porções</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-7 w-1/2 mt-1" />
                ) : calculatedData.avgPortionsPerDay !== null ? (
                    <div className="text-2xl font-bold">{calculatedData.avgPortionsPerDay.toFixed(1)}</div>
                ) : (
                    <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                    Entre as duas últimas pesagens
                </p>
            </CardContent>
        </Card>
      </div>

      {/* --- Graph Section --- */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Progresso do Peso</CardTitle>
          <CardDescription>Peso medido ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent className="h-48 md:h-64">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : weightHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="measuredAtFormatted" />
                  <YAxis unit={catData?.weightUnit || 'kg'} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number, name: string, props) => [`${value} ${props.payload.unit}`, `Peso`]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload.fullDate || label}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} dot={{ r: 4 }} name="Peso" unit={catData?.weightUnit || 'kg'} />
                   {goalData?.weightGoal && (
                      <Line type="monotone" dataKey={() => goalData.weightGoal} stroke="hsl(var(--destructive))" strokeDasharray="5 5" dot={false} activeDot={false} name="Meta" strokeWidth={1} />
                  )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
             <div className="flex items-center justify-center h-full border rounded-md">
              <p className="text-muted-foreground">Nenhum histórico de peso registrado ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mt-6">
        {/* --- Add Weight Measurement Dialog --- */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
                <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Medição de Peso
                </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Medição de Peso</DialogTitle>
              <DialogDescription>
                Insira o peso e a data em que foi medido.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleWeightSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="weight" className="text-right">
                    Peso
                  </Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01" // Allow decimals
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className="col-span-3" // Adjusted span since unit is removed
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    Data
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                {formError && (
                  <p className="text-sm text-red-500 col-span-4 text-center">{formError}</p>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                   <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Medição'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {/* --- End Add Weight Dialog --- */}
      </div>
    </div>
  );
} 