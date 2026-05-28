"use client";

import { LoginPageInner } from "./login-page-inner";

interface LoginPageContentProps {
  redirectTo: string;
}

export default function LoginPageContent({ redirectTo }: LoginPageContentProps) {
  return <LoginPageInner redirectTo={redirectTo} />;
}
