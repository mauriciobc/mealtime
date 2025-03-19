"use client";

import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoadingProps {
  text?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Loading({ text = "Carregando...", className, size = "md" }: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const containerVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: {
        duration: 0.3
      }
    }
  };

  const spinnerVariants = {
    animate: {
      rotate: 360,
      transition: {
        repeat: Infinity,
        ease: "linear",
        duration: 1.5,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className={cn(
        "flex flex-col items-center justify-center py-8 px-4 text-center",
        className
      )}
    >
      <motion.div
        variants={spinnerVariants}
        animate="animate"
      >
        <Loader2 className={cn("text-primary", sizeClasses[size])} />
      </motion.div>
      {text && <p className="mt-3 text-muted-foreground">{text}</p>}
    </motion.div>
  );
} 