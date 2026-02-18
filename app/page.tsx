import { pageMetadata } from "@/lib/metadata";
import HomeClient from "./HomeClient";

export const metadata = pageMetadata("Início", "Dashboard MealTime.");

export default function Home() {
  return <HomeClient />;
}
