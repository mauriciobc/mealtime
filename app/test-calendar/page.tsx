import { redirect } from "next/navigation";
import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import TestCalendarPageContent from "./TestCalendarPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Teste Calendário", "Teste do componente DayPicker.");

export default function TestCalendarPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <TestCalendarPageContent />
    </Suspense>
  );
}
