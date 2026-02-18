import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Testar notificações", "Página de teste de notificações.", { noIndex: true });

export default function TestNotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
