"use client";

import { useAppContext } from "@/lib/context/AppContext";
import { NotificationCenter } from "./notification-center";

export function NotificationBadge() {
  const { state } = useAppContext();
  
  return <NotificationCenter />;
}

export default NotificationBadge;
