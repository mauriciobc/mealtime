import { pageMetadata } from "@/lib/metadata";
import JoinPageContent from "./JoinPageContent";

export const metadata = pageMetadata("Entrar em um lar", "Aceite um convite para participar de um lar.");

interface JoinPageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams;
  return <JoinPageContent initialInviteCode={params.code ?? ""} />;
}
