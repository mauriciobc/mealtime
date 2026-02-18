"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, addHours, isToday, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { m, AnimatePresence } from "framer-motion";
import { formatInTimeZone } from 'date-fns-tz';
import { getUserTimezone, calculateNextFeeding, formatDateTimeForDisplay } from '@/lib/utils/dateUtils';
import { CatType, FeedingLog } from "@/lib/types";
import { useUserContext } from "@/lib/context/UserContext";
import { useLoading } from "@/lib/context/LoadingContext";
import { useCats } from "@/lib/context/CatsContext";
import { useFeeding } from "@/lib/context/FeedingContext";

// Interface para a resposta da API de alimentação
interface ApiFeedingResponse {
  id: string;
  cat_id: string;
  fed_by: string | null;
  fed_at: string;
  amount: number;
  notes: string | null;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  food_type?: string | null;
  household_id: string;
  tempId?: string; // Identificador temporário para lookup do status
}
import Link from "next/link";
import { 
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Clock, Bell, Cat as CatIcon, Utensils, X, CheckCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface NewFeedingSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialCatId?: number;
  initialFeedingLog?: FeedingLog;
}

export function NewFeedingSheet({ 
    isOpen, 
    onOpenChange, 
    initialCatId,
    initialFeedingLog
}: NewFeedingSheetProps) {
  const router = useRouter();
  const { state: userState, refreshUser } = useUserContext();
  const { state: catsState } = useCats();
  const { state: feedingState, dispatch: feedingDispatch } = useFeeding();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const { currentUser } = userState;
  const { cats, isLoading: isLoadingCats } = catsState;
  const { feedingLogs, isLoading: isLoadingFeedings } = feedingState;

  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [portions, setPortions] = useState<{ [key: string]: string }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [feedingStatus, setFeedingStatus] = useState<{ [key: string]: "Normal" | "Comeu Pouco" | "Recusou" | "Vomitou" | "Outro" }>({});
  const [foodTypes, setFoodTypes] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmDialogContent, setConfirmDialogContent] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const statusOptions = useMemo(() => [
    { value: "Normal", label: "Normal" },
    { value: "Comeu Pouco", label: "Comeu Pouco" },
    { value: "Recusou", label: "Recusou" },
    { value: "Vomitou", label: "Vomitou" },
    { value: "Outro", label: "Outro (ver notas)" },
  ], []);


  const foodTypeOptions = useMemo(() => [
    { value: "__none__", label: "Não especificado" },
    { value: "ração seca premium", label: "Ração Seca Premium" },
    { value: "ração seca standard", label: "Ração Seca Standard" },
    { value: "ração úmida sachê", label: "Ração Úmida Sachê" },
    { value: "ração úmida lata", label: "Ração Úmida Lata" },
    { value: "petisco", label: "Petisco" },
    { value: "ração terapêutica", label: "Ração Terapêutica" },
    { value: "ração para filhotes", label: "Ração para Filhotes" },
    { value: "ração para idosos", label: "Ração para Idosos" },
    { value: "comida caseira", label: "Comida Caseira" },
    { value: "medicamento", label: "Medicamento" },
    { value: "outro", label: "Outro" },
  ], []);

  const householdCats = useMemo(() => {
    if (isLoadingCats || !cats || !currentUser?.householdId) {
      // --- DEBUG --- 
      console.log('[NewFeedingSheet useMemo] Guard clause triggered:', { isLoadingCats, hasCats: !!cats, currentUserHouseholdId: currentUser?.householdId });
      // --- END DEBUG ---
      return [];
    }

    const userHouseholdIdStr = String(currentUser.householdId);

    // --- DEBUG ---
    console.log(`[NewFeedingSheet useMemo] User Household ID: '${userHouseholdIdStr}'`);
    console.log('[NewFeedingSheet useMemo] Cats from context:', cats);
    // --- END DEBUG ---

    const filteredCats = cats.filter(cat => {
      const catHouseholdIdStr = String(cat.householdId);
      const match = catHouseholdIdStr === userHouseholdIdStr;
      // --- DEBUG ---
      if (!match) {
        console.warn(`[NewFeedingSheet useMemo] Mismatch: Cat ID '${cat.id}' Household '${catHouseholdIdStr}' !== User Household '${userHouseholdIdStr}'`);
      }
      // --- END DEBUG ---
      return match;
    });

    // --- DEBUG ---
    console.log('[NewFeedingSheet useMemo] Filtered cats:', filteredCats);
    // --- END DEBUG ---

    return filteredCats;
  }, [cats, isLoadingCats, currentUser]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialFeedingLog) {
        // Edição: preencher campos com dados do log
        setSelectedCats([initialFeedingLog.catId]);
        setPortions({ [initialFeedingLog.catId]: initialFeedingLog.portionSize?.toString() || "" });
        setNotes({ [initialFeedingLog.catId]: initialFeedingLog.notes || "" });
        setFeedingStatus({ [initialFeedingLog.catId]: initialFeedingLog.status || "Normal" });
        setFoodTypes({ [initialFeedingLog.catId]: initialFeedingLog.food_type || "" });
      } else {
        // Criação padrão
        const initialPortions: { [key: string]: string } = {};
        householdCats.forEach((cat: CatType) => {
          initialPortions[cat.id] = cat.portion_size?.toString() || "";
        });
        setPortions(initialPortions);
        setNotes({});
        const initialCatIdStr = initialCatId?.toString();
        if (initialCatIdStr && householdCats.some(cat => cat.id === initialCatIdStr)) {
            setSelectedCats([initialCatIdStr]);
            setFeedingStatus({ [initialCatIdStr]: "Normal" });
            setFoodTypes({ [initialCatIdStr]: "" });
        } else {
            setSelectedCats([]);
            setFeedingStatus({});
            setFoodTypes({});
        }
      }
    } else {
      setSelectedCats([]);
      setPortions({});
      setNotes({});
      setFeedingStatus({});
      setFoodTypes({});
      setIsSubmitting(false);
      setError(null);
    }
  }, [isOpen, householdCats, initialCatId, cats, initialFeedingLog]);

  const formatRelativeTime = useCallback((utcDateTime: Date | string | null | undefined) => {
    if (!utcDateTime) return "Nunca";
    try {
      const date = typeof utcDateTime === 'string' ? new Date(utcDateTime) : utcDateTime;
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar tempo relativo:', error);
      return "Data inválida";
    }
  }, []);

  const getLastFeedingLog = useCallback((catId: string): FeedingLog | undefined => {
    if (isLoadingFeedings || !feedingLogs) return undefined;
    return feedingLogs
        .filter(log => log.catId === catId)
        [0];
  }, [feedingLogs, isLoadingFeedings]);

  const toggleCatSelection = useCallback((catId: string) => {
    setSelectedCats(prev => {
      const isCurrentlySelected = prev.includes(catId);
      if (isCurrentlySelected) {
        setFeedingStatus(currentStatus => {
          const { [catId]: _, ...rest } = currentStatus;
          return rest;
        });
        return prev.filter(id => id !== catId);
      } else {
        setFeedingStatus(currentStatus => ({
          ...currentStatus,
          [catId]: "Normal"
        }));
        return [...prev, catId];
      }
    });
  }, []);

  const handleSelectAll = useCallback(() => {
     const allCatIds = householdCats.map(cat => cat.id);
     setSelectedCats(allCatIds);
     const newStatus = allCatIds.reduce((acc, id) => ({ ...acc, [id]: "Normal" }), {});
     setFeedingStatus(newStatus);
  }, [householdCats]);

  const handleDeselectAll = useCallback(() => {
     setSelectedCats([]);
     setFeedingStatus({});
  }, []);

  const handlePortionChange = useCallback((catId: string, value: string) => {
    setPortions(prev => ({ ...prev, [catId]: value }));
  }, []);

  const handleNotesChange = useCallback((catId: string, value: string) => {
    setNotes(prev => ({ ...prev, [catId]: value }));
  }, []);

  const handleStatusChange = useCallback((catId: string, value: string) => {
    setFeedingStatus(prev => ({ ...prev, [catId]: value as "Normal" | "Comeu Pouco" | "Recusou" | "Vomitou" | "Outro" }));
  }, []);


  const handleFoodTypeChange = useCallback((catId: string, value: string) => {
    // Convert __none__ sentinel value to empty string for internal state storage
    const storedValue = value === "__none__" ? "" : value;
    setFoodTypes(prev => ({ ...prev, [catId]: storedValue }));
  }, []);

  // Função para determinar meal_type automaticamente baseado no horário
  const getMealTypeFromTime = useCallback((timestamp: Date | string): "breakfast" | "lunch" | "dinner" | "snack" => {
    // #region agent log
    const userTimezone = getUserTimezone(currentUser?.preferences?.timezone);
    const timestampRaw = typeof timestamp === 'string' ? timestamp : timestamp.toISOString();
    fetch('http://127.0.0.1:7245/ingest/3ddfe557-fe44-4525-9565-c9b887696afb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'new-feeding-sheet.tsx:264',message:'getMealTypeFromTime entry',data:{timestampRaw,timestampType:typeof timestamp,userTimezone,userTimezonePreference:currentUser?.preferences?.timezone},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    // Usar timezone do usuário para obter a hora correta
    const hourStr = formatInTimeZone(date, userTimezone, 'H');
    const hour = parseInt(hourStr, 10);
    
    // #region agent log
    const hourFromGetHours = date.getHours();
    const dateIso = date.toISOString();
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch('http://127.0.0.1:7245/ingest/3ddfe557-fe44-4525-9565-c9b887696afb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'new-feeding-sheet.tsx:272',message:'Hour calculation using user timezone',data:{hourFromGetHours,hourFromUserTimezone:hour,dateIso,browserTimezone,userTimezone,areHoursDifferent:hourFromGetHours !== hour,usingCorrectMethod:true},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    
    // Breakfast: 5h - 10h
    if (hour >= 5 && hour < 11) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/3ddfe557-fe44-4525-9565-c9b887696afb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'new-feeding-sheet.tsx:278',message:'Meal type inferred as breakfast',data:{hour,mealType:'breakfast'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,B,C,D'})}).catch(()=>{});
      // #endregion
      return "breakfast";
    }
    // Lunch: 11h - 14h
    if (hour >= 11 && hour < 15) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/3ddfe557-fe44-4525-9565-c9b887696afb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'new-feeding-sheet.tsx:283',message:'Meal type inferred as lunch',data:{hour,mealType:'lunch'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,B,C,D'})}).catch(()=>{});
      // #endregion
      return "lunch";
    }
    // Dinner: 17h - 20h
    if (hour >= 17 && hour < 21) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/3ddfe557-fe44-4525-9565-c9b887696afb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'new-feeding-sheet.tsx:288',message:'Meal type inferred as dinner',data:{hour,mealType:'dinner'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,B,C,D'})}).catch(()=>{});
      // #endregion
      return "dinner";
    }
    // Snack: resto do tempo (default)
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/3ddfe557-fe44-4525-9565-c9b887696afb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'new-feeding-sheet.tsx:293',message:'Meal type inferred as snack',data:{hour,mealType:'snack'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,B,C,D'})}).catch(()=>{});
    // #endregion
    return "snack";
  }, [currentUser?.preferences?.timezone]);

  const handleSubmit = async () => {
    if (selectedCats.length === 0) {
      toast.error("Selecione pelo menos um gato");
      return;
    }

    const opId = initialFeedingLog ? `edit-feeding-${initialFeedingLog.id}` : "submit-feeding-logs";
    setIsSubmitting(true);
    setError(null);
    addLoadingOperation({ id: opId, description: initialFeedingLog ? "Editando alimentação..." : "Registrando alimentações..." });

    const timestamp = initialFeedingLog ? initialFeedingLog.timestamp : new Date();
    const logsToCreate = [];
    let validationError = null;

    for (const catId of selectedCats) {
      const portion = portions[catId];
      const note = notes[catId] || "";
      const status = feedingStatus[catId] || "Normal";
      const foodType = foodTypes[catId] || "";
      // Determinar meal_type automaticamente baseado no horário
      const mealType = getMealTypeFromTime(timestamp);
      let portionNum = null;
      if (portion) {
        portionNum = parseFloat(portion);
        if (isNaN(portionNum) || portionNum < 0) {
          validationError = `Porção inválida para ${householdCats.find(c => c.id === catId)?.name}`;
          break;
        }
      }
      
      // Gerar tempId único para cada log
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logsToCreate.push({
        catId,
        portionSize: portionNum || 0,
        timestamp: typeof timestamp === 'string' ? timestamp : timestamp.toISOString(),
        notes: note,
        status,
        mealType,
        food_type: foodType?.trim() || undefined,
        unit: 'g',
        tempId // Adicionar tempId para lookup do status
      });
    }

    if (validationError) {
      toast.error("Erro de Validação", { description: validationError });
      setError(validationError);
      setIsSubmitting(false);
      removeLoadingOperation(opId);
      return;
    }

    try {
      let response: Response;
      let result: { logs?: ApiFeedingResponse[]; count?: number; [key: string]: any };
      
      // Criar Map para lookup do status antes da chamada da API
      const statusLookup = new Map<string, string>();
      logsToCreate.forEach(log => {
        // Usar tempId como chave para evitar problemas de timestamp
        statusLookup.set(log.tempId!, log.status);
      });
      
      if (initialFeedingLog && logsToCreate.length > 0) {
        // Edição: PUT em /api/v2/feedings/[id]
        const firstLog = logsToCreate[0]!; // Non-null assertion pois verificamos length > 0
        const updatePayload: any = {
          amount: firstLog.portionSize,
          notes: firstLog.notes,
          meal_type: getMealTypeFromTime(initialFeedingLog.timestamp),
          unit: firstLog.unit,
        };
        
        // Só incluir food_type se não for undefined
        if (firstLog.food_type !== undefined) {
          updatePayload.food_type = firstLog.food_type || null;
        }
        
        response = await fetch(`/api/v2/feedings/${initialFeedingLog.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Falha ao editar (${response.status})`);
        }
        result = await response.json();
        
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/3ddfe557-fe44-4525-9565-c9b887696afb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'new-feeding-sheet.tsx:401',message:'PUT response received',data:{result,hasData:!!result.data,resultKeys:Object.keys(result)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
        toast.success("Alimentação editada com sucesso!");
        
        // A API v2 retorna { success: true, data: {...} }
        const resultData = result.data || result;
        
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/3ddfe557-fe44-4525-9565-c9b887696afb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'new-feeding-sheet.tsx:407',message:'Processing resultData',data:{resultData,resultDataKeys:Object.keys(resultData),hasId:!!resultData.id,hasCatId:!!resultData.catId,hasUserId:!!resultData.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
        const isCurrentUser = resultData.userId === currentUser?.id;

        const updatedFeedingLog: FeedingLog = {
          id: resultData.id,
          catId: resultData.catId,
          userId: resultData.userId,
          timestamp: typeof resultData.timestamp === 'string' ? new Date(resultData.timestamp) : resultData.timestamp,
          portionSize: resultData.portionSize,
          notes: resultData.notes,
          mealType: resultData.mealType,
          food_type: resultData.food_type ?? null,
          householdId: resultData.householdId,
          user: resultData.user || {
            id: resultData.userId,
            name: isCurrentUser ? (currentUser?.name ?? null) : null,
            avatar: isCurrentUser ? (currentUser?.avatar ?? null) : null,
          },
          status: logsToCreate[0]?.status || "Normal",
        };
        
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/3ddfe557-fe44-4525-9565-c9b887696afb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'new-feeding-sheet.tsx:427',message:'FeedingLog created successfully',data:{updatedFeedingLogId:updatedFeedingLog.id,hasId:!!updatedFeedingLog.id,hasCatId:!!updatedFeedingLog.catId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
        feedingDispatch({ type: "UPDATE_FEEDING", payload: updatedFeedingLog });
      } else {
        // Criação padrão
        response = await fetch("/api/feedings/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logs: logsToCreate }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Falha ao registrar (${response.status})`);
        }
        result = await response.json();
        
        // Dispatch each created feeding to the context
        if (result.logs && Array.isArray(result.logs)) {
          (result.logs as ApiFeedingResponse[]).forEach((feeding: ApiFeedingResponse) => {
            // Verificar se o usuário que alimentou é o usuário atual
            const isCurrentUser = feeding.fed_by === currentUser?.id;
            
            // Buscar o status original usando o tempId com fallback seguro
            const mappedStatus = feeding.tempId ? statusLookup.get(feeding.tempId) : undefined;
            
            // Validar e definir status com fallback para "Normal"
            const validStatuses: Array<"Normal" | "Comeu Pouco" | "Recusou" | "Vomitou" | "Outro"> = [
              "Normal", "Comeu Pouco", "Recusou", "Vomitou", "Outro"
            ];
            const safeStatus = mappedStatus && validStatuses.includes(mappedStatus as any) 
              ? (mappedStatus as "Normal" | "Comeu Pouco" | "Recusou" | "Vomitou" | "Outro")
              : "Normal";
            
            const feedingLog: FeedingLog = {
              id: feeding.id,
              catId: feeding.cat_id,
              userId: feeding.fed_by || '',
              timestamp: new Date(feeding.fed_at),
              portionSize: feeding.amount ? Number(feeding.amount) : null,
              notes: feeding.notes ?? '',
              mealType: feeding.meal_type,
              food_type: feeding.food_type ?? null,
              householdId: feeding.household_id,
              user: {
                id: feeding.fed_by || '',
                // Usar dados do usuário atual apenas se for o mesmo que alimentou
                // Caso contrário, definir como null para ser hidratado posteriormente
                name: isCurrentUser ? (currentUser?.name || '') : '',
                avatar: isCurrentUser ? (currentUser?.avatar || undefined) : undefined,
              },
              cat: undefined,
              status: safeStatus,
              createdAt: new Date(feeding.fed_at),
            };
            feedingDispatch({ type: "ADD_FEEDING", payload: feedingLog });
          });
        }
        
        if (refreshUser) {
          await refreshUser();
        }
        toast.success(`${result.count} ${result.count === 1 ? 'alimentação registrada' : 'alimentações registradas'} com sucesso!`);
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error submitting feeding logs:", err);
      setError(err.message || "Ocorreu um erro desconhecido.");
      toast.error(initialFeedingLog ? "Erro ao Editar" : "Erro ao Registrar", { description: err.message || "Ocorreu um erro desconhecido." });
    } finally {
      setIsSubmitting(false);
      removeLoadingOperation(opId);
    }
  };

  const catListItems = useMemo(() => {
    if (isLoadingCats || !householdCats) {
      return <Loading />;
    }

    if (householdCats.length === 0) {
      return (
        <EmptyState
          IconComponent={Users}
          title="Nenhum gato encontrado"
          description="Você ainda não tem gatos cadastrados."
          actionButton={
            <Button asChild>
              <Link href="/cats">Cadastrar Gato</Link>
            </Button>
          }
        />
      );
    }

    return householdCats.map((cat) => {
      const isSelected = selectedCats.includes(cat.id);
      const lastFeeding = getLastFeedingLog(cat.id);
      const portion = portions[cat.id] || "";
      const status = feedingStatus[cat.id] || "Normal";
      const foodType = foodTypes[cat.id] || "";
      const note = notes[cat.id] || "";
      
      // Convert empty string to __none__ sentinel value for Select component
      // (Radix UI Select doesn't allow empty string values in SelectItem)
      const selectValue = foodType === "" ? "__none__" : foodType;

      return (
        <m.div
          key={cat.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className={cn(
            "relative overflow-hidden transition-colors",
            isSelected ? "border-primary" : "hover:border-muted-foreground/50"
          )}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Checkbox
                  id={`cat-${cat.id}`}
                  checked={isSelected}
                  onCheckedChange={() => toggleCatSelection(cat.id)}
                  className="mt-1"
                />
                <div className="flex-grow space-y-4">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor={`cat-${cat.id}`}
                      className="flex flex-grow items-center gap-3 cursor-pointer"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={cat.photo_url || ""} alt={cat.name} />
                        <AvatarFallback>
                          <CatIcon className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium leading-none">{cat.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Última refeição: {formatRelativeTime(lastFeeding?.timestamp)}
                        </p>
                      </div>
                    </Label>
                  </div>
                  {isSelected && (
                    <m.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`portion-${cat.id}`}>Porção (g)</Label>
                          <Input
                            id={`portion-${cat.id}`}
                            type="number"
                            min="0"
                            step="0.1"
                            value={portion}
                            onChange={(e) => handlePortionChange(cat.id, e.target.value)}
                            placeholder={cat.portion_size?.toString() || "0"}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`status-${cat.id}`}>Status</Label>
                          <Select value={status} onValueChange={(value) => handleStatusChange(cat.id, value as any)}>
                            <SelectTrigger id={`status-${cat.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor={`food-type-${cat.id}`}>Tipo de Comida</Label>
                          <Select 
                            value={selectValue} 
                            onValueChange={(value) => handleFoodTypeChange(cat.id, value)}
                          >
                            <SelectTrigger id={`food-type-${cat.id}`}>
                              <SelectValue placeholder="Não especificado" />
                            </SelectTrigger>
                            <SelectContent>
                              {foodTypeOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`notes-${cat.id}`}>Observações</Label>
                        <Input
                          id={`notes-${cat.id}`}
                          value={note}
                          onChange={(e) => handleNotesChange(cat.id, e.target.value)}
                          placeholder="Opcional"
                        />
                      </div>
                    </m.div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </m.div>
      );
    });
  }, [householdCats, isLoadingCats, getLastFeedingLog, selectedCats, portions, feedingStatus, foodTypes, notes, toggleCatSelection, handlePortionChange, handleStatusChange, handleFoodTypeChange, handleNotesChange, formatRelativeTime, foodTypeOptions, statusOptions]);

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader className="text-left px-6 pt-4 pb-2">
          <DrawerTitle>Registrar Nova Alimentação</DrawerTitle>
          <DrawerDescription>
            Selecione os gatos e informe os detalhes da refeição.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex justify-between items-center px-6 pb-3">
           <p className="text-sm text-muted-foreground">
             {selectedCats.length} de {householdCats.length} gatos selecionados
           </p>
           <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={selectedCats.length === householdCats.length || householdCats.length === 0 || isSubmitting}>
                 Todos
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll} disabled={selectedCats.length === 0 || isSubmitting}>
                 Limpar
              </Button>
           </div>
        </div>
        <ScrollArea className="flex-grow overflow-y-auto px-6">
          <div className="space-y-2 pb-4">
            <AnimatePresence>
              {catListItems}
            </AnimatePresence>
          </div>
        </ScrollArea>
         {error && (
            <p className="px-6 py-2 text-sm text-destructive text-center">Erro: {error}</p>
         )}
        <DrawerFooter className="pt-4 border-t flex-row gap-2">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">Cancelar</Button>
          </DrawerClose>
          <Button 
            onClick={handleSubmit}
            disabled={selectedCats.length === 0 || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? <Loading size="sm" className="mr-2"/> : <Check className="mr-2 h-4 w-4" />} 
            Confirmar Alimentação ({selectedCats.length})
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
} 