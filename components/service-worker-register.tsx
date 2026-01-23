'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (supabaseUrl && typeof window !== 'undefined' && window.navigator.serviceWorker) {
        const supabaseOrigin = new URL(supabaseUrl).origin;
        (self as any).SUPABASE_ORIGIN = supabaseOrigin;
      }

      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(function() {
          // Silent catch - service worker registration failure is non-critical
        });
    }
  }, []);

  return null;
}

