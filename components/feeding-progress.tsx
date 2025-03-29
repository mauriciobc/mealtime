"use client"

import { useEffect, useState, useCallback } from 'react';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { calculateNextFeeding, formatDateTimeForDisplay, getUserTimezone } from '@/lib/utils/dateUtils';
import { useSession } from 'next-auth/react';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { addHours, differenceInHours } from 'date-fns';
import { motion } from "framer-motion"
import { useAnimation } from "@/components/animation-provider"

interface FeedingProgressProps {
  lastFed: Date
  interval: number
  size?: number
  strokeWidth?: number
  color?: string
  bgColor?: string
}

export default function FeedingProgress({
  lastFed,
  interval,
  size = 40,
  strokeWidth = 4,
  color = "#000",
  bgColor = "#e5e7eb",
}: FeedingProgressProps) {
  const { shouldAnimate } = useAnimation()
  const [progress, setProgress] = useState(0)
  const { data: session, status } = useSession();
  const timezone = getUserTimezone(session?.user?.timezone);

  console.log('[Debug FeedingProgress] Status da sessão:', status);
  console.log('[Debug FeedingProgress] Dados iniciais:', {
    lastFed: lastFed ? formatDateTimeForDisplay(lastFed, timezone) : null,
    interval,
    timezone,
    sessionStatus: status,
    isAuthenticated: !!session
  });

  const [nextFeedingTime, setNextFeedingTime] = useState<Date | null>(null);

  // Memoize the calculation function to prevent unnecessary recreations
  const calculateProgress = useCallback(() => {
    if (!lastFed) {
      console.log('[Debug FeedingProgress] Última alimentação não definida');
      return;
    }

    console.log('[Debug Progress] Iniciando cálculo de progresso:');
    console.log('- Última alimentação:', formatDateTimeForDisplay(lastFed, timezone));
    console.log('- Intervalo:', interval, 'horas');
    console.log('- Timezone:', timezone);
    
    try {
      // Converter última alimentação para o timezone do usuário
      const lastFedInTz = toDate(lastFed, { timeZone: timezone });
      console.log('- Última alimentação (TZ):', formatDateTimeForDisplay(lastFedInTz, timezone));
      
      // Obter hora atual no timezone do usuário
      const now = toDate(new Date(), { timeZone: timezone });
      console.log('- Hora atual:', formatDateTimeForDisplay(now, timezone));
      
      // Calcular o próximo horário usando a função centralizada
      const nextFeeding = calculateNextFeeding(lastFedInTz, interval, timezone);
      console.log('- Próximo horário:', formatDateTimeForDisplay(nextFeeding, timezone));
      setNextFeedingTime(nextFeeding);

      // Calcular quantos intervalos se passaram desde a última alimentação
      const hoursElapsed = differenceInHours(now, lastFedInTz);
      const intervalsElapsed = Math.floor(hoursElapsed / interval);
      console.log('- Horas decorridas:', hoursElapsed);
      console.log('- Intervalos completos:', intervalsElapsed);
      
      // Calcular progresso como porcentagem do tempo decorrido no intervalo atual
      const currentIntervalStart = addHours(lastFedInTz, intervalsElapsed * interval);
      console.log('- Início do intervalo atual:', formatDateTimeForDisplay(currentIntervalStart, timezone));
      
      const totalDuration = interval * 60 * 60 * 1000; // intervalo em milissegundos
      const elapsed = now.getTime() - currentIntervalStart.getTime();
      console.log('- Duração total do intervalo (horas):', totalDuration / (60 * 60 * 1000));
      console.log('- Tempo decorrido (horas):', elapsed / (60 * 60 * 1000));

      // Garantir que o progresso esteja entre 0 e 100
      const calculatedProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      console.log('- Progresso calculado:', calculatedProgress.toFixed(2), '%');
      setProgress(calculatedProgress);
    } catch (error) {
      console.error('[Debug FeedingProgress] Erro no cálculo:', error);
    }
  }, [lastFed, interval, timezone]);

  useEffect(() => {
    console.log('[Debug FeedingProgress] useEffect iniciado');
    // Initial calculation
    calculateProgress()
    
    // Update every minute
    const timer = setInterval(calculateProgress, 60000)

    return () => {
      console.log('[Debug FeedingProgress] useEffect cleanup');
      clearInterval(timer)
    }
  }, [calculateProgress])

  // Calculate circle properties
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  if (!shouldAnimate) {
    return (
      <div className="relative w-full space-y-2">
        <Progress value={progress} />
        <div className="flex justify-between text-sm text-gray-500">
          <span>
            {formatDateTimeForDisplay(lastFed, timezone)}
          </span>
          <span>
            {nextFeedingTime && formatDateTimeForDisplay(nextFeedingTime, timezone)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full space-y-2">
      <Progress value={progress} />
      <div className="flex justify-between text-sm text-gray-500">
        <span>
          {formatDateTimeForDisplay(lastFed, timezone)}
        </span>
        <span>
          {nextFeedingTime && formatDateTimeForDisplay(nextFeedingTime, timezone)}
        </span>
      </div>
    </div>
  )
}

