"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLoading } from "@/lib/context/LoadingContext";
import { Progress } from "@/components/ui/progress";

export function GlobalLoading() {
  const { state } = useLoading();
  const { isGlobalLoading } = state;

  if (!isGlobalLoading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <Progress indeterminate className="h-1" />
      </motion.div>
    </AnimatePresence>
  );
} 