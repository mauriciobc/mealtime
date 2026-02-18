import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import NotificationsPageContent from "./NotificationsPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Notificações", "Visualize e gerencie suas notificações.");

export default function NotificationsPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <NotificationsPageContent />
    </Suspense>
  );
}
