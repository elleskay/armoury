import type { DefaultSession } from "next-auth";

export type AppUserRole = "admin" | "officer" | "logs_ic" | "team_admin" | "hq";

declare module "next-auth" {
  interface User {
    role: AppUserRole;
    teamId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: AppUserRole;
      teamId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppUserRole;
    teamId?: string | null;
    uid?: string;
  }
}
