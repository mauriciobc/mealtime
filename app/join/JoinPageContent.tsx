"use client";

import { JoinPageInner } from "./join-page-inner";

interface JoinPageContentProps {
  initialInviteCode: string;
}

export default function JoinPageContent({ initialInviteCode }: JoinPageContentProps) {
  return <JoinPageInner initialInviteCode={initialInviteCode} />;
}
