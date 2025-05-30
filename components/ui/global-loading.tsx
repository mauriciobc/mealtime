"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLoading } from "@/lib/context/LoadingContext";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

function Spinner({ size = 'md', text, className }: SpinnerProps) {
  return (
    <>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          duration: 1,
          ease: "linear",
        }}
      >
        <Loader2 className={cn("text-primary", sizeClasses[size])} />
      </motion.div>
      {text && (
        <p className={cn("text-sm text-muted-foreground", className)}>{text}</p>
      )}
    </>
  );
}

interface GlobalLoadingProps {
  mode?: 'progress' | 'spinner' | 'overlay';
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function GlobalLoading({ mode = 'progress', text, size = 'md' }: GlobalLoadingProps) {
  const { isLoading, state } = useLoading();
  const hasOperations = state.operations && state.operations.length > 0;
  const currentOperation = hasOperations ? state.operations[0] : null;
  const displayText = text || currentOperation?.description || "Carregando...";

  if (isLoading && !hasOperations) {
    return null;
  }

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "z-50",
            mode === 'overlay' && "fixed inset-0 flex min-h-screen w-full items-center justify-center bg-background/80 backdrop-blur-sm",
            mode === 'spinner' && "flex items-center justify-center",
            mode === 'progress' && "fixed top-0 left-0 right-0 pt-[56px]"
          )}
        >
          {mode === 'overlay' && (
            <div 
              className="flex flex-col items-center gap-4"
              role="status"
              aria-live="polite"
              aria-label="Carregando"
            >
              <Spinner size={size} text={displayText} />
            </div>
          )}

          {mode === 'spinner' && (
            <div
              className="flex items-center gap-2"
              role="status"
              aria-live="polite"
              aria-label="Carregando"
            >
              <Spinner size={size} text={displayText} />
            </div>
          )}

          {mode === 'progress' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Progress 
                className="h-1" 
                aria-label="Progresso de carregamento"
                aria-valuetext="Carregando..."
                role="progressbar"
                value={currentOperation?.progressPercentage ?? 0}
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
} 