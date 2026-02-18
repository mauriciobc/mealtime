import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import NewSchedulePageContent from "./NewSchedulePageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Novo agendamento", "Crie um novo agendamento de alimentação.");

export default function NewSchedulePage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <NewSchedulePageContent />
    </Suspense>
  );
}
