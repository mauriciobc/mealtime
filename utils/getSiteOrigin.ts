export function getSiteOrigin() {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  }
  // For server-side, only use env var
  return process.env.NEXT_PUBLIC_APP_URL || '';
} 