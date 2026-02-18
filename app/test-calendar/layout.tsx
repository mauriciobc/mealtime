import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Testar calendário", "Página de teste do calendário.", { noIndex: true });

export default function TestCalendarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
