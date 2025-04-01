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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Clock, Bell, Cat as CatIcon, Users, Utensils, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useGlobalState } from "@/lib/context/global-state";
import Link from "next/link";
import { CatType, FeedingLog as FeedingLogType, HouseholdType } from "@/lib/types";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";

// Tipos necessários
interface CatType {
  id: number;
  name: string;
  photoUrl: string | null;
  householdId: number;
  portion_size?: number;
  feeding_interval?: number;
}

interface FeedingLogType extends BaseFeedingLog {
  status?: string;
}

interface HouseholdType {
  id: number;
  name: string;
}

export default function NewFeedingPage() {
  const router = useRouter();
  const { state, dispatch } = useGlobalState();
  const { data: session, status } = useSession();
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [portions, setPortions] = useState<{ [key: number]: string }>({});
  const [notes, setNotes] = useState<{ [key: number]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !state.currentUser?.id || !state.currentUser?.householdId) {
      if (status === "authenticated" && state.currentUser && !state.currentUser.householdId) {
        setIsLoading(false);
        setError("Nenhuma residência associada.");
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    const currentHouseholdId = state.currentUser.householdId;

    const loadPageData = async () => {
      try {
        const householdCats = state.cats;

        if (householdCats.length === 0) {
          console.log("Nenhum gato encontrado na residência.");
        }

        const initialPortions: { [key: number]: string } = {};
        householdCats.forEach((cat: CatType) => {
          initialPortions[cat.id] = cat.portion_size?.toString() || "";
        });
        setPortions(initialPortions);
        setNotes({});
        setSelectedCats([]);

      } catch (err: any) {
        console.error("Erro ao carregar dados da página:", err);
        setError(err.message || "Falha ao preparar dados.");
        toast({
          title: "Erro ao carregar dados dos gatos.",
          description: err.message,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPageData();

  }, [status, state.currentUser, state.cats, dispatch]);

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

  const getLastFeedingLog = useCallback((catId: number): FeedingLogType | undefined => {
    return state.feedingLogs
        .filter(log => log.catId === catId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  }, [state.feedingLogs]);

  const toggleCatSelection = useCallback((catId: number) => {
    setSelectedCats(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
     const allCatIds = state.cats.map(cat => cat.id);
     setSelectedCats(allCatIds);
  }, [state.cats]);

  const handleDeselectAll = useCallback(() => {
     setSelectedCats([]);
  }, []);

  const handlePortionChange = useCallback((catId: number, value: string) => {
    setPortions(prev => ({ ...prev, [catId]: value }));
  }, []);

  const handleNotesChange = useCallback((catId: number, value: string) => {
    setNotes(prev => ({ ...prev, [catId]: value }));
  }, []);

  const handleFeed = async () => {
    if (!state.currentUser?.id || !state.currentUser?.householdId) {
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

    setIsSubmitting(true);
    const currentUserId = state.currentUser.id;
    const currentHouseholdId = state.currentUser.householdId;
    const timestamp = new Date();

    const logsToCreate: Omit<FeedingLogType, 'id' | 'user' | 'cat'>[] = [];
    let hasInvalidPortion = false;

    for (const catId of selectedCats) {
      const portionStr = portions[catId] || "";
      const portionNum = portionStr ? parseFloat(portionStr) : null;

      if (portionStr && (isNaN(portionNum!) || portionNum! <= 0 || portionNum! > 1000)) {
          toast({
            title: "Erro",
            description: `Porção inválida para ${state.cats.find(c=>c.id === catId)?.name || `gato ${catId}`}. Deve ser um número positivo até 1000.`,
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
        notes: notes[catId] || null,
      });
    }

    if (hasInvalidPortion) {
        setIsSubmitting(false);
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

      const createdLogs: FeedingLogType[] = await response.json();

      dispatch({ type: "ADD_FEEDING_LOGS", payload: createdLogs });

      toast({
        title: "Sucesso",
        description: `${createdLogs.length} ${createdLogs.length > 1 ? 'alimentações registradas' : 'alimentação registrada'} com sucesso!`,
        className: "bg-accent border-accent"
      });
      setSelectedCats([]);

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
    }
  };

  const t = (key: string): string => {
     return key.replace(/_/g, ' ').replace(/dashboard|feed|time/g, '').trim();
  }

  if (isLoading || status === 'loading' || (status === 'authenticated' && !state.currentUser)) {
    return (
      <div className="container max-w-lg mx-auto py-6 pb-28">
        <Loading text="Carregando..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-lg mx-auto py-6 pb-28">
        <PageHeader title="Registrar Alimentação" backHref="/feedings" />
        <div className="mt-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Erro</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.push("/feedings")} variant="outline">Voltar</Button>
        </div>
      </div>
    );
  }

  if (status === 'authenticated' && state.currentUser && !state.currentUser.householdId) {
    return (
      <div className="container max-w-lg mx-auto py-6 pb-28">
        <PageHeader title="Registrar Alimentação" backHref="/feedings" />
        <div className="mt-6">
          <EmptyState
            icon={Users}
            title="Sem Residência Associada"
            description="Associe-se a uma residência para registrar alimentações."
            actionLabel="Ir para Configurações"
            actionHref="/settings"
          />
        </div>
      </div>
    );
  }

  const householdCats = state.cats;

  if (householdCats.length === 0) {
    return (
      <div className="container max-w-lg mx-auto py-6 pb-28">
        <PageHeader title="Registrar Alimentação" backHref="/feedings" />
        <div className="mt-6">
          <EmptyState
            icon={CatIcon}
            title="Nenhum Gato Cadastrado"
            description="Cadastre pelo menos um gato antes de registrar alimentações."
            actionLabel="Cadastrar Gato"
            actionHref="/cats/new"
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container max-w-lg mx-auto py-6 pb-48"
    >
      <PageHeader title="Registrar Alimentação" backHref="/feedings" />

      <div className="my-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Selecione os gatos que foram alimentados:
        </p>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={selectedCats.length === householdCats.length}>
            Selecionar Todos
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll} disabled={selectedCats.length === 0}>
            Limpar Seleção
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {householdCats.map((cat) => {
          const isSelected = selectedCats.includes(cat.id);
          const lastLog = getLastFeedingLog(cat.id);
          
          // Robust check for needsFeeding
          let needsFeeding = false;
          if (lastLog && lastLog.timestamp && cat.feeding_interval) {
            try {
              const lastFeedingDate = new Date(lastLog.timestamp);
              if (!isNaN(lastFeedingDate.getTime())) { // Check if date is valid
                const nextFeedingTime = calculateNextFeeding(lastFeedingDate, cat.feeding_interval, getUserTimezone());
                needsFeeding = nextFeedingTime <= new Date();
              } else {
                console.warn(`Invalid timestamp for cat ${cat.id}: ${lastLog.timestamp}`);
                needsFeeding = true; // Assume needs feeding if last timestamp is invalid
              }
            } catch (error) {
              console.error(`Error calculating next feeding for cat ${cat.id}:`, error);
              needsFeeding = true; // Assume needs feeding on error
            }
          } else if (!lastLog) {
            needsFeeding = true; // Needs feeding if never fed
          }

          // Robust AvatarFallback
          const avatarFallbackText = cat.name && typeof cat.name === 'string' && cat.name.length > 0 
            ? cat.name.substring(0, 2).toUpperCase() 
            : '??';

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: isSelected ? 1 : 0.7 }}
              transition={{ duration: 0.2 }}
              layout
            >
              <Card
                className={`transition-all duration-200 ease-in-out ${isSelected ? 'border-primary ring-1 ring-primary shadow-md' : 'border-border'} cursor-pointer`}
                onClick={() => toggleCatSelection(cat.id)}
              >
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={cat.photoUrl || undefined} alt={cat.name} />
                      <AvatarFallback>{avatarFallbackText}</AvatarFallback>
                    </Avatar>
                    <div>
                      <label id={`cat-name-${cat.id}`} className="font-medium text-base">{cat.name || 'Nome Indefinido'}</label>
                      <p className="text-xs text-muted-foreground">
                        Última vez: {lastLog ? formatRelativeTime(lastLog.timestamp) : 'Nunca'}
                      </p>
                      {needsFeeding && (
                        <Badge variant="warning" className="mt-1 text-xs">Precisa alimentar</Badge>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        key={`inputs-${cat.id}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 mt-3 sm:mt-0 self-stretch sm:items-center"
                      >
                        <div className="flex-1 min-w-[80px]">
                          <label htmlFor={`portion-${cat.id}`} className="sr-only">Porção (g)</label>
                          <Input
                            id={`portion-${cat.id}`}
                            type="number"
                            min="0"
                            step="1"
                            placeholder="g"
                            value={portions[cat.id] || ""}
                            onChange={(e) => handlePortionChange(cat.id, e.target.value)}
                            className="h-10 text-sm"
                            aria-label={`Porção para ${cat.name}`}
                          />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                          <label htmlFor={`notes-${cat.id}`} className="sr-only">Observações</label>
                          <Input
                            id={`notes-${cat.id}`}
                            type="text"
                            placeholder="Observações (opcional)"
                            value={notes[cat.id] || ""}
                            onChange={(e) => handleNotesChange(cat.id, e.target.value)}
                            className="h-10 text-sm"
                            aria-label={`Observações para ${cat.name}`}
                          />
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

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-20 max-w-lg mx-auto">
        <Button
          onClick={handleFeed}
          disabled={selectedCats.length === 0 || isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? "Registrando..." : `Registrar Alimentação (${selectedCats.length})`}
        </Button>
      </div>

    </motion.div>
  );
}