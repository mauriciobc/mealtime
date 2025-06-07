"use client";

import { Suspense } from "react";
import { GlobalLoading } from "@/components/ui/global-loading";
import RootLoading from "./loading-skeleton";

export default function Loading() {
  return <RootLoading />;
}

