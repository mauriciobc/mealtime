"use client"

import React from "react"

import { m } from "framer-motion"
import { useAnimation } from "@/components/animation-provider"

interface AnimatedListProps {
  children: React.ReactNode
  delay?: number
  staggerDelay?: number
}

export default function AnimatedList({ children, delay = 0, staggerDelay = 0.05 }: AnimatedListProps) {
  const { shouldAnimate } = useAnimation()

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
  const animatedChildren = childrenArray.map((child, index) => (
    <m.div key={`animated-item-${index}`} variants={item as any}>
      {child}
    </m.div>
  ))

  return (
    <m.div variants={container as any} initial="hidden" animate="show">
      {animatedChildren}
    </m.div>
  )
}

