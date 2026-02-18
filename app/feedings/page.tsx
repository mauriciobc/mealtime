import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import FeedingsPageContent from "./FeedingsPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Alimentações", "Histórico e registro de alimentações.");

export default function FeedingsPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <FeedingsPageContent />
    </Suspense>
  );
}
