"use client";

import { TestNotificationsPageMainView } from "./test-notifications-sections";
import { useTestNotificationsPage } from "./use-test-notifications-page";

export default function TestNotificationsPageContent() {
  const page = useTestNotificationsPage();
  return <TestNotificationsPageMainView {...page} />;
}
