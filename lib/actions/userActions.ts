'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { profiles } from '@prisma/client';

type Profile = profiles;

// Helper to create Supabase client in Server Actions with async cookie store
function createSupabaseServerClient() {
  const cookieStore = cookies();

  // Define the async cookie store for Server Actions
  const asyncCookieStore = {
    async get(name: string) {
      // Always use await with cookies()
      return (await cookieStore).get(name)?.value;
    },
    async set(name: string, value: string, options: CookieOptions) {
      try {
        // Always use await with cookies()
        (await cookieStore).set({ name, value, ...options });
      } catch (error) {
        console.warn(`[Supabase Server Action Client] Error setting cookie ${name}:`, error);
        // Decide if you want to throw or handle differently
      }
    },
    async remove(name: string, options: CookieOptions) {
      try {
        // Always use await with cookies()
        (await cookieStore).set({ name, value: '', ...options });
      } catch (error) {
        console.warn(`[Supabase Server Action Client] Error removing cookie ${name}:`, error);
        // Decide if you want to throw or handle differently
      }
    },
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: asyncCookieStore, // Use the async store
    }
  );
}

/**
 * Server Action to get the current user's Prisma profile.
 * Relies on the session being available via cookies (handled by middleware).
 * @returns The user's profile object or null if not found/error.
 */
export async function getUserProfile(): Promise<{ data: Profile | null; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Server Action getUserProfile] Auth error or no user:', authError);
      return { data: null, error: 'Authentication required' };
    }

    console.log(`[Server Action getUserProfile] Processing request for user ID: ${user.id}`);

    // Add retry logic for database connection errors
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 1. Try to find the existing profile
        let profile = await prisma.profiles.findUnique({
          where: { id: user.id },
        });

        // 2. If profile doesn't exist, create it
        if (!profile) {
          console.log(`[Server Action getUserProfile] Profile not found for user ${user.id}. Creating new profile.`);
          try {
            profile = await prisma.profiles.create({
              data: {
                id: user.id,
                email: user.email || 'missing_email@example.com', // Ensure email is provided
                full_name: user.user_metadata?.full_name || '', // Use metadata if available
                // Add defaults for other fields if necessary, e.g., timezone
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
            });
            console.log('[Server Action getUserProfile] New profile created successfully:', profile);
          } catch (createError) {
            console.error('[Server Action getUserProfile] Prisma create FAILED:', {
              userId: user.id,
              error: createError,
              errorMessage: createError instanceof Error ? createError.message : 'Unknown Prisma create error',
            });
            
            // Check if it's a connection error and retry
            const errorMessage = createError instanceof Error ? createError.message : 'Unknown error';
            const isConnectionError = errorMessage.includes('Can\'t reach database server') || 
                errorMessage.includes('Connection') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('ECONNREFUSED');
            
            if (isConnectionError && attempt < maxRetries) {
              console.log(`[Server Action getUserProfile] Connection error detected. Retry attempt ${attempt + 1}/${maxRetries}`);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
              continue; // Retry the whole operation
            }
            
            return {
              data: null,
              error: `Database create operation failed: ${errorMessage}`
            };
          }
        } else {
          console.log('[Server Action getUserProfile] Existing profile found:', profile);
        }

        // 3. Return the found or newly created profile
        // Ensure the returned profile matches the expected 'Profile' type from lib/types.ts
        // Type assertion might be needed if Prisma's return type isn't perfectly aligned,
        // but usually, direct return works if the model and type match.
        return { data: profile as Profile, error: null };

      } catch (error) {
        // Check if it's a connection error and retry
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isConnectionError = errorMessage.includes('Can\'t reach database server') || 
            errorMessage.includes('Connection') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('ECONNREFUSED');
        
        if (isConnectionError && attempt < maxRetries) {
          console.log(`[Server Action getUserProfile] Connection error on attempt ${attempt}. Retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue; // Retry
        }
        
        console.error('[Server Action getUserProfile] General error:', error);
        return {
          data: null,
          error: error instanceof Error ? error.message : 'Unknown error occurred fetching profile'
        };
      }
    }
    
    // All retries exhausted
    return { data: null, error: 'Failed to fetch profile after multiple retries' };

  } catch (error) {
    console.error('[Server Action getUserProfile] Outer catch error:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred fetching profile'
    };
  }
}

/**
 * Server Action to get the first household membership for a given user.
 * Relies on the session being available via cookies for auth check, 
 * but primarily uses the provided userId for the query.
 * @param userId The ID of the user to find household membership for.
 * @returns The first household membership record or null.
 */
export async function getFirstHouseholdMembership(userId: string): Promise<{ data: { household_id: string } | null; error: string | null }> {
  if (!userId) {
    return { data: null, error: 'User ID is required' };
  }
  
  try {
    // Optional: Re-verify auth if needed, though getUserProfile usually runs first
    // const supabase = createSupabaseServerClient();
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user || user.id !== userId) {
    //   return { data: null, error: 'Authorization failed or user mismatch' };
    // }

    console.log(`[Server Action getFirstHouseholdMembership] Finding first household for user ID: ${userId}`);
    const membership = await prisma.household_members.findFirst({
      where: {
        user_id: userId,
      },
      select: {
        household_id: true, // Only select the ID we need
      },
      orderBy: {
        created_at: 'asc', // Optional: Get the earliest joined household
      },
    });

    if (!membership) {
      console.log(`[Server Action getFirstHouseholdMembership] No household membership found for user ID: ${userId}`);
      return { data: null, error: null }; // No membership is not an error state
    }

    console.log(`[Server Action getFirstHouseholdMembership] Found household membership:`, membership);
    return { data: membership, error: null };

  } catch (error) {
    console.error('[Server Action getFirstHouseholdMembership] Error:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred fetching household membership'
    };
  }
} 