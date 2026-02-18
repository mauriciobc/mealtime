import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("Detalhe do histórico", "Detalhes do registro de histórico.");
}

export default function HistoryIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
