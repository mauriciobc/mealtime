"use client";

import { Spinner } from "@/components/ui/global-loading";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export default function LoadingSpinner({
  size = "md",
  text,
  className,
}: Loading-spinnerProps) {
  return <Spinner size={size} text={text} className={className} />;
}
