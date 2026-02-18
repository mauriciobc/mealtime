import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import WeightPageContent from "./WeightPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Peso", "Acompanhe o peso e metas dos seus gatos.");

export default function WeightPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <WeightPageContent />
    </Suspense>
  );
}
