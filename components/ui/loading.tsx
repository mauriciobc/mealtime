"use client";

import { GlobalLoading } from "./global-loading";
import { LottieLoading } from "./lottie-loading";

interface LoadingProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "spinner" | "lottie";
}

export function Loading({ text, size = "md", className, variant = "lottie" }: LoadingProps) {
  if (variant === "lottie") {
    return <LottieLoading text={text} className={className} />;
  }

  return (
    <GlobalLoading 
      mode="spinner" 
      text={text} 
      size={size}
    />
  );
} 