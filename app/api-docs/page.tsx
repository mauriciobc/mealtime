import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import ApiDocsPageContent from "./ApiDocsPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Documentação da API", "Documentação interativa da API MealTime (Swagger).");

export default function ApiDocsPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <ApiDocsPageContent />
    </Suspense>
  );
}
