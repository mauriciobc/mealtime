import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserRepository } from "@/lib/repositories";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  callbacks: {
    async jwt({ token, user, trigger, session: updateSessionData }) {
      // Initial sign-in: Add user data directly to token
      if (user) {
        token.id = user.id.toString();
        token.role = user.role;
        token.householdId = user.householdId ? Number(user.householdId) : null;
        token.timezone = user.timezone;
        token.language = user.language;
        // Keep name and email from initial login if available
        token.name = user.name;
        token.email = user.email;
      }

      // If the session was updated via the update() function (client-side)
      if (trigger === "update" && updateSessionData?.user) {
        // Merge the updated data into the token
        if (updateSessionData.user.name) token.name = updateSessionData.user.name;
        if (updateSessionData.user.email) token.email = updateSessionData.user.email;
        if (updateSessionData.user.role) token.role = updateSessionData.user.role;
        if (updateSessionData.user.householdId !== undefined) token.householdId = updateSessionData.user.householdId ? Number(updateSessionData.user.householdId) : null;
        if (updateSessionData.user.timezone) token.timezone = updateSessionData.user.timezone;
        if (updateSessionData.user.language) token.language = updateSessionData.user.language;
      }
      
      // On subsequent requests, refresh data from DB to keep token fresh
      // (Avoid redundant DB call if initial sign-in just happened)
      if (!user) { 
        if (token.id) {
          try {
            const dbUser = await UserRepository.getById(Number(token.id));
            if (dbUser) {
              token.role = dbUser.role;
              token.householdId = dbUser.householdId ? Number(dbUser.householdId) : null;
              token.timezone = dbUser.timezone;
              token.language = dbUser.language;
              // Optionally update name/email if they can change, but often they don't
              // token.name = dbUser.name;
              // token.email = dbUser.email;
            } else {
              // User not found in DB, invalidate token by returning null/empty?
              // Or just keep existing token data? Let's keep it for now.
              // Consider adding logic here if users can be deleted.
            }
          } catch (error) {
            console.error("Error refreshing user data in JWT callback:", error);
            // Keep existing token if DB fetch fails
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Copy ALL relevant fields from the (now up-to-date) token to the session
      if (token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.role = token.role;
        session.user.householdId = token.householdId;
        session.user.timezone = token.timezone;
        session.user.language = token.language;
      }
      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, req): Promise<any | null> {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        // Verificar credenciais do usuário
        const user = await UserRepository.verifyCredentials(
          credentials.email,
          credentials.password
        );

        if (!user) {
          return null;
        }

        // Retornar dados do usuário para o NextAuth
        return {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          householdId: user.householdId ? Number(user.householdId) : null,
          timezone: user.timezone,
          language: user.language,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
    signOut: "/",
  },
  debug: false,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 