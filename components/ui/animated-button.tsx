"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useAnimation } from "@/components/animation-provider"
import { cn } from "@/lib/utils"

interface AnimatedButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {
  ripple?: boolean
}

const AnimatedButton = React.forwardRef<React.ElementRef<typeof Button>, AnimatedButtonProps>(
  ({ className, ripple = true, children, ...props }, ref) => {
    const { shouldAnimate } = useAnimation()

    if (!shouldAnimate) {
      return (
        <Button className={className} ref={ref} {...props}>
          {children}
        </Button>
      )
    }

    return (
      <motion.div whileTap={{ scale: 0.97 }} className="relative">
        <Button className={cn("relative overflow-hidden", className)} ref={ref} {...props}>
          {ripple && <span className="ripple-effect" />}
          {children}
        </Button>
      </motion.div>
    )
  },
)
AnimatedButton.displayName = "AnimatedButton"

export { AnimatedButton }

