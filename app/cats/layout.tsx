import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Gatos", "Gerencie os gatos do seu lar.");

export default function CatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
