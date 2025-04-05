import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface BaseUser {
    timezone?: string; // Added timezone property
  }

  interface Session {
    user: {
      id: string;
      name?: string;
      email?: string;
      image?: string;
      timezone?: string; // Added timezone property
    };
  }
}