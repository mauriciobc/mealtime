"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { useAnimation } from "@/components/animation-provider"

interface FeedingProgressProps {
  lastFed: string
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

  // Memoize the calculation function to prevent unnecessary recreations
  const calculateProgress = useCallback(() => {
    const lastFedTime = new Date(lastFed).getTime()
    const nextFeedingTime = new Date(lastFedTime + interval * 60 * 60 * 1000).getTime()
    const now = new Date().getTime()

    // Calculate progress as percentage of time elapsed
    const totalDuration = nextFeedingTime - lastFedTime
    const elapsed = now - lastFedTime

    // Ensure progress is between 0 and 100
    const calculatedProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
    setProgress(calculatedProgress)
  }, [lastFed, interval])

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
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            stroke={bgColor}
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            r={radius}
            cx={size / 2}
            cy={size / 2}
            style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium" style={{ color }}>
          {Math.round(progress)}%
        </div>
      </div>
    )
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle stroke={bgColor} fill="transparent" strokeWidth={strokeWidth} r={radius} cx={size / 2} cy={size / 2} />
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeInOut" }}
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium" style={{ color }}>
        {Math.round(progress)}%
      </div>
    </div>
  )
}

