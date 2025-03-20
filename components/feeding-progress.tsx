"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { useAnimation } from "@/components/animation-provider"
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { addHours, differenceInHours } from 'date-fns';
import { getUserTimezone } from '@/lib/utils/dateUtils';
import { useSession } from "next-auth/react";
import { Progress } from "@/components/ui/progress";

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
    lastFed: lastFed ? formatInTimeZone(lastFed, timezone, 'yyyy-MM-dd HH:mm:ss') : null,
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
    console.log('- Última alimentação:', formatInTimeZone(lastFed, timezone, 'yyyy-MM-dd HH:mm:ss'));
    console.log('- Intervalo:', interval, 'horas');
    console.log('- Timezone:', timezone);
    
    try {
      // Converter última alimentação para o timezone do usuário
      const lastFedInTz = toDate(lastFed, { timeZone: timezone });
      console.log('- Última alimentação (TZ):', formatInTimeZone(lastFedInTz, timezone, 'yyyy-MM-dd HH:mm:ss'));
      
      // Obter hora atual no timezone do usuário
      const now = toDate(new Date(), { timeZone: timezone });
      console.log('- Hora atual:', formatInTimeZone(now, timezone, 'yyyy-MM-dd HH:mm:ss'));
      
      // Calcular quantos intervalos se passaram desde a última alimentação
      const hoursElapsed = differenceInHours(now, lastFedInTz);
      const intervalsElapsed = Math.floor(hoursElapsed / interval);
      console.log('- Horas decorridas:', hoursElapsed);
      console.log('- Intervalos completos:', intervalsElapsed);
      
      // Calcular o próximo horário baseado no último intervalo completo
      const nextFeeding = addHours(lastFedInTz, (intervalsElapsed + 1) * interval);
      console.log('- Próximo horário:', formatInTimeZone(nextFeeding, timezone, 'yyyy-MM-dd HH:mm:ss'));
      setNextFeedingTime(nextFeeding);

      // Calcular progresso como porcentagem do tempo decorrido no intervalo atual
      const currentIntervalStart = addHours(lastFedInTz, intervalsElapsed * interval);
      console.log('- Início do intervalo atual:', formatInTimeZone(currentIntervalStart, timezone, 'yyyy-MM-dd HH:mm:ss'));
      
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
            {formatInTimeZone(lastFed, timezone, "'Última:' HH:mm")}
          </span>
          <span>
            {nextFeedingTime && formatInTimeZone(nextFeedingTime, timezone, "'Próxima:' HH:mm")}
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
          {formatInTimeZone(lastFed, timezone, "'Última:' HH:mm")}
        </span>
        <span>
          {nextFeedingTime && formatInTimeZone(nextFeedingTime, timezone, "'Próxima:' HH:mm")}
        </span>
      </div>
    </div>
  )
}

