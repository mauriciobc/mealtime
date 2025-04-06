"use client";

import { useNotifications } from "@/lib/context/NotificationContext";
import { NotificationCenter } from "./notification-center";

export function NotificationBadge() {
  const { unreadCount } = useNotifications();
  
  return <NotificationCenter />;
}

export default NotificationBadge;
