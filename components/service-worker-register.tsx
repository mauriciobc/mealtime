'use client';

import { useEffect } from 'react';

function isDevOrPreviewServer(): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('devserver-')) {
    return true;
  }
  return false;
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    // SW caches / and breaks webpack HMR on dev + Netlify Preview Server.
    // Also unregister any SW left from a prior production visit.
    if (isDevOrPreviewServer()) {
      void navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      );
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (supabaseUrl && typeof window !== 'undefined' && window.navigator.serviceWorker) {
      const supabaseOrigin = new URL(supabaseUrl).origin;
      (self as { SUPABASE_ORIGIN?: string }).SUPABASE_ORIGIN = supabaseOrigin;
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => {
        // Non-critical
      });
  }, []);

  return null;
}
