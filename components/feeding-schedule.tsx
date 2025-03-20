"use client";

import { useState, useEffect } from "react";
import { format, addHours, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGlobalState } from "@/lib/context/global-state";
import { FeedingLog, CatType, Schedule } from "@/lib/types";
import { useSession } from "next-auth/react";
import { getFeedingLogs, getCatsByHouseholdId } from "@/lib/services/apiService";
import { getSchedules } from "@/lib/data";

interface UpcomingFeeding {
  id: string;
  catId: number;
  catName: string;
  catPhoto: string | null;
  nextFeeding: Date;
  isOverdue: boolean;
}

export default function FeedingSchedule() {
  const { state } = useGlobalState();
  const { data: session } = useSession();
  const [upcomingFeedings, setUpcomingFeedings] = useState<UpcomingFeeding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUpcomingFeedings() {
      try {
        setIsLoading(true);
        
        if (!session?.user || state.households.length === 0) {
          return;
        }
        
        const activeHousehold = state.households[0];
        const userTimezone = session.user.timezone || "America/Sao_Paulo"; // Usando São Paulo como padrão
        
        // Carregar dados do banco
        const [cats, schedules, feedingLogs] = await Promise.all([
          getCatsByHouseholdId(activeHousehold.id),
          getSchedules(undefined),
          getFeedingLogs([])
        ]);
        
        // Mapear gatos por ID para fácil acesso
        const catsMap = new Map<number, CatType>();
        if (Array.isArray(cats)) {
          cats.forEach((cat) => {
            if (cat && cat.id) {
              catsMap.set(cat.id, cat);
            }
          });
        }
        
        // Calcular próximas alimentações
        const now = toDate(new Date(), { timeZone: userTimezone });
        const upcoming: UpcomingFeeding[] = [];
        
        schedules.forEach((schedule) => {
          const cat = catsMap.get(schedule.catId);
          if (!cat) return;
          
          let nextFeeding: Date;
          
          if (schedule.type === 'interval' && schedule.interval) {
            // Para agendamentos baseados em intervalo
            const interval = schedule.interval;
            const lastFeeding = feedingLogs
              .filter((log: FeedingLog) => log.catId === cat.id)
              .sort((a: FeedingLog, b: FeedingLog) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              )[0];
            
            if (lastFeeding) {
              // Converter o timestamp para o fuso horário do usuário
              const lastFeedingTime = toDate(parseISO(lastFeeding.timestamp.toString()), { timeZone: userTimezone });
              nextFeeding = addHours(lastFeedingTime, interval);
              
              // Se o próximo horário calculado já passou, calcula o próximo intervalo a partir de agora
              if (isBefore(nextFeeding, now)) {
                const intervalsPassedSinceLastFeeding = Math.ceil(
                  (now.getTime() - lastFeedingTime.getTime()) / (interval * 60 * 60 * 1000)
                );
                nextFeeding = addHours(lastFeedingTime, (intervalsPassedSinceLastFeeding + 1) * interval);
              }
            } else {
              nextFeeding = addHours(now, interval);
            }
          } else if (schedule.type === 'fixedTime' && schedule.times) {
            // Para agendamentos baseados em horários fixos
            const times = schedule.times.split(',');
            const nextTimes = times.map((time: string) => {
              const [hours, minutes] = time.split(':').map(Number);
              const scheduledTime = toDate(new Date(), { timeZone: userTimezone });
              scheduledTime.setHours(hours, minutes, 0, 0);
              
              // Se o horário já passou hoje, agendar para amanhã
              if (isBefore(scheduledTime, now)) {
                scheduledTime.setDate(scheduledTime.getDate() + 1);
              }
              
              return scheduledTime;
            });
            
            // Pegar o próximo horário mais próximo
            nextFeeding = nextTimes.reduce((closest: Date | null, current: Date) => {
              if (!closest) return current;
              return isBefore(current, closest) ? current : closest;
            }, null) || now;
          } else {
            // Usar o intervalo de alimentação do gato ou um valor padrão
            const interval = cat.feeding_interval || 8;
            const lastFeeding = feedingLogs
              .filter((log: FeedingLog) => log.catId === cat.id)
              .sort((a: FeedingLog, b: FeedingLog) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              )[0];
            
            if (lastFeeding) {
              const lastFeedingTime = toDate(parseISO(lastFeeding.timestamp.toString()), { timeZone: userTimezone });
              nextFeeding = addHours(lastFeedingTime, interval);
              
              if (isBefore(nextFeeding, now)) {
                const intervalsPassedSinceLastFeeding = Math.ceil(
                  (now.getTime() - lastFeedingTime.getTime()) / (interval * 60 * 60 * 1000)
                );
                nextFeeding = addHours(lastFeedingTime, (intervalsPassedSinceLastFeeding + 1) * interval);
              }
            } else {
              nextFeeding = addHours(now, interval);
            }
          }
          
          upcoming.push({
            id: `${schedule.id}-${cat.id}`,
            catId: cat.id,
            catName: cat.name,
            catPhoto: cat.photoUrl || null,
            nextFeeding,
            isOverdue: isBefore(nextFeeding, now)
          });
        });
        
        // Ordenar por horário mais próximo
        upcoming.sort((a, b) => a.nextFeeding.getTime() - b.nextFeeding.getTime());
        
        // Limitar a 5 itens
        setUpcomingFeedings(upcoming.slice(0, 5));
      } catch (error) {
        console.error("Erro ao carregar próximas alimentações:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadUpcomingFeedings();
  }, [session, state.households]);
  
  const handleFeedNow = (catId: number) => {
    router.push(`/feedings/new?catId=${catId}`);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 bg-muted rounded"></div>
                  <div className="h-3 w-1/2 bg-muted rounded"></div>
                </div>
                <div className="h-8 w-20 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (upcomingFeedings.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground">
            Nenhuma alimentação programada.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
    >
      {upcomingFeedings.map((feeding, index) => (
        <motion.div
          key={feeding.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={feeding.isOverdue ? "border-red-200" : ""}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={feeding.catPhoto || ""} alt={feeding.catName} />
                  <AvatarFallback>
                    {feeding.catName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">{feeding.catName}</h3>
                  <p className="text-xs flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {feeding.isOverdue 
                      ? "Atrasado" 
                      : formatInTimeZone(feeding.nextFeeding, session?.user?.timezone || "America/Sao_Paulo", "'Às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant={feeding.isOverdue ? "destructive" : "outline"}
                  onClick={() => handleFeedNow(feeding.catId)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Alimentar
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
} 