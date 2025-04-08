import { z } from "zod";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { withError } from "@/lib/utils/api-middleware";
import { User } from "@/lib/types";

const updateUserPreferencesBody = z.object({
  language: z.string().min(1, "Language is required"),
  timezone: z.string().min(1, "Timezone is required"),
});
export type UpdateUserPreferencesBody = z.infer<typeof updateUserPreferencesBody>;

export type UpdateUserPreferencesResponse = {
  user: User;
};

// Business logic function to update preferences
async function updateUserPreferences(
  userId: string,
  body: UpdateUserPreferencesBody
): Promise<User> {

  // Update the user's language and timezone directly
  const updatedUser = await prisma.user.update({
    where: {
      id: Number(userId),
    },
    data: {
      language: body.language,
      timezone: body.timezone,
    },
  });

  // Important: The object returned by Prisma might not perfectly match lib/types.User
  // (e.g., missing households, primaryHousehold, nested preferences object)
  // Cast carefully based on what the frontend actually needs from the response.
  // For now, we cast broadly, assuming the core fields are sufficient.
  return updatedUser as unknown as User; 
}

// PUT route handler - Restore withError
export const PUT = withError(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> } 
) => {
    // Use getServerSession with imported authOptions
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    // Compare session ID (string) with route param ID (string)
    if (session.user.id !== id) { 
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // This log might be less useful now, but keep for one more test
    console.log('[API PREFERENCES PUT] Request bodyUsed before json():', request.bodyUsed);
    
    const json = await request.json();
    const body = updateUserPreferencesBody.parse(json);

    const updatedUser = await updateUserPreferences(id, body);

    const result: UpdateUserPreferencesResponse = { user: updatedUser }; // `updatedUser` might not fully match User type here
    return NextResponse.json(result);

  }
  // Removed the direct try-catch as withError handles it
); 