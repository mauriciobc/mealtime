import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  // Create a cookie store for the browser client
  const cookieStore = {
    get(name: string) {
      if (typeof document === 'undefined') return undefined;
      
      // Get all cookies
      const cookies = document.cookie.split(';');
      const cookie = cookies.find(c => c.trim().startsWith(`${name}=`));
      
      if (!cookie) return undefined;
      
      const cookieValue = cookie.split('=')[1];
      return cookieValue ? decodeURIComponent(cookieValue) : undefined;
    },
    set(name: string, value: string, options: any) {
      if (typeof document === 'undefined') return;
      
      // Build cookie string with options
      let cookieString = `${name}=${encodeURIComponent(value)}`;
      
      if (options.path) cookieString += `; path=${options.path}`;
      if (options.domain) cookieString += `; domain=${options.domain}`;
      if (options.maxAge) cookieString += `; max-age=${options.maxAge}`;
      if (options.expires) cookieString += `; expires=${options.expires}`;
      if (options.secure) cookieString += '; secure';
      if (options.sameSite) cookieString += `; samesite=${options.sameSite}`;
      if (options.httpOnly) cookieString += '; httponly';
      
      document.cookie = cookieString;
    },
    remove(name: string, options: any) {
      if (typeof document === 'undefined') return;
      
      // Build delete cookie string
      let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
      
      if (options.path) cookieString += `; path=${options.path}`;
      if (options.domain) cookieString += `; domain=${options.domain}`;
      
      document.cookie = cookieString;
    },
    getAll() {
      if (typeof document === 'undefined') return [];
      
      const cookies = document.cookie.split(';');
      return cookies.map(c => {
        const [name, value] = c.trim().split('=');
        return { name, value: value ? decodeURIComponent(value) : '' };
      });
    },
    setAll(cookiesToSet: Array<{ name: string; value: string; options: any }>) {
      if (typeof document === 'undefined') return;
      
      cookiesToSet.forEach(({ name, value, options }) => {
        this.set(name, value, options);
      });
    }
  };

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: cookieStore
    }
  );
} 