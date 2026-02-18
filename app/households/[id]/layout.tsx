import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params;
  return pageMetadata("Detalhes da residência", "Detalhes e configurações do lar.");
}

export default function HouseholdIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
