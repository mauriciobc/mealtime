import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";
import { BaseUser } from "./common";

// Estender os tipos do NextAuth
declare module "next-auth" {
  interface Session {
    user: BaseUser & DefaultSession["user"];
  }

  interface User extends BaseUser, DefaultUser {}
}

// Estender os tipos do JWT
declare module "next-auth/jwt" {
  interface JWT extends BaseUser {}
} 