"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, Clock } from "lucide-react"
import FeedingProgress from "@/components/feeding-progress"
import { motion } from "framer-motion"
import { useAnimation } from "@/components/animation-provider"
import { format, isBefore } from "date-fns"
import { useAppContext } from "@/lib/context/AppContext"
import { getNextFeedingTime } from "@/lib/services/apiService"
import { useRouter } from "next/navigation"
import { ptBR } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatInTimeZone, toDate } from 'date-fns-tz'
import { getUserTimezone } from '@/lib/utils/dateUtils'
import { useSession } from "next-auth/react"
import { toast as sonnerToast } from 'sonner'
import { formatDateTimeForDisplay } from '@/lib/utils/dateUtils'
import { BaseCat, BaseUser, ID } from "@/lib/types/common"

interface UpcomingFeeding {
  id: string;
  catId: ID;
  catName: string;
  catPhoto: string | null;
  nextFeeding: Date;
  isOverdue: boolean;
  avatar?: string;
  lastFed: Date;
  interval: number;
}

// Usar o tipo BaseUser do NextAuth
type SessionUser = BaseUser & {
  activeHousehold?: string;
  timezone?: string;
  language?: string;
}

function formatFeedingTime(date: Date, timezone: string): string {
  return formatDateTimeForDisplay(date, timezone);
}

export default function UpcomingFeedings() {
  const { state } = useAppContext()
  const { shouldAnimate } = useAnimation()
  const [isClient, setIsClient] = useState(false)
  const [isFeeding, setIsFeeding] = useState(false)
  const [upcomingFeedings, setUpcomingFeedings] = useState<UpcomingFeeding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    const fetchData = async () => {
      const user = session?.user as SessionUser | undefined;
      if (!user?.activeHousehold) return;
      
      setIsLoading(true);
      try {
        const timezone = getUserTimezone(user.timezone);
        const now = toDate(new Date(), { timeZone: timezone });
        
        const response = await fetch(`/api/households/${user.activeHousehold}/cats`);
        if (!response.ok) {
          throw new Error('Erro ao buscar gatos');
        }
        const cats: BaseCat[] = await response.json();
        const upcomingFeedings: UpcomingFeeding[] = [];
        
        for (const cat of cats) {
          const nextFeedingPromise = getNextFeedingTime(cat.id.toString(), timezone);
          const nextFeeding = await nextFeedingPromise;
          
          if (nextFeeding) {
            // Buscar o último log de alimentação para este gato
            const feedingLogsResponse = await fetch(`/api/cats/${cat.id}/feeding-logs?limit=1`);
            const feedingLogs = await feedingLogsResponse.json();
            const lastFed = feedingLogs.length > 0 
              ? toDate(feedingLogs[0].timestamp, { timeZone: timezone })
              : now;

            upcomingFeedings.push({
              id: `${cat.id}-${Date.now()}`,
              catId: cat.id,
              catName: cat.name,
              catPhoto: cat.photoUrl || null,
              nextFeeding,
              isOverdue: isBefore(nextFeeding, now),
              avatar: cat.photoUrl || undefined,
              lastFed,
              interval: cat.feeding_interval || 4
            });
          }
        }
        
        // Ordenar por próxima alimentação
        const sortedFeedings = upcomingFeedings.sort((a, b) => a.nextFeeding.getTime() - b.nextFeeding.getTime());
        setUpcomingFeedings(sortedFeedings);
      } catch (error) {
        console.error('Erro ao buscar próximas alimentações:', error);
        setError('Erro ao carregar próximas alimentações');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session?.user]);

  const handleFeedNow = async (catId: ID) => {
    const user = session?.user as SessionUser | undefined;
    if (!user?.activeHousehold) return;
    
    try {
      // Criar timestamp em UTC
      const now = new Date();
      now.setMilliseconds(0);
      
      const response = await fetch('/api/feedings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          catId,
          householdId: parseInt(user.activeHousehold),
          userId: user.id,
          timestamp: now,
          notes: ''
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao registrar alimentação');
      }

      // Atualizar a lista de próximas alimentações
      const updatedFeedings = await Promise.all(
        upcomingFeedings.map(async (feeding) => {
          if (feeding.catId === catId) {
            const nextFeedingPromise = getNextFeedingTime(catId.toString(), user.timezone);
            const nextFeeding = await nextFeedingPromise;
            return {
              ...feeding,
              nextFeeding: nextFeeding || now,
              lastFed: now
            };
          }
          return feeding;
        })
      );

      setUpcomingFeedings(updatedFeedings.sort((a, b) => a.nextFeeding.getTime() - b.nextFeeding.getTime()));
      sonnerToast.success('Alimentação registrada com sucesso!');
    } catch (error) {
      console.error('Erro ao registrar alimentação:', error);
      sonnerToast.error('Erro ao registrar alimentação');
    }
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
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Próximas Alimentações</h2>
      {error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {upcomingFeedings.map((feeding, index) => {
            const user = session?.user as SessionUser | undefined;
            return (
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
                            : formatFeedingTime(feeding.nextFeeding, user?.timezone || "America/Sao_Paulo")}
                        </p>
                        <div className="mt-2">
                          <FeedingProgress
                            lastFed={feeding.lastFed}
                            interval={feeding.interval || 8}
                            size={40}
                            strokeWidth={4}
                          />
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant={feeding.isOverdue ? "destructive" : "outline"}
                        onClick={() => handleFeedNow(feeding.catId)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Alimentar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
