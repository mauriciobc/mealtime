"use client"

import type React from "react"

import { m } from "framer-motion"
import { useAnimation } from "@/components/animation-provider"

interface PageTransitionProps {
  children: React.ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  const { shouldAnimate } = useAnimation()

  if (!shouldAnimate) {
    return <>{children}</>
  }

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen"
    >
      <m.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          duration: 0.5,
          staggerChildren: 0.1,
          ease: [0.25, 0.1, 0.25, 1.0],
        }}
      >
        {children}
      </m.div>
    </m.div>
  )
}

