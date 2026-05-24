import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const onLogin = nextUrl.pathname.startsWith("/login");
      const onAdmin = nextUrl.pathname.startsWith("/admin");
      const onOfficer = nextUrl.pathname.startsWith("/officer");
      const onDashboard = nextUrl.pathname.startsWith("/dashboard");

      if (onLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      if (!isLoggedIn) {
        if (onAdmin || onOfficer || onDashboard) {
          const signinUrl = new URL("/login", nextUrl);
          signinUrl.searchParams.set("callbackUrl", nextUrl.pathname);
          return Response.redirect(signinUrl);
        }
        return true;
      }

      if (onAdmin && role !== "admin") {
        return Response.redirect(new URL("/officer", nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.teamId = user.teamId;
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.uid as string) ?? session.user.id;
        session.user.role = token.role as "admin" | "officer";
        session.user.teamId = (token.teamId as string | null) ?? null;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
