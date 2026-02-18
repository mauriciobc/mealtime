import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import HouseholdPageContent from "./HouseholdPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const resolved = await params;
  return pageMetadata("Residência", "Detalhes da residência.");
}

export default async function HouseholdDetailsPage({ params }: PageProps) {
  const resolved = await params;
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <HouseholdPageContent params={resolved} />
    </Suspense>
  );
}
