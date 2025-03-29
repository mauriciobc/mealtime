import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserRepository } from "@/lib/repositories";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  callbacks: {
    async jwt({ token, user }) {
      // Quando o usuário faz login pela primeira vez
      if (user) {
        token.id = Number(user.id);
        token.role = user.role;
        token.householdId = user.householdId;
        token.timezone = user.timezone;
        token.language = user.language;
      }
      return token;
    },
    async session({ session, token }) {
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
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          householdId: user.householdId,
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