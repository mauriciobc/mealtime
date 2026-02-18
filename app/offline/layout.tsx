import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Offline", "Você está offline.");

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
