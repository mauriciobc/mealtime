import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import HistoryPageContent from "./HistoryPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Histórico", "Histórico de alimentações.");

export default function HistoryPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <HistoryPageContent />
    </Suspense>
  );
}
