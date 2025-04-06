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
import { useAppContext } from "@/lib/context/AppContext";
import { useUserContext } from "@/lib/context/UserContext";
import { useLoading } from "@/lib/context/LoadingContext";
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
  const { state: appState, dispatch: appDispatch } = useAppContext();
  const { state: userState } = useUserContext();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const { data: session, status } = useSession();
  const { currentUser } = userState;
  const { cats, feedingLogs } = appState;

  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [portions, setPortions] = useState<{ [key: number]: string }>({});
  const [notes, setNotes] = useState<{ [key: number]: string }>({});
  const [feedingStatus, setFeedingStatus] = useState<{ [key: number]: "Normal" | "Comeu Pouco" | "Recusou" | "Vomitou" | "Outro" }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmDialogContent, setConfirmDialogContent] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Define status options
  const statusOptions = [
    { value: "Normal", label: "Normal" },
    { value: "Comeu Pouco", label: "Comeu Pouco" },
    { value: "Recusou", label: "Recusou" },
    { value: "Vomitou", label: "Vomitou" },
    { value: "Outro", label: "Outro (ver notas)" },
  ];

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const householdCats = cats.filter(cat => String(cat.householdId) === String(currentUser?.householdId));
      
      const initialPortions: { [key: number]: string } = {};
      householdCats.forEach((cat: CatType) => {
        initialPortions[cat.id] = cat.portion_size?.toString() || "";
      });
      setPortions(initialPortions);
      setNotes({});
      
      if (initialCatId && householdCats.some(cat => cat.id === initialCatId)) {
          setSelectedCats([initialCatId]);
          setFeedingStatus({ [initialCatId]: "Normal" });
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
  }, [isOpen, cats, currentUser, initialCatId]); 

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

  const getLastFeedingLog = useCallback((catId: number): FeedingLog | undefined => {
    return feedingLogs
        .filter(log => log.catId === catId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  }, [feedingLogs]);

  const toggleCatSelection = useCallback((catId: number) => {
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
     const householdCats = cats.filter(cat => String(cat.householdId) === String(currentUser?.householdId));
     const allCatIds = householdCats.map(cat => cat.id);
     setSelectedCats(allCatIds);
  }, [cats, currentUser]);

  const handleDeselectAll = useCallback(() => {
     setSelectedCats([]);
  }, []);

  const handlePortionChange = useCallback((catId: number, value: string) => {
    setPortions(prev => ({ ...prev, [catId]: value }));
  }, []);

  const handleNotesChange = useCallback((catId: number, value: string) => {
    setNotes(prev => ({ ...prev, [catId]: value }));
  }, []);

  const handleStatusChange = useCallback((catId: number, value: string) => {
    setFeedingStatus(prev => ({ ...prev, [catId]: value as "Normal" | "Comeu Pouco" | "Recusou" | "Vomitou" | "Outro" }));
  }, []);

  const handleSubmit = async () => {
    if (!currentUser?.id || !currentUser?.householdId) {
      toast({
        title: "Erro",
        description: "Usuário ou residência não identificados.",
        variant: "destructive"
      });
      return;
    }
    if (selectedCats.length === 0) {
       toast({
        title: "Seleção Necessária",
        description: "Selecione pelo menos um gato para registrar a alimentação.",
      });
      return;
    }

    const opId = "submit-feeding-sheet";
    addLoadingOperation({ id: opId, description: "Registrando...", priority: 1 });
    setIsSubmitting(true);
    setError(null);
    const currentUserId = currentUser.id;
    const timestamp = new Date();

    const logsToCreate: Omit<FeedingLog, 'id' | 'user' | 'cat'>[] = [];
    let validationError = null;

    for (const catId of selectedCats) {
      const portionStr = portions[catId] || "";
      const portionNum = portionStr ? parseFloat(portionStr) : null;

      if (portionStr && (isNaN(portionNum!) || portionNum! <= 0 || portionNum! > 1000)) {
          const catName = cats.find(c => c.id === catId)?.name || `Gato ${catId}`;
          validationError = `Porção inválida para ${catName}. Use um número positivo (até 1000) ou deixe em branco.`;
          break;
      }

      logsToCreate.push({
        catId: catId,
        userId: currentUserId,
        timestamp: timestamp,
        portionSize: portionNum,
        status: feedingStatus[catId] || "Normal",
        notes: notes[catId]?.trim() || null,
        createdAt: new Date()
      });
    }

    if (validationError) {
        toast({ title: "Erro de Validação", description: validationError, variant: "destructive" });
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
        appDispatch({ type: "ADD_FEEDING_LOG", payload: log });
      });

      toast({
        title: "Sucesso!",
        description: `${createdLogs.length} ${createdLogs.length > 1 ? 'alimentações registradas' : 'alimentação registrada'}.`,
      });
      
      onOpenChange(false);

    } catch (error: any) {
      console.error("Erro ao registrar alimentações:", error);
      setError(error.message);
      toast({
        title: "Erro ao Registrar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      removeLoadingOperation(opId);
    }
  };

  const householdCats = useMemo(() => {
      if (!currentUser?.householdId) return [];
      return cats.filter(cat => String(cat.householdId) === String(currentUser.householdId));
  }, [cats, currentUser]);

   let content;
   if (status === "loading" || (status === "authenticated" && !currentUser)) {
      content = <Loading text="Carregando usuário..." className="mt-8" />;
   } else if (!currentUser?.householdId) {
       content = (
           <EmptyState 
               title="Residência Necessária"
               description="Associe uma residência nas configurações para registrar alimentações."
               icon={Users}
               actionHref="/settings"
               actionLabel="Ir para Configurações"
               className="mt-8"
           />
       );
   } else if (householdCats.length === 0) {
       content = (
           <EmptyState 
               title="Nenhum Gato Cadastrado"
               description="Cadastre um gato na sua residência primeiro."
               icon={CatIcon}
               actionHref="/cats/new"
               actionLabel="Cadastrar Gato"
               className="mt-8"
            />
       );
   } else {
       content = (
           <>
             <div className="mb-4 px-1 flex justify-between items-center">
               <h3 className="text-sm font-medium">Selecione os Gatos</h3>
               <div className="space-x-2">
                 <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={handleSelectAll} 
                   disabled={selectedCats.length === householdCats.length || isSubmitting}
                   className="h-7 px-2 text-xs"
                  >
                   Todos
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={handleDeselectAll} 
                   disabled={selectedCats.length === 0 || isSubmitting}
                   className="h-7 px-2 text-xs text-muted-foreground"
                  >
                   Nenhum
                 </Button>
               </div>
             </div>
 
             <ScrollArea className="h-[calc(100vh-350px)] md:h-[calc(100vh-300px)]">
                 <div className="px-4 py-4 space-y-3">
                  {householdCats.length > 0 ? (
                    householdCats.map((cat: CatType) => {
                      const lastLog = getLastFeedingLog(cat.id);
                      const nextFeedingTime = lastLog && cat.feedingInterval 
                        ? calculateNextFeeding(
                            new Date(lastLog.timestamp), 
                            cat.feedingInterval, 
                            currentUser?.preferences?.timezone || "America/Sao_Paulo"
                          ) 
                        : null;
                      const isSelected = selectedCats.includes(cat.id);

                      return (
                        <motion.div
                          key={cat.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "border rounded-lg p-3 cursor-pointer relative transition-all duration-200 hover:bg-muted/50",
                            isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                          )}
                          onClick={() => toggleCatSelection(cat.id)}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 text-primary">
                              <CheckCircle className="h-5 w-5" />
                            </div>
                          )}
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-10 w-10 border">
                              <AvatarImage src={cat.photoUrl || undefined} alt={cat.name} />
                              <AvatarFallback>{cat.name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-center">
                                 <p className="text-sm font-medium leading-none">{cat.name}</p>
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center space-x-2">
                                 <Clock className="h-3 w-3" />
                                 <span>Última: {formatRelativeTime(lastLog?.timestamp)}</span>
                              </div>
                              {nextFeedingTime && (
                                  <div className="text-xs text-muted-foreground flex items-center space-x-2">
                                      <Bell className="h-3 w-3" />
                                      <span>Próxima: {formatDateTimeForDisplay(nextFeedingTime, currentUser?.preferences?.timezone || "America/Sao_Paulo")}</span>
                                  </div>
                              )}
                            </div>
                          </div>
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div
                                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                animate={{ height: "auto", opacity: 1, marginTop: "12px" }}
                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label htmlFor={`portion-${cat.id}`} className="text-xs font-medium text-muted-foreground mb-1 block">Porção (g)</label>
                                    <Input
                                      id={`portion-${cat.id}`}
                                      type="number"
                                      placeholder={cat.portion_size ? `${cat.portion_size}g` : "Ex: 50"}
                                      value={portions[cat.id] || ""}
                                      onChange={(e) => handlePortionChange(cat.id, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-8 text-sm"
                                      min="0"
                                      step="1"
                                    />
                                  </div>
                                  <div>
                                     <label htmlFor={`notes-${cat.id}`} className="text-xs font-medium text-muted-foreground mb-1 block">Notas</label>
                                     <Input
                                       id={`notes-${cat.id}`}
                                       placeholder="Opcional"
                                       value={notes[cat.id] || ""}
                                       onChange={(e) => handleNotesChange(cat.id, e.target.value)}
                                       onClick={(e) => e.stopPropagation()}
                                       className="h-8 text-sm"
                                     />
                                  </div>
                                </div>

                                <div className="mt-3">
                                  <label htmlFor={`status-${cat.id}`} className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                                  <Select 
                                    value={feedingStatus[cat.id] || "Normal"}
                                    onValueChange={(value) => handleStatusChange(cat.id, value)}
                                  >
                                    <SelectTrigger 
                                      id={`status-${cat.id}`}
                                      className="h-8 text-sm"
                                      onClick={(e) => e.stopPropagation()} // Prevent card click
                                      disabled={isSubmitting} // Disable if submitting
                                    >
                                      <SelectValue placeholder="Selecionar status..." />
                                    </SelectTrigger>
                                    <SelectContent onClick={(e) => e.stopPropagation()}> 
                                      {statusOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value} disabled={isSubmitting}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })
                  ) : (
                    <EmptyState 
                       icon={CatIcon}
                       title="Nenhum Gato Cadastrado"
                       description="Cadastre seu primeiro gato para começar a registrar alimentações."
                       actionLabel="Cadastrar Gato"
                       actionHref="/cats/new"
                       className="py-8"
                    />
                  )}
                </div>
             </ScrollArea>
             {error && (
                <p className="text-sm text-destructive mt-4 px-1">{error}</p>
             )}
           </>
       );
   }

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[85vh] p-4 flex flex-col">
        <DrawerHeader className="px-1">
          <DrawerTitle>Registrar Nova Alimentação</DrawerTitle>
          <DrawerDescription>
            Selecione os gatos e informe a quantidade de ração.
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="flex-1 mt-4 overflow-hidden flex flex-col">
           {content}
        </div>

        {householdCats.length > 0 && currentUser?.householdId && (
             <DrawerFooter className="mt-auto pt-4 border-t">
                 <DrawerClose asChild>
                     <Button variant="outline" disabled={isSubmitting}>Cancelar</Button>
                 </DrawerClose>
                 <Button
                 onClick={handleSubmit}
                 disabled={isSubmitting || selectedCats.length === 0}
                 >
                 {isSubmitting ? (
                     <Loading text="Registrando..." size="sm" />
                 ) : (
                     <>
                     <Utensils className="mr-2 h-4 w-4" />
                     {`Confirmar (${selectedCats.length})`}
                     </>
                 )}
                 </Button>
             </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
} 