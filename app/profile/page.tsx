import { pageMetadata } from "@/lib/metadata";
import ProfilePageClient from "./ProfilePageClient";

export const metadata = pageMetadata("Perfil", "Visualize e gerencie seu perfil e preferências.");

export default function ProfilePage() {
  return <ProfilePageClient />;
}
