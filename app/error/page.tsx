import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import ErrorPageContent from "./ErrorPageContent";

export const metadata = pageMetadata("Erro", "Ocorreu um erro.");

export default function ErrorPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Carregando...</div>}>
      <ErrorPageContent />
    </Suspense>
  );
}
