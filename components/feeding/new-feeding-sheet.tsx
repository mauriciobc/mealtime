"use client";

import { FeedingLog } from "@/lib/types";
import { useNewFeedingSheet } from "./use-new-feeding-sheet";
import { NewFeedingSheetContent } from "./new-feeding-sheet-sections";

interface NewFeedingSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialCatId?: number;
  initialFeedingLog?: FeedingLog;
}

export function NewFeedingSheet({
  isOpen,
  onOpenChange,
  initialCatId,
  initialFeedingLog
}: NewFeedingSheetProps) {
  const sheet = useNewFeedingSheet({
    isOpen,
    onOpenChange,
    initialCatId,
    initialFeedingLog,
  });

  return (
    <NewFeedingSheetContent
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      sheet={sheet}
    />
  );
}
