import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import EditCatPageContent from "./EditCatPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const resolved = await params;
  return pageMetadata("Editar gato", "Edite os dados do gato.");
}

export default async function EditCatPage({ params }: PageProps) {
  const resolved = await params;
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <EditCatPageContent params={resolved} />
    </Suspense>
  );
}
