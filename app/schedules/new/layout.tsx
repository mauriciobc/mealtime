import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Novo agendamento", "Crie um novo agendamento de alimentação.");

export default function ScheduleNewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
