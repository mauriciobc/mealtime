"use client";

import { m, AnimatePresence } from "framer-motion";
import { useLoading } from "@/lib/context/LoadingContext";
import { cn } from "@/lib/utils";
import React, { lazy, Suspense, useState, useEffect } from "react";

interface LottieLoadingProps {
  text?: string;
  className?: string;
}

const LottieLazy = lazy(() => import("lottie-react"));

function CatAnimationFallback() {
  return (
    <div className="w-48 h-48 flex items-center justify-center">
      <svg
        className="animate-spin text-primary"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

let animationDataCache: any = null;

async function loadAnimationData() {
  if (animationDataCache) return animationDataCache;
  const response = await fetch("/lottie/cat-animation.json");
  animationDataCache = await response.json();
  return animationDataCache;
}

export function LottieLoading({ text, className }: LottieLoadingProps) {
  const { isLoading, state } = useLoading();
  const [animationData, setAnimationData] = useState<any>(null);
  const hasOperations = state.operations && state.operations.length > 0;
  const currentOperation = hasOperations ? state.operations[0] : null;
  const displayText = text || currentOperation?.description || "Carregando...";

  useEffect(() => {
    if (isLoading && !animationData) {
      loadAnimationData().then(setAnimationData);
    }
  }, [isLoading, animationData]);

  if (!isLoading) return null;

  return (
    <AnimatePresence>
      <m.div
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
            {animationData ? (
              <Suspense fallback={<CatAnimationFallback />}>
                <LottieLazy
                  animationData={animationData}
                  loop={true}
                  autoplay={true}
                />
              </Suspense>
            ) : (
              <CatAnimationFallback />
            )}
          </div>
          {displayText && (
            <p className="text-sm text-muted-foreground">{displayText}</p>
          )}
        </div>
      </m.div>
    </AnimatePresence>
  );
} 