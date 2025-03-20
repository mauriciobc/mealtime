"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, Clock } from "lucide-react"
import { AnimatedCard } from "@/components/ui/animated-card"
import AnimatedIcon from "@/components/animated-icon"
import FeedingProgress from "@/components/feeding-progress"
import { motion } from "framer-motion"
import { useAnimation } from "@/components/animation-provider"
import { Cat, FeedingLog } from "@/lib/types"
import { format, formatDistanceToNow, addHours, isBefore } from "date-fns"
import { useAppContext } from "@/lib/context/AppContext"
import { getNextFeedingTime } from "@/lib/services/apiService"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { getSchedules, getCats } from "@/lib/data"
import { ptBR } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatInTimeZone, toDate } from 'date-fns-tz'
import { getUserTimezone } from '@/lib/utils/dateUtils'
import { useSession } from "next-auth/react"
import { logFeeding } from "@/lib/services/apiService"
import { getCatsByHouseholdId } from "@/lib/data"
import { Image } from "@/components/ui/image"
import { CatIcon } from "@/components/icons/CatIcon"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { CatType } from '@/lib/types'
import { toast as sonnerToast } from 'sonner'

interface CatWithFeedingTime extends Cat {
  nextFeedingTime: Date;
  timeUntilFeeding: number;
}

interface UpcomingFeeding {
  id: string;
  catId: number;
  catName: string;
  catPhoto: string | null;
  nextFeeding: Date;
  isOverdue: boolean;
  avatar?: string;
}

export default function UpcomingFeedings() {
  const { state, dispatch } = useAppContext()
  const { shouldAnimate } = useAnimation()
  const [formattedTime, setFormattedTime] = useState<string>("")
  const [formattedTimeAgo, setFormattedTimeAgo] = useState<string>("")
  const [isClient, setIsClient] = useState(false)
  const [isFeeding, setIsFeeding] = useState(false)
  const [upcomingFeedings, setUpcomingFeedings] = useState<UpcomingFeeding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const session = useSession()

  // Memoize the calculation function to avoid recalculation on every render
  const getNextCatToFeed = useCallback((): CatWithFeedingTime | null => {
    const now = new Date()
    const catsWithNextFeeding = state.cats
      .map((cat: Cat) => {
        // Get next feeding time with correct parameter order: catId, cats array, feedingLogs array
        const nextFeedingTime = getNextFeedingTime(cat.id, state.cats, state.feedingLogs)
        
        // Skip cats with null feeding time
        if (!nextFeedingTime) return null
        
        return {
          ...cat,
          nextFeedingTime,
          timeUntilFeeding: nextFeedingTime.getTime() - now.getTime()
        } as CatWithFeedingTime
      })
      .filter((cat): cat is CatWithFeedingTime => cat !== null);

    // Sort by closest upcoming feeding time
    return catsWithNextFeeding.length > 0 
      ? catsWithNextFeeding.sort((a, b) => a.timeUntilFeeding - b.timeUntilFeeding)[0] 
      : null
  }, [state.cats, state.feedingLogs])

  // Memoize nextCat to prevent unnecessary recalculations
  const nextCat = useMemo(() => getNextCatToFeed(), [getNextCatToFeed])

  // Initialize client state and format times once
  useEffect(() => {
    setIsClient(true)
    if (nextCat) {
      setFormattedTime(format(nextCat.nextFeedingTime, "h:mm a"))
      setFormattedTimeAgo(formatDistanceToNow(nextCat.nextFeedingTime, { addSuffix: true }))
    }
  }, [nextCat])

  // Update time distance every minute
  useEffect(() => {
    if (!nextCat) return; // Early return if no cat
    
    // Initial update
    setFormattedTimeAgo(formatDistanceToNow(nextCat.nextFeedingTime, { addSuffix: true }))
    
    // Update the time distance every minute
    const interval = setInterval(() => {
      setFormattedTimeAgo(formatDistanceToNow(nextCat.nextFeedingTime, { addSuffix: true }))
    }, 60000);

    return () => clearInterval(interval);
  }, [nextCat]);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.activeHousehold) return;
      
      setIsLoading(true);
      try {
        const timezone = getUserTimezone(session?.user?.timezone);
        const now = toDate(new Date(), { timeZone: timezone });
        
        const response = await fetch(`/api/households/${session.user.activeHousehold}/cats`);
        if (!response.ok) {
          throw new Error('Erro ao buscar gatos');
        }
        const cats: CatType[] = await response.json();
        const upcomingFeedings = [];
        
        for (const cat of cats) {
          const nextFeeding = await getNextFeedingTime(cat.id.toString(), timezone);
          if (nextFeeding) {
            upcomingFeedings.push({
              catId: cat.id,
              catName: cat.name,
              nextFeeding,
              avatar: cat.avatar
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
  }, [session?.user?.activeHousehold]);

  if (!nextCat) return null

  // Get the latest feeding log for this cat - move this to useMemo if used in multiple places
  const getLatestFeedingLog = (): FeedingLog | undefined => {
    return state.feedingLogs
      .filter(log => log.catId === nextCat.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
  }

  const latestFeedingLog = getLatestFeedingLog()

  // Check if feeding is completed
  const isFeedingCompleted = (): boolean => {
    if (!latestFeedingLog) return false
    
    const lastFedTime = new Date(latestFeedingLog.timestamp).getTime()
    const now = new Date().getTime()
    
    // If the last feeding was less than 30 minutes ago, consider it completed
    return now - lastFedTime < 30 * 60 * 1000
  }

  // Get the user who completed the feeding
  const getFeederName = (): string => {
    if (!latestFeedingLog) return "Unknown"
    
    const feeder = state.users.find(user => user.id === latestFeedingLog.userId)
    return feeder?.name || "Unknown"
  }

  // Calculate progress percentage for the feeding interval
  const getProgressPercentage = (): number => {
    if (!latestFeedingLog) return 0
    
    const lastFedTime = new Date(latestFeedingLog.timestamp).getTime()
    const nextFeedingTime = nextCat.nextFeedingTime.getTime()
    const now = new Date().getTime()
    
    const totalInterval = nextFeedingTime - lastFedTime
    const elapsed = now - lastFedTime
    
    // Cap at 100%
    return Math.min(100, (elapsed / totalInterval) * 100)
  }

  const CompletedBadge = () => {
    if (!shouldAnimate) {
      return (
        <div className="bg-gray-800 text-white text-xs px-2.5 py-1 rounded-full flex items-center">
          <Check className="h-3 w-3 mr-1" />
          Completed
        </div>
      )
    }

    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 15,
        }}
        className="bg-gray-800 text-white text-xs px-2.5 py-1 rounded-full flex items-center"
      >
        <Check className="h-3 w-3 mr-1" />
        Completed
      </motion.div>
    )
  }

  const handleMarkAsFed = async (): Promise<void> => {
    if (isFeeding) return;
    
    setIsFeeding(true);
    
    try {
      // Make sure we have a current user
      if (!state.currentUser) {
        toast({
          title: "Error",
          description: "No user found. Please log in again.",
          variant: "destructive"
        });
        setIsFeeding(false);
        return;
      }
      
      // Create a new feeding log
      const newLog: Omit<FeedingLog, 'id'> = {
        catId: nextCat.id,
        userId: state.currentUser.id,
        timestamp: new Date(),
        amount: nextCat.regularAmount,
        isCompleted: true,
      };
      
      // Add log to state optimistically
      const optimisticId = `temp-${Date.now()}`;
      dispatch({
        type: 'ADD_FEEDING_LOG',
        payload: { ...newLog, id: optimisticId }
      });
      
      // Generate a proper UUID
      const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      
      // Save to API
      setTimeout(() => {
        // Remove optimistic entry and add real one
        dispatch({
          type: 'DELETE_FEEDING_LOG',
          payload: optimisticId
        });
        
        dispatch({
          type: 'ADD_FEEDING_LOG',
          payload: { ...newLog, id }
        });
        
        // Show toast notification
        toast({
          title: "Feeding recorded",
          description: `${nextCat.name} was fed ${nextCat.regularAmount} ${nextCat.foodUnit}`,
        });
        
        setIsFeeding(false);
      }, 500);
    } catch (error) {
      console.error("Error marking as fed:", error);
      toast({
        title: "Error",
        description: "Failed to record feeding. Please try again.",
        variant: "destructive"
      });
      setIsFeeding(false);
    }
  }

  const handleFeedNow = async (catId: number) => {
    if (!session?.user?.activeHousehold) return;
    
    try {
      const timezone = getUserTimezone(session?.user?.timezone);
      const now = toDate(new Date(), { timeZone: timezone });
      
      const response = await fetch('/api/feedings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          catId,
          householdId: parseInt(session.user.activeHousehold),
          userId: session.user.id,
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
            const nextFeeding = await getNextFeedingTime(catId.toString(), timezone);
            return {
              ...feeding,
              nextFeeding: nextFeeding || now
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
      ) : upcomingFeedings.length === 0 ? (
        <div className="text-gray-500">Nenhuma alimentação programada</div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingFeedings.map((feeding) => (
            <div
              key={feeding.catId}
              className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                {feeding.avatar ? (
                  <Image
                    src={feeding.avatar}
                    alt={feeding.catName}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <CatIcon className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-medium">{feeding.catName}</h3>
                  <p className="text-sm text-gray-500">
                    {formatInTimeZone(
                      feeding.nextFeeding,
                      getUserTimezone(session?.user?.timezone),
                      "'Às' HH:mm",
                      { locale: ptBR }
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFeedNow(feeding.catId)}
              >
                Alimentar Agora
              </Button>
            </div>
          ))}
        </div>
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
                      : format(feeding.nextFeeding, "'Às' HH:mm", { locale: ptBR })}
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
  )
}
