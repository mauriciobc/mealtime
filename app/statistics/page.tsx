import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import StatisticsPageContent from "./StatisticsPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Estatísticas", "Análise detalhada dos padrões de alimentação.");

export default function StatisticsPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <StatisticsPageContent />
    </Suspense>
  );
}
