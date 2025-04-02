import NextAuth, { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
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

      if (session?.user) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email! },
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

      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      if (trigger === "update") {
        // Get fresh user data when session is updated
        const freshUser = await prisma.user.findUnique({
          where: { email: token.email! },
          select: { id: true, role: true, householdId: true }
        });
        if (freshUser) {
          token.id = freshUser.id;
          token.role = freshUser.role;
        }
      }

      console.log("[NextAuth] Processed token:", token);
      return token;
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