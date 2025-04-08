"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format, addHours, isToday, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { formatInTimeZone } from 'date-fns-tz';
import { getUserTimezone, calculateNextFeeding, formatDateTimeForDisplay } from '@/lib/utils/dateUtils';
import { CatType, FeedingLog } from "@/lib/types";
import { useUserContext } from "@/lib/context/UserContext";
import { useLoading } from "@/lib/context/LoadingContext";
import { useCats } from "@/lib/context/CatsContext";
import { useFeeding } from "@/lib/context/FeedingContext";
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
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface NewFeedingSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialCatId?: number;
}

export function NewFeedingSheet({ 
    isOpen, 
    onOpenChange, 
    initialCatId 
}: NewFeedingSheetProps) {
  const router = useRouter();
  const { state: userState } = useUserContext();
  const { state: catsState } = useCats();
  const { state: feedingState, dispatch: feedingDispatch } = useFeeding();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const { data: session, status } = useSession();
  const { currentUser } = userState;
  const { cats, isLoading: isLoadingCats } = catsState;
  const { feedingLogs, isLoading: isLoadingFeedings } = feedingState;

  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [portions, setPortions] = useState<{ [key: string]: string }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [feedingStatus, setFeedingStatus] = useState<{ [key: string]: "Normal" | "Comeu Pouco" | "Recusou" | "Vomitou" | "Outro" }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmDialogContent, setConfirmDialogContent] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const statusOptions = [
    { value: "Normal", label: "Normal" },
    { value: "Comeu Pouco", label: "Comeu Pouco" },
    { value: "Recusou", label: "Recusou" },
    { value: "Vomitou", label: "Vomitou" },
    { value: "Outro", label: "Outro (ver notas)" },
  ];

  const householdCats = useMemo(() => {
    if (isLoadingCats || !cats || !currentUser?.householdId) {
      return [];
    }
    return cats.filter(cat => String(cat.householdId) === String(currentUser.householdId));
  }, [cats, isLoadingCats, currentUser]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
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
      } else {
          setSelectedCats([]);
          setFeedingStatus({});
      }
      
    } else {
      setSelectedCats([]);
      setPortions({});
      setNotes({});
      setFeedingStatus({});
      setIsSubmitting(false);
      setError(null);
    }
  }, [isOpen, householdCats, initialCatId]);

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

  const handleSubmit = async () => {
    if (!currentUser?.id || !currentUser?.householdId) {
      toast.error("Erro: Usuário ou residência não identificados.");
      return;
    }
    if (selectedCats.length === 0) {
      toast.info("Seleção Necessária", { description: "Selecione pelo menos um gato para registrar a alimentação." });
      return;
    }

    const opId = "submit-feeding-sheet";
    addLoadingOperation({ id: opId, description: "Registrando...", priority: 1 });
    setIsSubmitting(true);
    setError(null);
    const currentUserId = currentUser.id;
    const timestamp = new Date();

    const logsToCreate: Omit<FeedingLog, 'id' | 'user' | 'cat' | 'createdAt'>[] = [];
    let validationError = null;

    for (const catId of selectedCats) {
      const cat = householdCats.find(c => c.id === catId);
      if (!cat) {
          validationError = `Gato selecionado com ID '${catId}' não encontrado na lista.`;
          break;
      }

      const portionStr = portions[catId] ?? "";
      const status = feedingStatus[catId] ?? "Normal";
      const note = notes[catId] ?? null;

      let portionNum: number | null = null;
      if (portionStr) {
          const parsed = parseFloat(portionStr);
          if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1000) {
              validationError = `Porção inválida (${portionStr}) para ${cat.name}. Use um número não negativo (até 1000) ou deixe em branco.`;
              break;
          }
          portionNum = parsed;
      }

      logsToCreate.push({
        catId: catId,
        userId: currentUserId,
        timestamp: timestamp,
        portionSize: portionNum,
        status: status,
        notes: note?.trim() || null,
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
      const response = await fetch("/api/feedings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs: logsToCreate }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao registrar (${response.status})`);
      }

      const createdLogs: FeedingLog[] = await response.json();

      createdLogs.forEach(log => {
        const logToDispatch = { 
            ...log, 
            timestamp: new Date(log.timestamp),
            createdAt: new Date(log.createdAt || log.timestamp)
        };
        feedingDispatch({ type: "ADD_FEEDING", payload: logToDispatch });
      });

      toast.success(`Alimentação registrada para ${createdLogs.length} ${createdLogs.length === 1 ? 'gato' : 'gatos'}.`);
      onOpenChange(false);

    } catch (err: any) {
      console.error("Error submitting feeding logs:", err);
      setError(err.message || "Ocorreu um erro desconhecido.");
      toast.error("Erro ao Registrar", { description: err.message || "Ocorreu um erro desconhecido." });
    } finally {
      setIsSubmitting(false);
      removeLoadingOperation(opId);
    }
  };

  const catListItems = useMemo(() => {
    if (isLoadingCats) {
        return <Loading text="Carregando gatos..." />; 
    }
    if (!householdCats || householdCats.length === 0) {
      return (
        <EmptyState 
          title="Nenhum gato encontrado"
          description="Cadastre um gato para poder registrar alimentações."
          actionLabel="Cadastrar Gato"
          actionHref="/cats/new"
          size="sm"
        />
      );
    }
    
    return householdCats.map((cat) => {
      const lastLog = getLastFeedingLog(cat.id);
      const timeSinceLastFed = formatRelativeTime(lastLog?.timestamp);
      const isSelected = selectedCats.includes(cat.id);

      return (
        <motion.div
          key={cat.id}
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "flex items-center gap-4 p-3 rounded-lg border transition-colors cursor-pointer",
            isSelected ? "bg-muted border-primary" : "border-transparent hover:bg-muted/50"
          )}
          onClick={() => toggleCatSelection(cat.id)}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleCatSelection(cat.id)}
            aria-label={`Selecionar ${cat.name}`}
            className="flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
          <Avatar className="h-10 w-10">
            <AvatarImage src={cat.photoUrl || undefined} alt={cat.name} />
            <AvatarFallback>{cat.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-grow min-w-0">
            <p className="font-medium truncate">{cat.name}</p>
            <p className="text-xs text-muted-foreground">
              Última vez: {timeSinceLastFed}
            </p>
          </div>
          {isSelected && (
            <motion.div 
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-2 pl-2 overflow-hidden flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                type="number"
                placeholder="Grama(s)"
                value={portions[cat.id] || ""}
                onChange={(e) => handlePortionChange(cat.id, e.target.value)}
                min="0"
                step="1"
                className="h-8 w-24 text-xs appearance-none m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label={`Porção para ${cat.name}`}
              />
              <Select 
                value={feedingStatus[cat.id] || "Normal"}
                onValueChange={(value) => handleStatusChange(cat.id, value)}
              >
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <Input
                type="text"
                placeholder="Notas..."
                value={notes[cat.id] || ""}
                onChange={(e) => handleNotesChange(cat.id, e.target.value)}
                className="h-8 w-24 text-xs"
                aria-label={`Notas para ${cat.name}`}
              />
            </motion.div>
          )}
        </motion.div>
      );
    });
  }, [householdCats, isLoadingCats, getLastFeedingLog, selectedCats, portions, feedingStatus, notes, toggleCatSelection, handlePortionChange, handleStatusChange, handleNotesChange, formatRelativeTime]);

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
              <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={selectedCats.length === householdCats.length || householdCats.length === 0}>
                 Selecionar Todos
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAll} disabled={selectedCats.length === 0}>
                 Limpar Seleção
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
        <DrawerFooter className="pt-4 border-t">
          <Button 
            onClick={handleSubmit}
            disabled={selectedCats.length === 0 || isSubmitting}
          >
            {isSubmitting ? <Loading size="sm" className="mr-2"/> : <Check className="mr-2 h-4 w-4" />} 
            Confirmar Alimentação ({selectedCats.length})
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
} 