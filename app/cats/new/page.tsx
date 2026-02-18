import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import NewCatPageContent from "./NewCatPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Novo gato", "Cadastre um novo gato na residência.");

export default function NewCatPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <NewCatPageContent />
    </Suspense>
  );
}
