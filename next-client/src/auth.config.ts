import type { NextAuthConfig } from 'next-auth';
import { NextResponse } from 'next/server';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnHomepage = nextUrl.pathname === '/';
      if (isOnHomepage) {
        return true;
      } else if (isLoggedIn) {
        return NextResponse.redirect(new URL('/', nextUrl));
      }
      return true;
    },
    session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken,
      };
    }
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;