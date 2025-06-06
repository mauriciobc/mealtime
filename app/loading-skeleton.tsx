import { Suspense } from "react";
import { GlobalLoading } from "@/components/ui/global-loading";

export function LoadingSkeleton() {
  return (
    <GlobalLoading mode="lottie" text="Carregando..." />
  );
}

export default LoadingSkeleton; 