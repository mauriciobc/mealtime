import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

// Estender os tipos do NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      name: string;
      email: string;
      role: string;
      householdId?: number;
      timezone?: string;
      language?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: number;
    name: string;
    email: string;
    role: string;
    householdId?: number;
    timezone?: string;
    language?: string;
  }
}

// Estender os tipos do JWT
declare module "next-auth/jwt" {
  interface JWT {
    id: number;
    name: string;
    email: string;
    role: string;
    householdId?: number;
    timezone?: string;
    language?: string;
  }
} 