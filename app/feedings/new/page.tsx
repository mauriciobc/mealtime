import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import NewFeedingPageContent from "./NewFeedingPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Nova alimentação", "Registre uma nova alimentação.");

export default function NewFeedingPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <NewFeedingPageContent />
    </Suspense>
  );
}
