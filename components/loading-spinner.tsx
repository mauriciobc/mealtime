"use client";

import { useEffect, useState } from "react";
import { GlobalLoading } from "@/components/ui/global-loading";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  delay?: number;
}

export default function LoadingSpinner({
  size = "md",
  delay = 200,
}: LoadingSpinnerProps) {
  const [isVisible, setIsVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!isVisible) {
    return null;
  }

  return <GlobalLoading mode="spinner" size={size} />;
} 