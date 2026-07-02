import { pageMetadata } from "@/lib/metadata";
import StatisticsPageContent from "./StatisticsPageContent";

export const metadata = pageMetadata("Estatísticas", "Análise detalhada dos padrões de alimentação.");

interface StatisticsPageProps {
  searchParams: Promise<{ period?: string; catId?: string }>;
}

export default async function StatisticsPage({ searchParams }: StatisticsPageProps) {
  const params = await searchParams;
  return (
    <StatisticsPageContent
      initialPeriod={params.period ?? "7dias"}
      initialCatId={params.catId ?? "all"}
    />
  );
}
