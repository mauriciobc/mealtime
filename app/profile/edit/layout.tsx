import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Editar perfil", "Edite suas informações e preferências.");

export default function ProfileEditLayout({ children }: { children: React.ReactNode }) {
  return children;
}
