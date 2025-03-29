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
import { useSession } from "next-auth/react";
import { getFeedingLogs, getCatsByHouseholdId } from "@/lib/services/apiService";
import { getSchedules } from "@/lib/data";
import { getUserTimezone, calculateNextFeeding, formatDateTimeForDisplay } from '@/lib/utils/dateUtils';
import { BaseCat, BaseFeedingLog, ID } from "@/lib/types/common";

interface UpcomingFeeding {
  id: string;
  catId: ID;
  catName: string;
  catPhoto: string | null;
  nextFeeding: Date;
  isOverdue: boolean;
}

export default function FeedingSchedule() {
  const { state } = useGlobalState();
  const { data: session } = useSession();
  const timezone = getUserTimezone(session?.user?.timezone);
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
        
        const cats = await getCatsByHouseholdId(activeHousehold.id);
        const catsMap = new Map(cats.map(cat => [cat.id, cat]));
        
        const schedules = await getSchedules(activeHousehold.id);
        const feedingLogs = await Promise.all(
          cats.map(cat => getFeedingLogs(cat.id.toString(), timezone))
        ).then(logs => logs.flat());
        
        const now = toDate(new Date(), { timeZone: timezone });
        const upcomingFeedings: UpcomingFeeding[] = [];
        
        schedules.forEach((schedule) => {
          const cat = catsMap.get(schedule.catId);
          if (!cat) return;
          
          let nextFeeding: Date;
          
          if (schedule.type === 'interval' && schedule.interval) {
            // Para agendamentos baseados em intervalo
            const interval = schedule.interval;
            const lastFeeding = feedingLogs
              .filter((log: BaseFeedingLog) => log.catId === cat.id)
              .sort((a: BaseFeedingLog, b: BaseFeedingLog) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              )[0];
            
            if (lastFeeding) {
              // Calcular próximo horário usando a função centralizada
              nextFeeding = calculateNextFeeding(new Date(lastFeeding.timestamp), interval, timezone, 'schedule');
            } else {
              nextFeeding = addHours(now, interval);
            }
          } else if (schedule.type === 'fixedTime' && schedule.times) {
            // Para agendamentos baseados em horários fixos
            const times = schedule.times.split(',');
            const nextTimes = times.map((time: string) => {
              const [hours, minutes] = time.split(':').map(Number);
              const scheduledTime = toDate(new Date(), { timeZone: timezone });
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
            // Usar o intervalo de alimentação do gato
            const interval = cat.feeding_interval;
            const lastFeeding = feedingLogs
              .filter((log: BaseFeedingLog) => log.catId === cat.id)
              .sort((a: BaseFeedingLog, b: BaseFeedingLog) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              )[0];
            
            if (lastFeeding) {
              // Calcular próximo horário usando a função centralizada
              nextFeeding = calculateNextFeeding(new Date(lastFeeding.timestamp), interval, timezone, 'cat');
            } else {
              nextFeeding = addHours(now, interval || 8);
            }
          }
          
          upcomingFeedings.push({
            id: `${schedule.id}-${cat.id}`,
            catId: cat.id,
            catName: cat.name,
            catPhoto: cat.photoUrl || null,
            nextFeeding,
            isOverdue: isBefore(nextFeeding, now)
          });
        });
        
        // Ordenar por horário mais próximo
        upcomingFeedings.sort((a, b) => a.nextFeeding.getTime() - b.nextFeeding.getTime());
        
        // Limitar a 5 itens
        setUpcomingFeedings(upcomingFeedings.slice(0, 5));
      } catch (error) {
        console.error("Erro ao carregar próximas alimentações:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadUpcomingFeedings();
  }, [session, state.households]);
  
  const handleFeedNow = (catId: ID) => {
    router.push(`/feedings/new?catId=${catId}`);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="loading-skeleton">
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
                      : formatDateTimeForDisplay(feeding.nextFeeding, getUserTimezone(session?.user?.timezone))}
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