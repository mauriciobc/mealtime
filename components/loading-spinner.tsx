"use client";

import { Spinner } from "@/components/ui/global-loading";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
}

export default function LoadingSpinner({ size = "md" }: LoadingSpinnerProps) {
  return <Spinner size={size} />;
}
