import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import OfflinePageContent from "./OfflinePageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Offline", "Você está offline. Verifique sua conexão.");

export default function OfflinePage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <OfflinePageContent />
    </Suspense>
  );
}
