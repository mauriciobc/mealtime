"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format, addHours, isToday, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { formatInTimeZone } from 'date-fns-tz';
import { getUserTimezone, calculateNextFeeding, formatDateTimeForDisplay } from '@/lib/utils/dateUtils';
import { BaseFeedingLog, ID, BaseCat } from "@/lib/types/common";
import { CatType, FeedingLog } from "@/lib/types";
import { createFeedingLog } from "@/lib/services/apiService";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Clock, Bell, Cat as CatIcon } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useGlobalState } from "@/lib/context/global-state";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

interface NewFeedingSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewFeedingSheet({ isOpen, onOpenChange }: NewFeedingSheetProps) {
  const router = useRouter();
  const { state, dispatch } = useGlobalState();
  const { data: session } = useSession();
  const [cats, setCats] = useState<CatType[]>([]);
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [feedingLogs, setFeedingLogs] = useState<FeedingLog[]>([]);
  const [portions, setPortions] = useState<{[key: number]: number}>({});
  const [portionsInput, setPortionsInput] = useState<{[key: number]: string}>({});
  const [portionsTimeout, setPortionsTimeout] = useState<{[key: number]: NodeJS.Timeout}>({});
  const [statuses, setStatuses] = useState<{[key: number]: string}>({});
  const [notes, setNotes] = useState<{[key: number]: string}>({});
  const [activeNotifications, setActiveNotifications] = useState<{[key: number]: NodeJS.Timeout}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState(
    typeof localStorage !== 'undefined' 
      ? localStorage.getItem('language') || 'pt-BR' 
      : 'pt-BR'
  );

  // --- State for AlertDialog ---
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmDialogContent, setConfirmDialogContent] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });
  // --- End State for AlertDialog ---

  // Monitorar mudanças no estado global
  useEffect(() => {
    if (!isOpen) return;

    // Memoize the filtered cats and logs
    const filteredCats = state.cats;
    const filteredLogs = state.feedingLogs.filter(log => 
      filteredCats.some(cat => cat.id === log.catId)
    );

    // Only update if there are actual changes
    const catsChanged = JSON.stringify(filteredCats) !== JSON.stringify(cats);
    const logsChanged = JSON.stringify(filteredLogs) !== JSON.stringify(feedingLogs);

    if (catsChanged) {
      setCats(filteredCats);
    }
    if (logsChanged) {
      setFeedingLogs(filteredLogs);
    }
  }, [isOpen, state.cats, state.feedingLogs]);

  // Separate effect for initial data loading
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const userData = session?.user as any;
        const householdId = userData?.householdId ? parseInt(String(userData.householdId)) : null;

        if (!householdId) {
          toast({
            title: t("attention"),
            description: t("no_household_identified"),
            variant: "destructive",
          });
          return;
        }

        // Garantir que temos os gatos no estado global
        if (state.cats.length > 0) {
          setCats(state.cats);

          // Filtrar logs apenas para os gatos disponíveis
          const logs = state.feedingLogs.filter(log => 
            state.cats.some(cat => cat.id === log.catId)
          );
          setFeedingLogs(logs);
        } else {
          toast({
            title: t("error"),
            description: t("no_cats_found"),
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          title: t("error"),
          description: t("failed_to_load_data"),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      // Limpar estados quando o sheet é fechado
      setCats([]);
      setSelectedCats([]);
      setFeedingLogs([]);
      setPortions({});
      setPortionsInput({});
      setStatuses({});
      setNotes({});
    };
  }, [isOpen, session, state.cats, state.feedingLogs]);

  const getLastFeedingText = (cat: CatType) => {
    const lastFeeding = feedingLogs.find(log => log.catId === cat.id);
    if (!lastFeeding) return null;

    const interval = cat.feeding_interval || 8;
    const userData = session?.user as any;
    const timezone = getUserTimezone(userData?.timezone);
    const nextFeeding = calculateNextFeeding(new Date(lastFeeding.timestamp), interval, timezone);
    
    return formatDateTimeForDisplay(nextFeeding, timezone);
  };

  const getNextFeedingText = (cat: CatType) => {
    const lastFeeding = feedingLogs.find(log => log.catId === cat.id);
    if (!lastFeeding) return null;

    const interval = cat.feeding_interval || 8;
    const userData = session?.user as any;
    const timezone = getUserTimezone(userData?.timezone);
    const nextFeeding = calculateNextFeeding(new Date(lastFeeding.timestamp), interval, timezone);
    
    return formatDateTimeForDisplay(nextFeeding, timezone);
  };

  const catNeedsFeeding = (cat: CatType) => {
    const lastFeeding = feedingLogs.find(log => log.catId === cat.id);
    if (!lastFeeding) return true;
    
    const interval = cat.feeding_interval || 8;
    const userData = session?.user as any;
    const timezone = getUserTimezone(userData?.timezone);
    const nextFeedingTime = calculateNextFeeding(new Date(lastFeeding.timestamp), interval, timezone);
    
    return nextFeedingTime && new Date() >= nextFeedingTime;
  };

  const handlePortionChange = (catId: number, value: string) => {
    // Update the input value immediately for UI responsiveness
    setPortionsInput(prev => ({
      ...prev,
      [catId]: value
    }));

    // Clear any existing timeout for this cat
    if (portionsTimeout[catId]) {
      clearTimeout(portionsTimeout[catId]);
    }

    // Set a new timeout to update the actual portions state
    const timeoutId = setTimeout(() => {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        setPortions(prev => ({
          ...prev,
          [catId]: numValue
        }));
      }
    }, 300); // 300ms debounce

    setPortionsTimeout(prev => ({
      ...prev,
      [catId]: timeoutId
    }));
  };

  useEffect(() => {
    return () => {
      // Clear all timeouts when component unmounts
      Object.values(portionsTimeout).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [portionsTimeout]);

  const toggleCatSelection = (catId: number) => {
    const cat = cats.find(c => c.id === catId);
    if (!cat) return;

    setSelectedCats(prev => {
      if (prev.includes(catId)) {
        // Limpar dados do gato quando ele é desmarcado
        setPortions(prev => {
          const { [catId]: _, ...rest } = prev;
          return rest;
        });
        setPortionsInput(prev => {
          const { [catId]: _, ...rest } = prev;
          return rest;
        });
        setStatuses(prev => {
          const { [catId]: _, ...rest } = prev;
          return rest;
        });
        setNotes(prev => {
          const { [catId]: _, ...rest } = prev;
          return rest;
        });
        return prev.filter(id => id !== catId);
      } else {
        // Definir valores padrão quando o gato é selecionado
        if (cat.portion_size) {
          setPortions(prev => ({
            ...prev,
            [catId]: cat.portion_size || 0
          }));
          setPortionsInput(prev => ({
            ...prev,
            [catId]: (cat.portion_size || 0).toString()
          }));
        }
        setStatuses(prev => ({
          ...prev,
          [catId]: "completed"
        }));
        return [...prev, catId];
      }
    });
  };

  const handleSubmit = async () => {
    console.log("[handleSubmit] Starting submission...");
    try {
      const userData = session?.user as any;
      console.log("[handleSubmit] User data from session:", userData);

      const householdId = userData?.householdId ? parseInt(String(userData.householdId)) : null;

      console.log(`[handleSubmit] UserData processed, Household ID: ${householdId}`);

      if (!householdId) {
        console.error("[handleSubmit] Error: No household ID found.");
        toast({
          title: t("attention"),
          description: t("no_household_identified"),
          variant: "destructive",
        });
        return;
      }

      // Validar porções
      console.log("[handleSubmit] Validating portions:", portions);
      const invalidPortions = Object.entries(portions).some(([_, size]) => 
        size < 1 || size > 1000
      );

      if (invalidPortions) {
        console.error("[handleSubmit] Error: Invalid portion sizes found.");
        toast({
          title: t("feed_invalid_portions"),
          description: t("feed_invalid_portions_message"),
          variant: "destructive",
        });
        return;
      }
      console.log("[handleSubmit] Portion validation passed.");

      // Define the core submission logic as a separate function
      const proceedWithSubmission = async () => {
        console.log("[proceedWithSubmission] Starting log creation...");
        let creationErrorOccurred = false;
        const newFeedingLogsPromises = selectedCats.map(async catId => {
          const logPayload = {
            catId,
            userId: userData.id,
            timestamp: new Date().toISOString(),
            portionSize: portions[catId] || null,
            notes: notes[catId] || null,
            status: (statuses[catId] || "completed") as "completed" | "in-progress" | "pending",
          };
          console.log(`[proceedWithSubmission] Payload for cat ${catId}:`, logPayload);
          try {
            const result = await createFeedingLog(logPayload);
            console.log(`[proceedWithSubmission] API response for cat ${catId}:`, result);
            return result;
          } catch (apiError) {
            console.error(`[proceedWithSubmission] Error creating log for cat ${catId}:`, apiError);
            creationErrorOccurred = true;
            return null;
          }
        });

        const results = await Promise.all(newFeedingLogsPromises);

        if (creationErrorOccurred) {
          console.error("[proceedWithSubmission] One or more feeding logs failed to create.");
          throw new Error("Failed to create one or more feeding logs.");
        }

        const newFeedingLogs = results.filter(log => log !== null) as FeedingLog[];
        console.log("[proceedWithSubmission] All feeding logs created successfully:", newFeedingLogs);

        console.log("[proceedWithSubmission] Dispatching SET_FEEDING_LOGS state update...");
        dispatch({
          type: "SET_FEEDING_LOGS",
          payload: [...state.feedingLogs, ...newFeedingLogs],
        });
        console.log("[proceedWithSubmission] State update dispatched.");

        console.log("[proceedWithSubmission] Closing sheet...");
        onOpenChange(false);

        console.log("[proceedWithSubmission] Showing success toast.");
        toast({
          title: t("feed_success"),
          description: t("feed_success_message"),
        });
        console.log("[proceedWithSubmission] Submission complete.");
      };

      // Verificar alimentações recentes
      console.log("[handleSubmit] Checking for recent feedings...");
      const recentFeedings = selectedCats.filter(catId => {
        const lastFeeding = feedingLogs.find(log => log.catId === catId);
        if (!lastFeeding) return false;

        const interval = cats.find(cat => cat.id === catId)?.feeding_interval || 8;
        const timezone = getUserTimezone(userData?.timezone);
        const nextFeedingTime = calculateNextFeeding(new Date(lastFeeding.timestamp), interval, timezone);
        
        return nextFeedingTime && new Date() < nextFeedingTime;
      });
      console.log("[handleSubmit] Cats fed recently:", recentFeedings);

      if (recentFeedings.length > 0) {
        const catNames = recentFeedings
          .map(id => cats.find(cat => cat.id === id)?.name)
          .filter(Boolean)
          .join(", ");

        const confirmMessage = recentFeedings.length === 1
          ? `${catNames} ${t("feed_recent_feeding_confirm")}`
          : `${catNames} ${t("feed_recent_feeding_confirm_plural")}`;

        // --- Replace window.confirm with AlertDialog state update ---
        console.log("[handleSubmit] Recent feeding detected, preparing confirmation dialog.");
        setConfirmDialogContent({
          title: t("attention"), // Or a more specific title like "Confirm Feeding"
          message: confirmMessage,
          onConfirm: proceedWithSubmission // Set the function to run on confirm
        });
        setIsConfirmDialogOpen(true);
        // --- End replacement ---

      } else {
        // No recent feedings detected, proceed directly
        console.log("[handleSubmit] No recent feedings detected, proceeding directly.");
        await proceedWithSubmission();
      }

    } catch (error) {
      // This catch block now primarily handles errors from proceedWithSubmission
      console.error("[handleSubmit] Error during submission process:", error);
      toast({
        title: t("feed_error"),
        // Use error.message if available, otherwise generic message
        description: error instanceof Error ? error.message : t("feed_error_message"),
        variant: "destructive",
      });
    }
  };

  // Traduções (i18n)
  const t = (key: string): string => {
    const translations: { [key: string]: { [key: string]: string } } = {
      "pt-BR": {
        feed_title: "Alimentar Gatos",
        feed_mark_as_fed: "Marcar como Alimentado",
        feed_portion: "Porção (g)",
        feed_status: "Status",
        feed_completed: "Concluído",
        feed_partial: "Em Andamento",
        feed_refused: "Pendente",
        feed_notes: "Observações",
        feed_notes_placeholder: "Observações sobre a alimentação...",
        feed_recent_feeding_confirm: "foi alimentado recentemente. Tem certeza que deseja registrar outra alimentação?",
        feed_recent_feeding_confirm_plural: "foram alimentados recentemente. Tem certeza que deseja registrar outra alimentação?",
        feed_success: "Sucesso",
        feed_success_message: "Alimentação registrada com sucesso",
        feed_error: "Erro",
        feed_error_message: "Falha ao registrar alimentação. Por favor, tente novamente.",
        feed_invalid_portions: "Tamanhos de porção inválidos",
        feed_invalid_portions_message: "Por favor, insira tamanhos de porção válidos (entre 1-1000g)",
        dashboard_next_feed: "Próxima alimentação",
        dashboard_never_fed: "Nunca alimentado",
        time_just_now: "Agora mesmo",
        time_minute_ago: "minuto atrás",
        time_minutes_ago: "minutos atrás",
        time_hour_ago: "hora atrás",
        time_hours_ago: "horas atrás",
        time_today_at: "Hoje às",
        time_never: "Nunca",
        attention: "Atenção",
        no_household_identified: "Não foi possível identificar sua residência",
        no_cats_found: "Não encontramos gatos cadastrados na sua residência",
        error: "Erro",
        failed_to_load_data: "Falha ao carregar dados. Por favor, tente novamente.",
        failed_to_load_cats: "Falha ao carregar gatos. Por favor, tente novamente.",
        no_cats_message: "Nenhum gato cadastrado",
        add_cat_first: "Cadastre seus gatos primeiro para poder registrar alimentações.",
        add_cat: "Cadastrar Gato",
      },
    };

    return translations[language]?.[key] || key;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{t("feed_title")}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <Card key={item} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-32"></div>
                        <div className="h-3 bg-muted rounded w-24"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : cats.length === 0 ? (
            <div className="text-center p-6 bg-accent rounded-lg">
              <CatIcon className="w-12 h-12 text-accent-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">{t("no_cats_message")}</p>
              <p className="text-muted-foreground text-sm mb-4">{t("add_cat_first")}</p>
              <Link href="/cats/new">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {t("add_cat")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {cats.map(cat => {
                const isSelected = selectedCats.includes(cat.id);
                const needsFeeding = catNeedsFeeding(cat);

                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all duration-200 bg-card shadow-sm border hover:shadow ${
                        isSelected ? "ring-2 ring-primary border-primary/30" : ""
                      } ${needsFeeding ? "border-destructive/30 bg-destructive/5" : ""}`}
                      onClick={() => toggleCatSelection(cat.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {cat.photoUrl ? (
                              <img 
                                src={cat.photoUrl} 
                                alt={cat.name}
                                className="w-12 h-12 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-sm">
                                <CatIcon className="w-6 h-6 text-accent-foreground" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-medium text-card-foreground">{cat.name}</h3>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                <Badge
                                  variant={needsFeeding ? "destructive" : "secondary"}
                                  className={`flex items-center gap-1 text-xs ${!needsFeeding ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : ""}`}
                                >
                                  <Clock className="w-3 h-3" />
                                  {getLastFeedingText(cat)}
                                </Badge>
                                {getNextFeedingText(cat) && (
                                  <Badge 
                                    variant="outline" 
                                    className="flex items-center gap-1 text-xs border-border text-muted-foreground"
                                  >
                                    <Bell className="w-3 h-3" />
                                    {t("dashboard_next_feed")}: {getNextFeedingText(cat)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 space-y-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex gap-4 flex-col sm:flex-row">
                                <div className="flex-1">
                                  <label className="text-sm font-medium mb-1 block text-muted-foreground">
                                    {t("feed_portion")}
                                  </label>
                                  <Input
                                    type="number"
                                    value={portionsInput[cat.id] || ""}
                                    onChange={(e) => handlePortionChange(cat.id, e.target.value)}
                                    className="bg-background border-input focus:ring-ring focus:border-ring"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-sm font-medium mb-1 block text-muted-foreground">
                                    {t("feed_status")}
                                  </label>
                                  <Select
                                    value={statuses[cat.id] || "completed"}
                                    onValueChange={(value) => setStatuses(prev => ({
                                      ...prev,
                                      [cat.id]: value
                                    }))}
                                  >
                                    <SelectTrigger className="bg-background border-input focus:ring-ring">
                                      <SelectValue placeholder={t("feed_status")} />
                                    </SelectTrigger>
                                    <SelectContent className="border-border">
                                      <SelectItem value="completed" className="focus:bg-accent">{t("feed_completed")}</SelectItem>
                                      <SelectItem value="in-progress" className="focus:bg-accent">{t("feed_partial")}</SelectItem>
                                      <SelectItem value="pending" className="focus:bg-accent">{t("feed_refused")}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-1 block text-muted-foreground">
                                  {t("feed_notes")}
                                </label>
                                <Input
                                  placeholder={t("feed_notes_placeholder")}
                                  value={notes[cat.id] || ""}
                                  onChange={(e) => setNotes(prev => ({
                                    ...prev,
                                    [cat.id]: e.target.value
                                  }))}
                                  className="bg-background border-input focus:ring-ring focus:border-ring"
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
          )}

          {selectedCats.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
              <Button 
                className="w-full" 
                onClick={handleSubmit}
              >
                {t("feed_mark_as_fed")}
              </Button>
            </div>
          )}
        </div>

        {/* --- Add AlertDialog Component --- */}
        <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialogContent.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialogContent.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => console.log("[AlertDialog] Cancelled.")}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  console.log("[AlertDialog] Confirmed. Executing onConfirm...");
                  confirmDialogContent.onConfirm();
                }}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* --- End AlertDialog Component --- */}

      </SheetContent>
    </Sheet>
  );
} 