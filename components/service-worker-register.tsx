'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 * 
 * Registers the service worker with Supabase origin configuration
 * from environment variables.
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_SUPABASE_URL: The Supabase project URL
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      // Configure Supabase origin before registering service worker
      if (supabaseUrl && typeof window !== 'undefined' && window.navigator.serviceWorker) {
        const supabaseOrigin = new URL(supabaseUrl).origin;
        // Store the Supabase origin globally so the service worker can access it
        (self as any).SUPABASE_ORIGIN = supabaseOrigin;
      }

      window.addEventListener('load', function() {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then(function(registration) {
            console.log('Service worker successfully registered with scope:', registration.scope);
          })
          .catch(function(error) {
            console.log('Service worker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}

