"use client";

import { useState, useEffect, useMemo } from "react";
import { format, addHours, isBefore, parseISO, compareAsc } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/context/AppContext";
import { useUserContext } from "@/lib/context/UserContext";
import { useSession } from "next-auth/react";
import { getSchedules } from "@/lib/data";
import { getUserTimezone, calculateNextFeeding, formatDateTimeForDisplay } from '@/lib/utils/dateUtils';
import { CatType, FeedingLog, Schedule, ID } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface UpcomingFeeding {
  id: string;
  catId: ID;
  catName: string;
  catPhoto: string | null;
  nextFeeding: Date;
  isOverdue: boolean;
}

export default function FeedingSchedule() {
  const { state: appState } = useAppContext();
  const { state: userState } = useUserContext();
  const { cats, feedingLogs, schedules } = appState;
  const { currentUser } = userState;
  const { data: session, status } = useSession();
  const timezone = useMemo(() => getUserTimezone(session?.user?.timezone), [session?.user?.timezone]);
  const [upcomingFeedings, setUpcomingFeedings] = useState<UpcomingFeeding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (status !== 'authenticated' || !currentUser || !currentUser.householdId || !cats || !feedingLogs) {
       setIsLoading(false);
       return;
    }

    setIsLoading(true);
    
    try {
        const now = toDate(new Date(), { timeZone: timezone });
        const householdCats = cats.filter(cat => String(cat.householdId) === String(currentUser.householdId));
        const householdLogs = feedingLogs.filter(log => householdCats.some(cat => cat.id === log.catId));
        const householdSchedules = schedules.filter(sch => householdCats.some(cat => cat.id === sch.catId));
        
        const calculatedFeedings: UpcomingFeeding[] = [];

        householdCats.forEach((cat) => {
            const catSchedules = householdSchedules.filter(sch => sch.catId === cat.id);
            const catLogs = householdLogs
                .filter(log => log.catId === cat.id)
                .sort((a, b) => compareAsc(new Date(b.timestamp), new Date(a.timestamp)));
            const lastFeeding = catLogs[0] ? new Date(catLogs[0].timestamp) : null;

            let nextFeedingTime: Date | null = null;

            const fixedSchedules = catSchedules.filter(sch => sch.type === 'fixedTime' && sch.times);
            if (fixedSchedules.length > 0) {
                let earliestNextFixed = null;
                fixedSchedules.forEach(schedule => {
                    const times = schedule.times.split(',');
                    times.forEach(time => {
                        const [hours, minutes] = time.trim().split(':').map(Number);
                        if (isNaN(hours) || isNaN(minutes)) return;

                        const scheduledToday = toDate(new Date(now), { timeZone: timezone });
                        scheduledToday.setHours(hours, minutes, 0, 0);

                        let scheduledDateTime = scheduledToday;
                        if (isBefore(scheduledDateTime, now)) {
                             scheduledDateTime = new Date(scheduledToday.setDate(scheduledToday.getDate() + 1));
                        }

                        if (!earliestNextFixed || isBefore(scheduledDateTime, earliestNextFixed)) {
                             earliestNextFixed = scheduledDateTime;
                        }
                    });
                });
                nextFeedingTime = earliestNextFixed;
            }

            const intervalSchedules = catSchedules.filter(sch => sch.type === 'interval' && sch.interval);
            if (!nextFeedingTime && intervalSchedules.length > 0 && intervalSchedules[0].interval) {
                 if (lastFeeding) {
                    nextFeedingTime = calculateNextFeeding(lastFeeding, intervalSchedules[0].interval, timezone);
                } else {
                     nextFeedingTime = addHours(now, intervalSchedules[0].interval);
                 }
            }

            if (!nextFeedingTime && cat.feedingInterval) {
                 if (lastFeeding) {
                    nextFeedingTime = calculateNextFeeding(lastFeeding, cat.feedingInterval, timezone);
                } else {
                     nextFeedingTime = addHours(now, cat.feedingInterval);
                 }
            }
            
            if (nextFeedingTime) {
                 calculatedFeedings.push({
                     id: `cat-${cat.id}-next`,
                     catId: cat.id,
                     catName: cat.name,
                     catPhoto: cat.photoUrl || null,
                     nextFeeding: nextFeedingTime,
                     isOverdue: isBefore(nextFeedingTime, now)
                 });
            }
        });

        calculatedFeedings.sort((a, b) => compareAsc(a.nextFeeding, b.nextFeeding));
        setUpcomingFeedings(calculatedFeedings.slice(0, 5));
        
    } catch (error) {
        console.error("FeedingSchedule: Error calculating upcoming feedings:", error);
    } finally {
        setIsLoading(false);
    }

  }, [status, currentUser, cats, feedingLogs, schedules, timezone]);

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
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20 rounded" />
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
            Nenhuma alimentação futura programada ou calculada.
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
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className={`transition-colors ${feeding.isOverdue ? "border-destructive/50 bg-destructive/5" : "border"}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={feeding.catPhoto || undefined} alt={feeding.catName} />
                  <AvatarFallback>{feeding.catName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{feeding.catName}</h3>
                  <p className={`text-xs flex items-center gap-1 ${feeding.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                       {feeding.isOverdue 
                         ? `Atrasado (${formatDistanceToNow(feeding.nextFeeding, { locale: ptBR, addSuffix: true })})` 
                         : formatDateTimeForDisplay(feeding.nextFeeding, timezone)}
                     </span>
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant={feeding.isOverdue ? "destructive" : "outline"}
                  onClick={() => handleFeedNow(feeding.catId)}
                  className="flex-shrink-0 h-8 px-3"
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