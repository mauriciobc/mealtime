import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Agendamentos", "Agende alimentação dos seus gatos.");

export default function SchedulesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
