import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Editar gato", "Edite as informações do gato.");

export default function CatEditLayout({ children }: { children: React.ReactNode }) {
  return children;
}
