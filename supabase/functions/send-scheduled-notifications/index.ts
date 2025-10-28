import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore - Edge Functions Deno environment
import { createClient } from "npm:@supabase/supabase-js@2";

// Declare Deno types for TypeScript
declare const Deno: any;

// @ts-ignore - Deno environment
Deno.serve(async (req: Request) => {
  // Debug: log all environment variables
  // @ts-ignore - Deno environment
  const envVars = Object.fromEntries(Deno.env.toObject ? Object.entries(Deno.env.toObject()) : []);
  console.log('[Edge Debug] Environment Variables:', envVars);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 });
  }

  // @ts-ignore - Deno environment
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'https://zzvmyzyszsqptgyqwqwt.supabase.co';
  // @ts-ignore - Deno environment
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables. All envs:', envVars);
    return new Response(JSON.stringify({ error: 'Service role key not set', envVars }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-client-info': 'edge-function-scheduled-notifications'
      }
    }
  });

  try {
    // 1. Query for scheduled notifications to deliver
    const { data: notifications, error } = await supabase
      .from('scheduledNotification')
      .select('*')
      .eq('delivered', false)
      .lte('deliverAt', new Date().toISOString());

    if (error) throw new Error(String(error));
    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ success: true, notificationsSent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Deliver and insert notifications
    let deliveredCount = 0;
    for (const notification of notifications) {
      try {
        // Insert into notifications table
        const { error: insertError } = await supabase
          .from('notifications')
          .insert([{
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : undefined,
            user_id: notification.userId,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            metadata: notification.metadata ?? {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);
        if (insertError) {
          console.error(`[Edge] Failed to insert notification for user ${notification.userId}:`, insertError);
          continue; // Skip marking as delivered
        }

        // Mark as delivered
        const { error: updateError } = await supabase
          .from('scheduledNotification')
          .update({ delivered: true, deliveredAt: new Date().toISOString() })
          .eq('id', notification.id);
        if (updateError) {
          console.error(`[Edge] Failed to mark scheduledNotification as delivered:`, updateError);
          continue;
        }

        deliveredCount++;
        console.log(`[Edge] Delivered and recorded notification for user ${notification.userId}`);
      } catch (err) {
        console.error(`[Edge] Exception delivering notification for user ${notification.userId}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, notificationsSent: deliveredCount }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[Edge Function Error]', {
      error: error,
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method
    });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 