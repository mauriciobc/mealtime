/**
 * Compatibility wrapper for Netlify
 * 
 * Next.js 16 renamed middleware.ts to proxy.ts, but Netlify's plugin
 * (@netlify/plugin-nextjs@5.14.4) doesn't support proxy.ts yet.
 * 
 * This file acts as a bridge to make the proxy work on Netlify deployments.
 * 
 * @see https://nextjs.org/blog/next-16#proxyts-formerly-middlewarets
 * @see NEXTJS-16-MIGRATION-FIX.md
 */

import proxyFunction from './proxy';

// Re-export the proxy function as default for Netlify compatibility
export default proxyFunction;

// Re-export the config
export { config } from './proxy';

