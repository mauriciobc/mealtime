"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format, addHours, isToday, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Clock, Bell, Cat as CatIcon } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useGlobalState } from "@/lib/context/global-state";
import Link from "next/link";

// Tipos necessários
interface CatType {
  id: number;
  name: string;
  photoUrl: string | null;
  householdId: number;
  portion_size?: number;
  feeding_interval?: number;
}

interface FeedingLogType {
  id: number;
  catId: number;
  userId: number;
  timestamp: Date;
  portionSize: number | null;
  notes: string | null;
  status?: string;
  createdAt: Date;
}

interface HouseholdType {
  id: number;
  name: string;
}

export default function NewFeedingPage() {
  const router = useRouter();
  const { state, dispatch } = useGlobalState();
  const { data: session } = useSession();
  const [cats, setCats] = useState<CatType[]>([]);
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [feedingLogs, setFeedingLogs] = useState<FeedingLogType[]>([]);
  const [portions, setPortions] = useState<{[key: number]: number}>({});
  const [statuses, setStatuses] = useState<{[key: number]: string}>({});
  const [notes, setNotes] = useState<{[key: number]: string}>({});
  const [activeNotifications, setActiveNotifications] = useState<{[key: number]: NodeJS.Timeout}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState(
    typeof localStorage !== 'undefined' 
      ? localStorage.getItem('language') || 'pt-BR' 
      : 'pt-BR'
  );

  // Carregar dados iniciais
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        
        // Verificar se temos sessão de usuário
        if (!session || !session.user) {
          console.log("Redirecionando para login - usuário não autenticado");
          setIsLoading(false);
          router.push('/login?message=É+necessário+estar+logado+para+acessar+esta+página');
          return;
        }
        
        // Buscar residências do usuário se não estiverem no estado global
        let householdId = null;
        
        if (!state.households || state.households.length === 0) {
          try {
            console.log("Buscando residências do usuário");
            const householdsResponse = await fetch('/api/households');
            
            if (householdsResponse.ok) {
              const householdsData = await householdsResponse.json();
              
              if (householdsData && householdsData.length > 0) {
                // Atualiza o estado local com as residências
                householdId = householdsData[0]?.id;
                
                // Adicionar cada residência ao estado global
                if (dispatch) {
                  householdsData.forEach((household: any) => {
                    dispatch({
                      type: 'ADD_HOUSEHOLD',
                      payload: household
                    });
                  });
                }
              } else {
                console.error("Nenhuma residência encontrada para o usuário");
                toast({
                  title: t("attention"),
                  description: t("no_household_identified"),
                  variant: "destructive",
                });
                setIsLoading(false);
                return;
              }
            } else {
              throw new Error(`Erro ao buscar residências: ${householdsResponse.status}`);
            }
          } catch (error) {
            console.error("Erro ao buscar residências:", error);
            toast({
              title: t("error"),
              description: t("failed_to_load_households"),
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        } else {
          // Usar a primeira residência como padrão
          householdId = state.households[0]?.id;
        }
        
        if (!householdId) {
          console.error("ID da residência inválido");
          toast({
            title: t("error"),
            description: t("invalid_household_id"),
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        console.log(`Buscando gatos para a residência: ${householdId}`);
        
        // Carregar gatos e histórico de alimentação simultaneamente
        const [catsResponse, feedingLogsResponse] = await Promise.all([
          fetch(`/api/feedings/cats?householdId=${householdId}`),
          fetch(`/api/feedings?householdId=${householdId}&limit=50`)
        ]);
        
        // Verificar resposta da API de gatos
        if (!catsResponse.ok) {
          console.error(`Erro ao buscar gatos: ${catsResponse.status} ${catsResponse.statusText}`);
          const errorText = await catsResponse.text();
          console.error(errorText);
          
          toast({
            title: t("error"),
            description: t("failed_to_load_cats"),
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        // Verificar resposta da API de alimentações
        if (!feedingLogsResponse.ok) {
          console.error(`Erro ao buscar alimentações: ${feedingLogsResponse.status} ${feedingLogsResponse.statusText}`);
          try {
            const errorText = await feedingLogsResponse.text();
            console.error('Detalhes do erro de alimentações:', errorText);
          } catch (textError) {
            console.error('Não foi possível obter detalhes do erro:', textError);
          }
          toast({
            title: t("warning"),
            description: t("feeding_logs_load_error"),
            variant: "default",
          });
          // Mesmo com erro nas alimentações, podemos continuar com os gatos
        }
        
        const catsData = await catsResponse.json();
        console.log(`Gatos encontrados: ${catsData.length}`);
        
        // Carregar logs de alimentação se a resposta foi bem-sucedida
        let logsData = [];
        if (feedingLogsResponse.ok) {
          logsData = await feedingLogsResponse.json();
        }
        
        if (catsData.length === 0) {
          toast({
            title: t("attention"),
            description: t("no_cats_found"),
            variant: "destructive",
          });
        }
        
        setCats(catsData);
        setFeedingLogs(logsData);
        
        // Definir porções padrão para cada gato
        const initialPortions: {[key: number]: number} = {};
        catsData.forEach((cat: CatType) => {
          initialPortions[cat.id] = cat.portion_size || 0;
        });
        setPortions(initialPortions);
        
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
    }

    loadData();
  }, [state.households, session, router, dispatch]);

  // Limpeza de notificações ao desmontar o componente
  useEffect(() => {
    return () => {
      Object.values(activeNotifications).forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
    };
  }, [activeNotifications]);

  // Funções utilitárias para formatação de tempo
  const formatInTimezone = (utcDateTime: Date | string | null | undefined, timezone: string | null | undefined, formatStr = 'dd/MM/yyyy HH:mm') => {
    if (!utcDateTime) return '';
    
    try {
      const date = typeof utcDateTime === 'string' ? new Date(utcDateTime) : utcDateTime;
      
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone || 'UTC',
        year: formatStr.includes('y') ? 'numeric' : undefined,
        month: formatStr.includes('M') ? 'numeric' : undefined,
        day: formatStr.includes('d') ? 'numeric' : undefined,
        hour: formatStr.includes('H') ? 'numeric' : undefined,
        minute: formatStr.includes('m') ? 'numeric' : undefined,
        second: formatStr.includes('s') ? 'numeric' : undefined,
        hour12: formatStr.includes('a'),
      };
      
      return new Intl.DateTimeFormat('pt-BR', options).format(date);
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return format(new Date(utcDateTime), formatStr, { locale: ptBR });
    }
  };

  const isTodayInTimezone = (utcDateTime: Date | string | null | undefined, timezone: string | null | undefined) => {
    if (!utcDateTime) return false;
    
    try {
      const date = typeof utcDateTime === 'string' ? new Date(utcDateTime) : utcDateTime;
      
      const now = new Date();
      const todayInTZ = new Intl.DateTimeFormat('pt-BR', {
        timeZone: timezone || 'UTC',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }).format(now);
      
      const dateInTZ = new Intl.DateTimeFormat('pt-BR', {
        timeZone: timezone || 'UTC',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }).format(date);
      
      return todayInTZ === dateInTZ;
    } catch (error) {
      console.error('Erro ao verificar se a data é hoje:', error);
      return isToday(new Date(utcDateTime));
    }
  };

  const calculateNextFeedingTime = (lastFeedingUTC: Date | string | null | undefined, intervalHours: number) => {
    if (!lastFeedingUTC) return null;
    
    try {
      const lastFeeding = typeof lastFeedingUTC === 'string' ? new Date(lastFeedingUTC) : lastFeedingUTC;
      return addHours(lastFeeding, intervalHours || 8); // 8 horas como padrão se não houver intervalo
    } catch (error) {
      console.error('Erro ao calcular próxima alimentação:', error);
      return null;
    }
  };

  const formatRelativeTime = (utcDateTime: Date | string | null | undefined) => {
    if (!utcDateTime) return t("time_never");
    
    try {
      const date = typeof utcDateTime === 'string' ? new Date(utcDateTime) : utcDateTime;
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar tempo relativo:', error);
      return formatDistanceToNow(new Date(utcDateTime), { addSuffix: true, locale: ptBR });
    }
  };

  const formatNextFeedingTime = (nextFeedingUTC: Date | string | null | undefined, timezone: string | null | undefined) => {
    if (!nextFeedingUTC) return '';
    
    try {
      if (isTodayInTimezone(nextFeedingUTC, timezone)) {
        return `${t("time_today_at")} ${formatInTimezone(nextFeedingUTC, timezone, 'HH:mm')}`;
      }
      
      return formatInTimezone(nextFeedingUTC, timezone);
    } catch (error) {
      console.error('Erro ao formatar próxima alimentação:', error);
      return formatInTimezone(nextFeedingUTC, timezone);
    }
  };

  // Funções para manipulação da alimentação
  const getLastFeedingText = (cat: CatType) => {
    const lastFeeding = feedingLogs.find(log => log.catId === cat.id);
    if (!lastFeeding) return t("dashboard_never_fed");
    
    return formatRelativeTime(lastFeeding.timestamp);
  };

  const getNextFeedingText = (cat: CatType) => {
    const lastFeeding = feedingLogs.find(log => log.catId === cat.id);
    if (!lastFeeding) return null;

    // Usar intervalo de alimentação do gato ou padrão de 8 horas
    const interval = cat.feeding_interval || 8;
    const nextFeedingTime = calculateNextFeedingTime(lastFeeding.timestamp, interval);
    
    const userData = session?.user as any;
    return formatNextFeedingTime(nextFeedingTime, userData?.timezone);
  };

  const catNeedsFeeding = (cat: CatType) => {
    const lastFeeding = feedingLogs.find(log => log.catId === cat.id);
    if (!lastFeeding) return true;
    
    const lastFeedingDate = new Date(lastFeeding.timestamp);
    // Usar intervalo de alimentação do gato ou padrão de 8 horas
    const interval = cat.feeding_interval || 8;
    const nextFeedingDate = calculateNextFeedingTime(lastFeedingDate, interval);
    
    return nextFeedingDate && new Date() >= nextFeedingDate;
  };

  const toggleCatSelection = (catId: number) => {
    setSelectedCats(prev => {
      if (prev.includes(catId)) {
        return prev.filter(id => id !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  // Função para agendar notificações (mock por enquanto)
  const scheduleNotification = async (cat: CatType, nextFeedingTime: Date) => {
    if (activeNotifications[cat.id]) {
      clearTimeout(activeNotifications[cat.id]);
    }

    // Agendar para 15 minutos antes da próxima alimentação
    const reminderMinutes = 15;
    const notificationTime = new Date(nextFeedingTime);
    notificationTime.setMinutes(notificationTime.getMinutes() - reminderMinutes);

    if (notificationTime > new Date()) {
      const timeoutId = setTimeout(async () => {
        try {
          const userData = session?.user as any;
          const title = `${t("feed_title")}: ${cat.name}!`;
          const body = `${t("time_today_at")} ${formatInTimezone(nextFeedingTime, userData?.timezone, 'HH:mm')}`;

          // Notificar o usuário
          toast({
            title,
            description: body,
          });
          
          // Remover da lista de notificações ativas
          setActiveNotifications(prev => {
            const updated = { ...prev };
            delete updated[cat.id];
            return updated;
          });
        } catch (error) {
          console.error("Falha ao enviar notificação:", error);
        }
      }, notificationTime.getTime() - new Date().getTime());

      setActiveNotifications(prev => ({
        ...prev,
        [cat.id]: timeoutId
      }));
    }
  };

  const handleFeed = async () => {
    try {
      // Validar tamanho de porção
      const invalidPortions = selectedCats.filter(catId => {
        const portion = portions[catId];
        return !portion || portion <= 0 || portion > 1000;
      });

      if (invalidPortions.length > 0) {
        toast({
          title: t("feed_invalid_portions"),
          description: t("feed_invalid_portions_message"),
          variant: "destructive"
        });
        return;
      }

      // Verificar alimentações recentes (últimos 5 minutos)
      const recentFeedings = selectedCats.filter(catId => {
        const lastFeeding = feedingLogs.find(log => log.catId === catId);
        if (!lastFeeding) return false;
        
        const timeDiff = new Date().getTime() - new Date(lastFeeding.timestamp).getTime();
        return (timeDiff < 5 * 60 * 1000);
      });

      // Confirmar alimentações recentes
      if (recentFeedings.length > 0) {
        const recentCats = recentFeedings.map(catId => 
          cats.find(c => c.id === catId)?.name
        ).join(", ");
        
        const confirmMessage = recentFeedings.length === 1 
          ? `${recentCats} ${t("feed_recent_feeding_confirm")}`
          : `${recentCats} ${t("feed_recent_feeding_confirm_plural")}`;
          
        if (!window.confirm(confirmMessage)) {
          return;
        }
      }

      // Registrar alimentação para cada gato selecionado
      const userId = (session?.user as any)?.id;
      if (!userId) {
        toast({
          title: t("error"),
          description: t("user_not_authenticated"),
          variant: "destructive",
        });
        return;
      }

      // Criar alimentações para cada gato selecionado
      for (const catId of selectedCats) {
        const cat = cats.find(c => c.id === catId);
        if (!cat) continue;
        
        await fetch("/api/feedings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            catId,
            userId,
            portionSize: portions[catId],
            status: statuses[catId] || "completed",
            notes: notes[catId] || ""
          }),
        });

        // Agendar notificação para a próxima alimentação
        const now = new Date();
        const interval = cat.feeding_interval || 8;
        const nextFeeding = calculateNextFeedingTime(now, interval);
        
        if (nextFeeding) {
          scheduleNotification(cat, nextFeeding);
        }
      }

      // Resetar seleção e atualizar dados
      setSelectedCats([]);
      setStatuses({});
      setNotes({});
      
      // Recarregar os dados
      const householdId = state.households[0].id;
      const response = await fetch(`/api/feedings?householdId=${householdId}&limit=50`);
      if (response.ok) {
        const logsData = await response.json();
        setFeedingLogs(logsData);
      }
      
      toast({
        title: t("feed_success"),
        description: t("feed_success_message"),
        className: "bg-purple-50 border-purple-200"
      });
    } catch (error) {
      console.error("Erro ao alimentar:", error);
      toast({
        title: t("feed_error"),
        description: t("feed_error_message"),
        variant: "destructive"
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
        feed_partial: "Parcial",
        feed_refused: "Recusado",
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
        failed_to_load_households: "Falha ao carregar residências. Por favor, tente novamente.",
        feeding_logs_load_error: "Falha ao carregar histórico de alimentações. Alguns dados podem estar incompletos.",
        user_not_authenticated: "Usuário não autenticado",
        invalid_household_id: "ID da residência inválido",
        warning: "Aviso",
        loading: "Carregando...",
        no_cats_message: "Nenhum gato encontrado",
        add_cat_first: "Adicione um gato primeiro para registrar alimentações",
        add_cat: "Adicionar Gato"
      }
    };
    
    return translations[language]?.[key] || key;
  };

  return (
    <div className="px-4 py-6 pb-20 md:pb-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">{t("feed_title")}</h1>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={selectedCats.length === 0 || isLoading}
            onClick={handleFeed}
          >
            <Check className="w-4 h-4 mr-2" />
            {t("feed_mark_as_fed")} {selectedCats.length > 0 && `(${selectedCats.length})`}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <Card key={item} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : cats.length === 0 ? (
          <div className="text-center p-6 bg-purple-50 rounded-lg">
            <CatIcon className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">{t("no_cats_message")}</p>
            <p className="text-gray-500 text-sm mb-4">{t("add_cat_first")}</p>
            <Link href="/cats/new">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                {t("add_cat")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className={`cursor-pointer transition-all duration-200 bg-white shadow-sm border hover:shadow ${
                      isSelected ? "ring-2 ring-purple-500 border-purple-300" : ""
                    } ${needsFeeding ? "border-orange-300 bg-orange-50/50" : ""}`}
                    onClick={() => toggleCatSelection(cat.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {cat.photoUrl ? (
                            <img 
                              src={cat.photoUrl} 
                              alt={cat.name}
                              className="w-12 h-12 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center shadow-sm">
                              <CatIcon className="w-6 h-6 text-purple-600" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-medium text-gray-900">{cat.name}</h3>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Badge
                                variant={needsFeeding ? "destructive" : "secondary"}
                                className={`flex items-center gap-1 text-xs ${!needsFeeding ? "bg-purple-100 text-purple-800 hover:bg-purple-200" : ""}`}
                              >
                                <Clock className="w-3 h-3" />
                                {getLastFeedingText(cat)}
                              </Badge>
                              {getNextFeedingText(cat) && (
                                <Badge 
                                  variant="outline" 
                                  className="flex items-center gap-1 text-xs border-purple-200 text-purple-700"
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
                                <label className="text-sm font-medium mb-1 block text-gray-700">
                                  {t("feed_portion")}
                                </label>
                                <Input
                                  type="number"
                                  value={portions[cat.id] || ""}
                                  onChange={(e) => setPortions(prev => ({
                                    ...prev,
                                    [cat.id]: parseInt(e.target.value)
                                  }))}
                                  className="bg-white border-gray-200 focus:ring-purple-500 focus:border-purple-500"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-sm font-medium mb-1 block text-gray-700">
                                  {t("feed_status")}
                                </label>
                                <Select
                                  value={statuses[cat.id] || "completed"}
                                  onValueChange={(value) => setStatuses(prev => ({
                                    ...prev,
                                    [cat.id]: value
                                  }))}
                                >
                                  <SelectTrigger className="bg-white border-gray-200 focus:ring-purple-500">
                                    <SelectValue placeholder={t("feed_status")} />
                                  </SelectTrigger>
                                  <SelectContent className="border-gray-200">
                                    <SelectItem value="completed" className="focus:bg-purple-50">{t("feed_completed")}</SelectItem>
                                    <SelectItem value="partial" className="focus:bg-purple-50">{t("feed_partial")}</SelectItem>
                                    <SelectItem value="refused" className="focus:bg-purple-50">{t("feed_refused")}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block text-gray-700">
                                {t("feed_notes")}
                              </label>
                              <Input
                                placeholder={t("feed_notes_placeholder")}
                                value={notes[cat.id] || ""}
                                onChange={(e) => setNotes(prev => ({
                                  ...prev,
                                  [cat.id]: e.target.value
                                }))}
                                className="bg-white border-gray-200 focus:ring-purple-500 focus:border-purple-500"
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
      </div>
    </div>
  );
}