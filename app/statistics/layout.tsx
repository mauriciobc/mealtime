import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Estatísticas", "Estatísticas de alimentação e peso.");

export default function StatisticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
