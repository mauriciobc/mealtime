import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Nova alimentação", "Registre uma nova refeição.");

export default function FeedingNewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
