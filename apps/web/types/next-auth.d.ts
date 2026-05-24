import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "admin" | "officer";
    teamId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: "admin" | "officer";
      teamId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "officer";
    teamId?: string | null;
    uid?: string;
  }
}
