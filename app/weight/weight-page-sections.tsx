"use client";

import ProtectedRoute from '@/components/auth/protected-route';
import { m } from "framer-motion";
import type { useWeightPage } from './use-weight-page';
import { WeightPageHeader } from './weight-page-header';
import { WeightPageGridRow1 } from './weight-page-row1';
import { WeightPageGridRow2 } from './weight-page-row2';
import { WeightPageOverlays } from './weight-page-overlays';

export type WeightPageMainProps = ReturnType<typeof useWeightPage>;

export function WeightPageMainView(props: WeightPageMainProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background p-4 pb-24">
        <m.div
          className="mx-auto max-w-md lg:max-w-6xl xl:max-w-7xl space-y-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <WeightPageHeader {...props} />
          <div className="lg:grid lg:grid-cols-12 lg:gap-6 space-y-6 lg:space-y-0">
            <WeightPageGridRow1 {...props} />
            <WeightPageGridRow2 {...props} />
          </div>
          <WeightPageOverlays {...props} />
        </m.div>
      </div>
    </ProtectedRoute>
  );
}
