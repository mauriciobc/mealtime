"use client";

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

export function createLazyChart<T extends object>(importFn: () => Promise<{ default: ComponentType<T> }>) {
  return dynamic(() => importFn(), {
    ssr: false,
    loading: () => (
      <div className="w-full h-[300px] flex items-center justify-center bg-muted/20 rounded-md">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    ),
  });
}

export const WeightTrendChartLazy = dynamic(
  () => import('./weight-trend-chart').then(mod => ({ default: mod.default })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[300px] flex items-center justify-center bg-muted/20 rounded-md">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    ),
  }
);
