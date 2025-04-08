import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/auth"; // Assuming auth setup exists
import prisma from "@/utils/prisma"; // Assuming prisma setup exists
import { withError } from "@/lib/utils/api-middleware"; // Corrected import path
import { User } from "@/lib/types"; // Assuming User type definition

// Define the expected request body structure and validation
const updateUserPreferencesBody = z.object({
  language: z.string().min(1, "Language is required"), // Example validation
  timezone: z.string().min(1, "Timezone is required"), // Example validation
});
export type UpdateUserPreferencesBody = z.infer<typeof updateUserPreferencesBody>;

// Define the expected response structure
export type UpdateUserPreferencesResponse = {
  user: User;
};

// Business logic function to update preferences
async function updateUserPreferences(
  userId: string,
  body: UpdateUserPreferencesBody
): Promise<User> {
  // Find the existing user to get their current preferences
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) }, // Convert userId from param to number
    select: { preferences: true }, // Only select preferences initially
  });

  if (!user) {
    throw new Error("User not found"); // Or handle appropriately
  }

  // Update the user's preferences
  const updatedUser = await prisma.user.update({
    where: {
      id: Number(userId),
    },
    data: {
      preferences: {
        // Merge existing preferences with new ones
        ...(user.preferences as Record<string, any>), // Cast to allow merge
        language: body.language,
        timezone: body.timezone,
      },
    },
  });

  // Ensure the returned object matches the User type structure if necessary
  // Prisma might already return the full updated user object
  return updatedUser as User; 
}

// PUT route handler
export const PUT = withError(
  async (
    request: Request,
    { params }: { params: Promise<{ userId: string }> } // Get userId from route params
  ) => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { userId } = await params; // Extract userId

    // Security Check: Ensure the logged-in user matches the userId param
    if (String(session.user.id) !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if body has been used before attempting to read
    console.log('[API PREFERENCES PUT] Request bodyUsed before json():', request.bodyUsed);
    
    const json = await request.json();
    const body = updateUserPreferencesBody.parse(json); // Validate request body

    // Call the business logic function
    const updatedUser = await updateUserPreferences(userId, body);

    // Return the successful response with the updated user
    const result: UpdateUserPreferencesResponse = { user: updatedUser };
    return NextResponse.json(result);
  }
); 