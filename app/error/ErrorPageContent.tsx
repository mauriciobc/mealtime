"use client";

import { ErrorPageInner } from "./error-page-inner";

interface ErrorPageContentProps {
  message: string | null;
}

export default function ErrorPageContent({ message }: ErrorPageContentProps) {
  return <ErrorPageInner message={message} />;
}
