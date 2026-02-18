import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import CatsPageContent from "./CatsPageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Meus Gatos", "Gerencie os perfis dos seus felinos.");

export default function CatsPage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <CatsPageContent />
    </Suspense>
  );
}
