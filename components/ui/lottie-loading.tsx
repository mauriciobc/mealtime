"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLoading } from "@/lib/context/LoadingContext";
import { cn } from "@/lib/utils";
import Lottie from "lottie-react";
import catAnimation from "@/lottie/Animation - 1749307481722.json";

interface LottieLoadingProps {
  text?: string;
  className?: string;
}

export function LottieLoading({ text, className }: LottieLoadingProps) {
  const { isLoading, state } = useLoading();
  const hasOperations = state.operations && state.operations.length > 0;
  const currentOperation = hasOperations ? state.operations[0] : null;
  const displayText = text || currentOperation?.description || "Carregando...";

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 z-50 flex min-h-screen w-full items-center justify-center bg-background/80 backdrop-blur-sm",
            className
          )}
        >
          <div 
            className="flex flex-col items-center gap-4"
            role="status"
            aria-live="polite"
            aria-label="Carregando"
          >
            <div className="w-48 h-48">
              <Lottie
                animationData={catAnimation}
                loop={true}
                autoplay={true}
              />
            </div>
            {displayText && (
              <p className="text-sm text-muted-foreground">{displayText}</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 