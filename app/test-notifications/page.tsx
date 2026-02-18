import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import TestNotificationsPageContent from "./TestNotificationsPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Teste de notificações", "Página de teste para notificações.");

export default function TestNotificationsPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <TestNotificationsPageContent />
    </Suspense>
  );
}
