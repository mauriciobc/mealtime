import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import HouseholdsPageContent from "./HouseholdsPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Minhas Residências", "Gerencie as residências onde você cuida dos seus gatos.");

export default function HouseholdsPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <HouseholdsPageContent />
    </Suspense>
  );
}
