"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format, addHours, isToday, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { getUserTimezone, calculateNextFeeding, formatDateTimeForDisplay } from '@/lib/utils/dateUtils';
import { BaseFeedingLog, ID } from "@/lib/types/common";
import { CatType } from "@/lib/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Clock, Bell, Cat as CatIcon, Users, Utensils, AlertTriangle, X, CheckCircle, ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useAppContext } from "@/lib/context/AppContext";
import { useUserContext } from "@/lib/context/UserContext";
import { useLoading } from "@/lib/context/LoadingContext";
import { useCats } from "@/lib/context/CatsContext";
import { useFeeding } from "@/lib/context/FeedingContext";
import Link from "next/link";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

// Define the FeedingStatus type
type FeedingStatus = "Normal" | "Comeu Pouco" | "Recusou" | "Vomitou" | "Outro";

export default function NewFeedingPage() {
  const router = useRouter();
  const { state: userState } = useUserContext();
  const { state: catsState } = useCats();
  const { state: feedingState } = useFeeding();
  const { addLoadingOperation, removeLoadingOperation } = useLoading();
  const { data: session, status } = useSession();
  const { currentUser } = userState;
  const { cats } = catsState;
  const { feedingLogs } = feedingState;

  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [portions, setPortions] = useState<{ [key: number]: string }>({});
  const [notes, setNotes] = useState<{ [key: number]: string }>({});
  const [feedingStatus, setFeedingStatus] = useState<{ [key: number]: string }>({});
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Define status options
  const statusOptions = [
    { value: "Normal", label: "Normal" },
    { value: "Comeu Pouco", label: "Comeu Pouco" },
    { value: "Recusou", label: "Recusou" },
    { value: "Vomitou", label: "Vomitou" },
    { value: "Outro", label: "Outro (ver notas)" },
  ];

  useEffect(() => {
    if (status !== "authenticated" || !currentUser?.id || !currentUser?.householdId) {
      if (status === "authenticated" && currentUser && !currentUser.householdId) {
        setIsLoadingPage(false);
        setError("Nenhuma residência associada. Crie ou junte-se a uma residência nas configurações.");
      }
      if (status !== 'loading') {
        setIsLoadingPage(false);
      }
      return;
    }

    setIsLoadingPage(true);
    setError(null);
    const currentHouseholdId = currentUser.householdId;

    const loadPageData = async () => {
      try {
        const householdCats = cats;

        if (householdCats.length === 0) {
          setError("Nenhum gato cadastrado nesta residência. Adicione um gato primeiro.");
        }

        const initialPortions: { [key: number]: string } = {};
        householdCats.forEach((cat: CatType) => {
          initialPortions[cat.id] = cat.portion_size?.toString() || "";
        });
        setPortions(initialPortions);
        setNotes({});
        setSelectedCats([]);
        setFeedingStatus({});

      } catch (err: any) {
        console.error("Erro ao carregar dados da página:", err);
        setError(err.message || "Falha ao preparar dados.");
        toast({
          title: "Erro ao carregar dados dos gatos.",
          description: err.message,
          variant: "destructive"
        });
      } finally {
        setIsLoadingPage(false);
      }
    };

    loadPageData();

  }, [status, currentUser, cats]);

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

  const getLastFeedingLog = useCallback((catId: number): BaseFeedingLog | undefined => {
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
     const allCatIds = cats.map(cat => cat.id);
     setSelectedCats(allCatIds);
     const initialStatus = allCatIds.reduce((acc, catId) => ({
       ...acc,
       [catId]: "Normal"
     }), {});
     setFeedingStatus(initialStatus);
  }, [cats]);

  const handleDeselectAll = useCallback(() => {
     setSelectedCats([]);
     setFeedingStatus({});
  }, []);

  const handlePortionChange = useCallback((catId: number, value: string) => {
    setPortions(prev => ({ ...prev, [catId]: value }));
  }, []);

  const handleNotesChange = useCallback((catId: number, value: string) => {
    setNotes(prev => ({ ...prev, [catId]: value }));
  }, []);

  const handleStatusChange = useCallback((catId: number, value: string) => {
    setFeedingStatus(prev => ({ ...prev, [catId]: value }));
  }, []);

  const handleFeed = async () => {
    if (!currentUser?.id || !currentUser?.householdId) {
      toast({
        title: "Erro",
        description: "Erro: Usuário ou residência não identificados.",
        variant: "destructive"
      });
      return;
    }
    if (selectedCats.length === 0) {
       toast({
        title: "Aviso",
        description: "Selecione pelo menos um gato para alimentar.",
      });
      return;
    }

    const opId = "submit-feeding";
    addLoadingOperation({ id: opId, description: "Registrando alimentações...", priority: 1 });
    setIsSubmitting(true);
    const currentUserId = currentUser.id;
    const timestamp = new Date();

    const logsToCreate: Omit<BaseFeedingLog, 'id' | 'createdAt'>[] = [];
    let hasInvalidPortion = false;

    for (const catId of selectedCats) {
      const portionStr = portions[catId] || "";
      const portionNum = portionStr ? parseFloat(portionStr) : null;

      if (portionStr && (isNaN(portionNum!) || portionNum! <= 0 || portionNum! > 1000)) {
          toast({
            title: "Erro de Validação",
            description: `Porção inválida para ${cats.find(c=>c.id === catId)?.name || `gato ${catId}`}. Deve ser um número positivo até 1000.`,
            variant: "destructive"
          });
          hasInvalidPortion = true;
          break;
      }

      logsToCreate.push({
        catId: catId,
        userId: currentUserId,
        timestamp: timestamp,
        portionSize: portionNum,
        status: feedingStatus[catId] as BaseFeedingLog['status'] || "Normal",
        notes: notes[catId] || null,
      });
    }

    if (hasInvalidPortion) {
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
        throw new Error(errorData.error || `Falha ao registrar alimentações (${response.status})`);
      }

      const createdLogs: BaseFeedingLog[] = await response.json();

      toast({
        title: "Sucesso",
        description: `${createdLogs.length} ${createdLogs.length > 1 ? 'alimentações registradas' : 'alimentação registrada'} com sucesso!`,
        className: "bg-accent border-accent"
      });
      setSelectedCats([]);
      setPortions({});
      setNotes({});
      setFeedingStatus({});

      router.push("/feedings");

    } catch (error: any) {
      console.error("Erro ao registrar alimentações:", error);
      toast({
        title: "Erro ao registrar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      removeLoadingOperation(opId);
    }
  };

  if (isLoadingPage || status === 'loading' || (status === 'authenticated' && !currentUser)) {
    return (
      <div className="container max-w-lg mx-auto py-6 pb-28">
        <PageHeader 
          title="Registrar Alimentação"
          actionHref="/feedings"
          actionLabel="Voltar"
          actionVariant="ghost"
          actionIcon={<ArrowLeft className="h-4 w-4" />}
        />
        <Loading text="Carregando formulário..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-lg mx-auto py-6 pb-28">
        <PageHeader 
          title="Registrar Alimentação"
          actionHref="/feedings"
          actionLabel="Voltar"
          actionVariant="ghost"
          actionIcon={<ArrowLeft className="h-4 w-4" />}
        />
        <EmptyState
          icon={AlertTriangle}
          title="Erro"
          description={error}
          actionLabel={currentUser?.householdId ? "Tentar Novamente" : "Ir para Configurações"}
          actionHref={currentUser?.householdId ? "/feedings/new" : "/settings"}
          className="mt-6"
        />
      </div>
    );
  }
  
  if (status === "authenticated" && currentUser && !currentUser.householdId) {
    return (
      <div className="container max-w-lg mx-auto py-6 pb-28">
        <PageHeader 
          title="Registrar Alimentação"
          actionHref="/"
          actionLabel="Voltar"
          actionVariant="ghost"
          actionIcon={<ArrowLeft className="h-4 w-4" />}
        />
        <EmptyState
          icon={Users}
          title="Residência Necessária"
          description="Associe ou crie uma residência para registrar alimentações."
          actionLabel="Ir para Configurações"
          actionHref="/settings"
          className="mt-6"
        />
      </div>
    );
  }
   
  if (cats.length === 0) {
    return (
      <div className="container max-w-lg mx-auto py-6 pb-28">
        <PageHeader 
          title="Registrar Alimentação"
          actionHref="/"
          actionLabel="Voltar"
          actionVariant="ghost"
          actionIcon={<ArrowLeft className="h-4 w-4" />}
        />
        <EmptyState
          icon={CatIcon}
          title="Nenhum Gato Cadastrado"
          description="Você precisa cadastrar um gato antes de registrar uma alimentação."
          actionLabel="Cadastrar Gato"
          actionHref="/cats/new"
          className="mt-6"
        />
      </div>
    );
  }

  return (
    <div className="container max-w-lg mx-auto py-6 pb-28">
      <PageHeader 
        title="Registrar Alimentação"
        actionHref="/feedings"
        actionLabel="Voltar"
        actionVariant="ghost"
        actionIcon={<ArrowLeft className="h-4 w-4" />}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-6"
      >
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Selecione os Gatos</h2>
           <div className="space-x-2">
             <Button 
               variant="outline" 
               size="sm" 
               onClick={handleSelectAll} 
               disabled={selectedCats.length === cats.length || isSubmitting}
             >
               Selecionar Todos
             </Button>
             <Button 
               variant="ghost" 
               size="sm" 
               onClick={handleDeselectAll} 
               disabled={selectedCats.length === 0 || isSubmitting}
               className="text-muted-foreground"
             >
               Limpar
             </Button>
           </div>
        </div>

        <div className="space-y-4">
          {cats.map((cat) => {
            const lastLog = getLastFeedingLog(cat.id);
            const nextFeedingTime = lastLog && cat.feedingInterval 
              ? calculateNextFeeding(
                  new Date(lastLog.timestamp), 
                  cat.feedingInterval,
                  currentUser?.preferences?.timezone || "America/Sao_Paulo",
                  'cat'
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
              >
                <Card
                  className={cn(
                    "transition-all duration-200 cursor-pointer relative",
                    isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                  )}
                  onClick={() => toggleCatSelection(cat.id)}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 text-primary">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-12 w-12 border">
                        <AvatarImage src={cat.photoUrl || undefined} alt={cat.name} />
                        <AvatarFallback>{cat.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{cat.name}</p>
                        <div className="text-sm text-muted-foreground flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>Última: {formatRelativeTime(lastLog?.timestamp)}</span>
                        </div>
                        {nextFeedingTime && (
                          <div className="text-sm text-muted-foreground flex items-center space-x-2">
                            <Bell className="h-4 w-4" />
                            <span>Próxima: {nextFeedingTime ? formatDateTimeForDisplay(nextFeedingTime, currentUser?.preferences?.timezone || "America/Sao_Paulo") : "Não definido"}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: "auto", opacity: 1, marginTop: "16px" }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label htmlFor={`portion-${cat.id}`} className="text-sm font-medium text-muted-foreground mb-1.5 block">
                                Porção (g)
                              </label>
                              <Input
                                id={`portion-${cat.id}`}
                                type="number"
                                placeholder={cat.portion_size ? `${cat.portion_size}g` : "Ex: 50"}
                                value={portions[cat.id] || ""}
                                onChange={(e) => handlePortionChange(cat.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-9"
                                min="0"
                                step="1"
                              />
                            </div>
                            <div>
                              <label htmlFor={`notes-${cat.id}`} className="text-sm font-medium text-muted-foreground mb-1.5 block">
                                Notas
                              </label>
                              <Input
                                id={`notes-${cat.id}`}
                                placeholder="Opcional"
                                value={notes[cat.id] || ""}
                                onChange={(e) => handleNotesChange(cat.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-9"
                              />
                            </div>
                          </div>

                          <div className="mt-4">
                            <label htmlFor={`status-${cat.id}`} className="text-sm font-medium text-muted-foreground mb-1.5 block">
                              Status
                            </label>
                            <Select 
                              value={feedingStatus[cat.id] || "Normal"}
                              onValueChange={(value) => handleStatusChange(cat.id, value)}
                            >
                              <SelectTrigger 
                                id={`status-${cat.id}`}
                                className="h-9"
                                onClick={(e) => e.stopPropagation()}
                                disabled={isSubmitting}
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
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-20 max-w-lg mx-auto">
        <Button
          onClick={handleFeed}
          disabled={selectedCats.length === 0 || isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <Loading text="Registrando..." size="sm" />
          ) : (
            <>
              <Utensils className="mr-2 h-4 w-4" />
              {`Registrar Alimentação (${selectedCats.length})`}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}