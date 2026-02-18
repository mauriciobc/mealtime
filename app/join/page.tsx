import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import JoinPageContent from "./JoinPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Entrar em um lar", "Aceite um convite para participar de um lar.");

export default function JoinPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <JoinPageContent />
    </Suspense>
  );
}
