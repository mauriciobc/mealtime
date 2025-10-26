import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
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

    const token = authHeader.replace('Bearer ', '');
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
      
      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid notificationIds array' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .in('id', notificationIds)
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
      
      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid notificationIds array' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds)
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
    console.error('[Edge Function Error]', error);
    return new Response(
      JSON.stringify({ error: error.message ?? String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
