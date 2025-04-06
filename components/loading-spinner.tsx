"use client"

import { motion } from "framer-motion"
import { useAnimation } from "@/components/animation-provider"

interface LoadingSpinnerProps {
  size?: number
  color?: string
}

export default function LoadingSpinner({ size = 24, color = "currentColor" }: LoadingSpinnerProps) {
  const { shouldAnimate } = useAnimation()

  if (!shouldAnimate) {
    return (
      <div
        className="rounded-full border-2 border-t-transparent"
        style={{
          width: size,
          height: size,
          borderColor: `${color} transparent transparent transparent`,
        }}
      />
    )
  }

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        repeat: Number.POSITIVE_INFINITY,
        duration: 1,
        ease: "linear",
      }}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        borderTopColor: "transparent",
      }}
    />
  )
}

