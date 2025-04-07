import NextAuth, { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { UserRepository } from "@/lib/repositories/user-repository"

console.log("[NextAuth] Initializing configuration");

export const authOptions: NextAuthOptions = {
  debug: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "jsmith@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        console.log('[NextAuth] Authorize attempt with credentials:', credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.log('[NextAuth] Missing credentials');
          return null;
        }

        try {
          const user = await UserRepository.verifyCredentials(
            credentials.email,
            credentials.password
          );

          if (user) {
            console.log('[NextAuth] Credentials valid for:', user.email);
            return { 
              id: user.id.toString(),
              name: user.name, 
              email: user.email, 
              role: user.role,
              householdId: user.householdId,
            };
          } else {
            console.log('[NextAuth] Invalid credentials for:', credentials.email);
            return null;
          }
        } catch (error) {
          console.error('[NextAuth] Error during authorization:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("[NextAuth] Sign in callback:", {
        hasUser: !!user,
        hasAccount: !!account,
        hasProfile: !!profile,
        email: user?.email
      });

      if (!user?.email) {
        console.log("[NextAuth] No email provided by Google");
        return false;
      }

      try {
        // Check if user exists
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, role: true, householdId: true }
        });

        // If user doesn't exist, create them
        if (!dbUser) {
          console.log("[NextAuth] Creating new user:", user.email);
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || "",
              role: "member",
            },
            select: { id: true, role: true, householdId: true }
          });
        }

        console.log("[NextAuth] User data:", dbUser);
        return true;
      } catch (error) {
        console.error("[NextAuth] Error in signIn callback:", error);
        return false;
      }
    },
    async session({ session, token }) {
      console.log("[NextAuth] Session callback:", { 
        hasSession: !!session, 
        hasToken: !!token,
        sessionEmail: session?.user?.email,
        tokenEmail: token?.email
      });

      // Use token to enrich the session
      if (token && session.user) { 
        session.user.id = token.id as string; // Assuming id is added in jwt callback
        session.user.role = token.role as string; // Assuming role is added in jwt callback
        // Add other properties from token if needed, e.g., householdId if added to token
        // session.user.householdId = token.householdId as number | null; 
      } else {
        console.warn('[NextAuth] Session or Token missing in session callback');
      }

      // Remove the potentially problematic DB call based on session.user.email
      /* 
      if (session?.user) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email! }, // This was the problematic line
            select: { id: true, role: true, householdId: true }
          });

          if (dbUser) {
            session.user.id = dbUser.id.toString();
            session.user.role = dbUser.role;
            session.user.householdId = dbUser.householdId;
          }
        } catch (error) {
          console.error("[NextAuth] Error fetching user data in session callback:", error);
        }
      }
      */

      console.log("[NextAuth] Processed session:", session);
      return session;
    },
    async jwt({ token, user, account, trigger }) {
      console.log("[NextAuth] JWT callback:", { 
        hasToken: !!token, 
        hasUser: !!user, 
        hasAccount: !!account,
        trigger,
        email: token?.email
      });

      // On initial sign-in, populate token with user details
      if (account && user) { 
        token.id = user.id;
        token.role = user.role; 
        token.email = user.email; // Ensure email is persisted
        // Add other essential fields if available on user object
        // token.householdId = user.householdId; 
      }

      // For subsequent requests, ensure essential details are present
      // If id or role is missing, try to fetch from DB using email
      if (token?.email && (token.id === undefined || token.role === undefined)) {
        console.log('[NextAuth] Token missing id/role, fetching from DB:', token.email);
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true, householdId: true } // Select necessary fields
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            // token.householdId = dbUser.householdId; // Optionally add householdId
            console.log('[NextAuth] Token refreshed from DB');
          } else {
             console.warn('[NextAuth] User not found in DB during token refresh:', token.email);
             // Handle case where user might have been deleted? Return null or error token?
          }
        } catch (error) {
          console.error('[NextAuth] Error fetching user in JWT callback:', error);
          // Decide how to handle DB error - return original token or error token?
        }
      } 
      
      // Handle explicit session updates if needed (e.g., role change)
      if (trigger === "update") {
        console.log('[NextAuth] JWT update triggered, fetching fresh user data');
        const freshUser = await prisma.user.findUnique({
          where: { email: token.email! },
          select: { id: true, role: true, householdId: true }
        });
        if (freshUser) {
          token.id = freshUser.id;
          token.role = freshUser.role;
          // token.householdId = freshUser.householdId; // Update householdId if needed
          console.log('[NextAuth] Token updated via trigger');
        }
      }

      console.log("[NextAuth] Processed token:", token);
      return token; // Return the potentially enriched token
    }
  },
  pages: {
    signIn: "/login",
    error: "/login", // Error code passed in query string as ?error=
  },
  events: {
    async signIn(message) {
      console.log("[NextAuth] Sign in event:", message);
    },
    async signOut(message) {
      console.log("[NextAuth] Sign out event:", message);
    },
    async session(message) {
      console.log("[NextAuth] Session event:", message);
    },
    async error(message) {
      console.error("[NextAuth] Error event:", message);
    }
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST } 