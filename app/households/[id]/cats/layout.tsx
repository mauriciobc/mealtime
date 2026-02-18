import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Gatos do lar", "Gatos desta residência.");

export default function HouseholdCatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
