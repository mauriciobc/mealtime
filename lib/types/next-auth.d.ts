import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";
import { BaseUser } from "./common";

// Estender os tipos do NextAuth
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      role?: string | null;
      householdId?: number | null;
    } & BaseUser &
      DefaultSession["user"];
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User extends BaseUser, DefaultUser {}
}

// Estender os tipos do JWT
declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT extends BaseUser {
    id: string;
    role?: string | null;
    householdId?: number | null;
  }
} 