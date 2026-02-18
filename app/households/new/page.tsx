import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import NewHouseholdPageContent from "./NewHouseholdPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Nova residência", "Crie uma nova residência.");

export default function NewHouseholdPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <NewHouseholdPageContent />
    </Suspense>
  );
}
