import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import EditHouseholdPageContent from "./EditHouseholdPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const resolved = await params;
  return pageMetadata("Editar residência", "Edite os dados da residência.");
}

export default async function EditHouseholdPage({ params }: PageProps) {
  const resolved = await params;
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <EditHouseholdPageContent params={resolved} />
    </Suspense>
  );
}
