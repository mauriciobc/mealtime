"use client"

import React, { useRef } from "react"

import { m } from "framer-motion"
import { useAnimation } from "@/components/animation-provider"

interface AnimatedListProps {
  children: React.ReactNode
  delay?: number
  staggerDelay?: number
}

export default function AnimatedList({ children, delay = 0, staggerDelay = 0.05 }: AnimatedListProps) {
  const { shouldAnimate } = useAnimation()
  const keysRef = useRef<string[]>([])

  if (!shouldAnimate) {
    return <>{children}</>
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
  }

  // Clone children and wrap each in a m.div
  const childrenArray = React.Children.toArray(children)
  if (keysRef.current.length !== childrenArray.length) {
    keysRef.current = childrenArray.map((child, slot) =>
      React.isValidElement(child) && child.key != null
        ? String(child.key)
        : `animated-item-${slot}`
    )
  }
  const animatedChildren = childrenArray.map((child, slot) => (
    <m.div key={keysRef.current[slot]} variants={item as any}>
      {child}
    </m.div>
  ))

  return (
    <m.div variants={container as any} initial="hidden" animate="show">
      {animatedChildren}
    </m.div>
  )
}

