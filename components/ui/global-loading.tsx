"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLoading } from "@/lib/context/LoadingContext";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function GlobalLoading() {
  const { state } = useLoading();
  const { isGlobalLoading, operations } = state;

  if (!isGlobalLoading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      >
        <div className="flex flex-col items-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <Loader2 className="h-8 w-8 text-primary" />
          </motion.div>
          <div className="space-y-2 text-center">
            <p className="text-sm font-medium text-foreground">
              {operations[0]?.description || "Carregando..."}
            </p>
            {operations.length > 1 && (
              <p className="text-xs text-muted-foreground">
                +{operations.length - 1} operações pendentes
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 