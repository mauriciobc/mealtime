"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { useAnimation } from "@/components/animation-provider"
import { formatInTimeZone, toDate } from 'date-fns-tz';
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
  const { data: session } = useSession();
  const timezone = getUserTimezone(session?.user?.timezone);

  // Memoize the calculation function to prevent unnecessary recreations
  const calculateProgress = useCallback(() => {
    const lastFedTime = toDate(lastFed, { timeZone: timezone }).getTime()
    const nextFeedingTime = toDate(new Date(lastFedTime + interval * 60 * 60 * 1000), { timeZone: timezone }).getTime()
    const now = toDate(new Date(), { timeZone: timezone }).getTime()

    // Calculate progress as percentage of time elapsed
    const totalDuration = nextFeedingTime - lastFedTime
    const elapsed = now - lastFedTime

    // Ensure progress is between 0 and 100
    const calculatedProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
    setProgress(calculatedProgress)
  }, [lastFed, interval, timezone])

  useEffect(() => {
    // Initial calculation
    calculateProgress()
    
    // Update every minute
    const timer = setInterval(calculateProgress, 60000)

    return () => clearInterval(timer)
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
            {formatInTimeZone(new Date(nextFeedingTime), timezone, "'Próxima:' HH:mm")}
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
          {formatInTimeZone(new Date(nextFeedingTime), timezone, "'Próxima:' HH:mm")}
        </span>
      </div>
    </div>
  )
}

