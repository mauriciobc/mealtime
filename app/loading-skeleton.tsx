import { Suspense } from "react";
import { GlobalLoading } from "@/components/ui/global-loading";


export default function LoadingSkeleton() {
  return (
    <GlobalLoading mode="lottie" text="Carregando..." />
  );
} 