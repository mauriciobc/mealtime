import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server'; // For regular user auth check
import { createAdminClient } from '@/utils/supabase/admin'; // For admin actions like inviteUserByEmail

// Define input schema
const inviteSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

// Helper function to check admin/owner status
async function isUserAdmin(userId: string, householdId: string): Promise<boolean> {
  if (!userId || !householdId) {
    return false;
  }
  try {
    const membership = await prisma.household_members.findUnique({
      where: {
        user_id_household_id: {
          user_id: userId,
          household_id: householdId,
        },
      },
      select: { role: true },
    });
    return membership?.role === 'admin' || membership?.role === 'owner';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const headersList = await headers();
  const authUserId = headersList.get('X-User-ID');
  const householdId = params.id;

  if (!authUserId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user ID' }, { status: 401 });
  }

  // Verify requester is admin/owner of the target household
  const isAdmin = await isUserAdmin(authUserId, householdId);
  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: User does not have permission to invite members to this household' },
      { status: 403 },
    );
  }

  // Validate request body
  let validatedData;
  try {
    const body = await request.json();
    validatedData = inviteSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email: targetEmail } = validatedData;

  try {
    // Check if a user with this email already exists in Supabase Auth
    // Using the admin client is necessary to look up users by email without being that user
    const supabaseAdmin = createAdminClient(); // Use the service role client
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Failed to initialize admin client. Check server configuration.' }, { status: 500 });
    }

    const { data: existingAuthUser, error: getUserError } = await supabaseAdmin.auth.admin.listUsers({ email: targetEmail });

    if (getUserError && getUserError.message !== 'User not found') {
      console.error('Supabase listUsers error:', getUserError);
      return NextResponse.json({ error: 'Failed to check existing user' }, { status: 500 });
    }

    const targetUser = existingAuthUser?.users?.[0];

    // Check if this user (existing or potential) is already in the target household
    if (targetUser) {
        const existingMembership = await prisma.household_members.findFirst({
            where: {
                user_id: targetUser.id,
                household_id: householdId,
            },
        });

        if (existingMembership) {
            return NextResponse.json({ message: 'User is already a member of this household' }, { status: 200 }); // Or 409 Conflict? 200 is friendlier.
        }

        // If user exists in Supabase Auth but not in the household, add them directly
        await prisma.household_members.create({
            data: {
                user_id: targetUser.id,
                household_id: householdId,
                role: 'member', // Default role for added members
            },
        });
        // Optionally, send a simple notification email here instead of a full Supabase invite

         // Also update the profile's primary householdId if it's null
         // This might be better handled when the user accepts or logs in,
         // but we can attempt it here for direct adds.
         try {
            await prisma.profiles.update({
                where: { id: targetUser.id, household_id: null },
                data: { household_id: householdId },
            });
         } catch (profileUpdateError) {
            // Log error but proceed, as profile update isn't critical for membership
            console.warn(`Could not update primary household for existing user ${targetUser.id}:`, profileUpdateError);
         }

        return NextResponse.json({ message: 'Existing user added to household successfully' }, { status: 200 });

    } else {
        // User does not exist in Supabase Auth, send an invite
        const inviteRedirectUrl = `${request.nextUrl.origin}/api/auth/callback?redirect=/join?householdId=${householdId}`; // Redirect after signup/login

        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            targetEmail,
            { redirectTo: inviteRedirectUrl } // Ensure this URL handles the invite flow
        );

        if (inviteError) {
            console.error('Supabase invite error:', inviteError);
            // Handle specific errors like email rate limits if necessary
            if (inviteError.message.includes('rate limit')) {
                 return NextResponse.json({ error: 'Invite rate limit exceeded. Please try again later.' }, { status: 429 });
            }
            return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
        }

        // Note: inviteData contains the invited user object, but we don't add to household_members until they accept.
        return NextResponse.json({ message: 'Invitation sent successfully' }, { status: 200 });
    }

  } catch (error) {
    console.error('Error processing household invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 