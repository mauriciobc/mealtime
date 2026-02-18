import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Erro", "Ocorreu um erro.");

export default function ErrorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
