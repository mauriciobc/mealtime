import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import EditProfilePageContent from "./EditProfilePageContent";
import { GlobalLoading } from "@/components/ui/global-loading";

export const metadata = pageMetadata("Editar perfil", "Edite seu nome, username e preferências.");

export default function EditProfilePage() {
  return (
    <Suspense fallback={<GlobalLoading mode="overlay" />}>
      <EditProfilePageContent />
    </Suspense>
  );
}
