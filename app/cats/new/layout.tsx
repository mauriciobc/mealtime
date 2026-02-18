import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Novo gato", "Cadastre um novo gato.");

export default function CatNewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
