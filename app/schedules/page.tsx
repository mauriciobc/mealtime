import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import SchedulesPageContent from "./SchedulesPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Agendamentos", "Gerencie os horários de alimentação programados.");

export default function SchedulesPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <SchedulesPageContent />
    </Suspense>
  );
}
