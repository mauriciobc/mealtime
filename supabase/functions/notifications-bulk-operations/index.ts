import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore - Edge Functions Deno environment
import { createClient } from "npm:@supabase/supabase-js@2";

// Declare Deno types for TypeScript
declare const Deno: any;

// Parse allowed origins from environment variable
function getAllowedOrigins(): string[] {
  // @ts-ignore - Deno environment
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (!envOrigins) {
    return [];
  }
  return envOrigins.split(',').map((origin: string) => origin.trim()).filter(Boolean);
}

// Validate if the request origin is allowed
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) {
    return false;
  }
  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.length === 0) {
    // Fallback: if no origins configured, deny all (fail secure)
    console.warn('No ALLOWED_ORIGINS configured, denying all requests');
    return false;
  }
  return allowedOrigins.includes(origin);
}

// Get CORS headers based on request origin validation
function getCorsHeaders(origin: string | null): Record<string, string> {
  if (!isOriginAllowed(origin)) {
    // Return headers without Access-Control-Allow-Origin for unauthorized origins
    return {};
  }
  
  // At this point we know origin is not null and is allowed
  const allowedOrigin = origin!;
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

// Generate unique error ID for tracking
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Validate if a string is a valid UUID format
function isValidUUID(id: any): id is string {
  if (typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id.trim());
}

// Validate, deduplicate, and sanitize notification IDs
function validateAndSanitizeIds(notificationIds: any[], maxSize: number): { isValid: boolean; sanitized: string[]; error?: string } {
  // Check if it's an array
  if (!Array.isArray(notificationIds)) {
    return { isValid: false, sanitized: [], error: 'notificationIds must be an array' };
  }

  // Check if array is empty
  if (notificationIds.length === 0) {
    return { isValid: false, sanitized: [], error: 'notificationIds array cannot be empty' };
  }

  // Check batch size limit
  if (notificationIds.length > maxSize) {
    return { isValid: false, sanitized: [], error: `notificationIds array exceeds maximum size of ${maxSize} items` };
  }

  // Validate and sanitize each ID
  const sanitized: string[] = [];
  const invalidIds: any[] = [];

  for (const id of notificationIds) {
    // Check if ID is valid UUID string
    if (!isValidUUID(id)) {
      invalidIds.push(id);
      continue;
    }
    
    // Trim and add to sanitized list
    const trimmedId = String(id).trim();
    if (!sanitized.includes(trimmedId)) {
      sanitized.push(trimmedId);
    }
  }

  // If any invalid IDs were found, return error
  if (invalidIds.length > 0) {
    return { 
      isValid: false, 
      sanitized: [], 
      error: `Invalid ID format. Found ${invalidIds.length} invalid ID(s). IDs must be valid UUID strings.` 
    };
  }

  return { isValid: true, sanitized };
}

// Validate required environment variables
function validateEnvironmentVariables(): { supabaseUrl: string; serviceRoleKey: string } {
  // @ts-ignore - Deno environment
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  // @ts-ignore - Deno environment
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || supabaseUrl.trim() === '') {
    throw new Error('Missing required environment variable: SUPABASE_URL');
  }
  
  if (!serviceRoleKey || serviceRoleKey.trim() === '') {
    throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return {
    supabaseUrl: supabaseUrl.trim(),
    serviceRoleKey: serviceRoleKey.trim()
  };
}

// @ts-ignore - Deno environment
Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    // Return 403 if origin not allowed
    if (Object.keys(corsHeaders).length === 0) {
      return new Response('Forbidden: Origin not allowed', { status: 403 });
    }
    return new Response('ok', { headers: corsHeaders });
  }

  // For non-OPTIONS requests, validate origin before processing
  if (Object.keys(corsHeaders).length === 0) {
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { supabaseUrl, serviceRoleKey } = validateEnvironmentVariables();
    
    // Create Supabase client with service role key for admin operations
    // Using service role bypasses RLS, but we validate user auth separately
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'x-client-info': 'edge-function-notifications-bulk'
        }
      }
    });

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token in a case-insensitive way
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch || !tokenMatch[1]) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization header format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = tokenMatch[1].trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing access token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { pathname } = new URL(req.url);
    
    // Route: POST /mark-all-read
    if (pathname.endsWith('/mark-all-read') && req.method === 'POST') {
      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .select('id');

      if (error) throw error;

      return new Response(
        JSON.stringify({ 
          success: true, 
          updated: data?.length || 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: POST /bulk-mark-read
    if (pathname.endsWith('/bulk-mark-read') && req.method === 'POST') {
      const { notificationIds } = await req.json();
      
      // Validate, deduplicate and sanitize the notification IDs
      const MAX_BATCH_SIZE = 100;
      const validation = validateAndSanitizeIds(notificationIds, MAX_BATCH_SIZE);
      
      if (!validation.isValid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .in('id', validation.sanitized)
        .eq('user_id', user.id)
        .select('id');

      if (error) throw error;

      return new Response(
        JSON.stringify({ 
          success: true, 
          updated: data?.length || 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: DELETE /bulk-delete
    if (pathname.endsWith('/bulk-delete') && req.method === 'DELETE') {
      const { notificationIds } = await req.json();
      
      // Validate, deduplicate and sanitize the notification IDs
      const MAX_BATCH_SIZE = 100;
      const validation = validateAndSanitizeIds(notificationIds, MAX_BATCH_SIZE);
      
      if (!validation.isValid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .in('id', validation.sanitized)
        .eq('user_id', user.id)
        .select('id');

      if (error) throw error;

      return new Response(
        JSON.stringify({ 
          success: true, 
          deleted: data?.length || 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route not found
    return new Response(
      JSON.stringify({ error: 'Route not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Generate unique error ID for tracking
    const errorId = generateErrorId();
    
    // Log full error details server-side for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[Edge Function Error]', {
      errorId,
      error: error,
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method
    });
    
    // Return sanitized error response to client
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        errorId: errorId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
