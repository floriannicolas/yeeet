import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import axios, { AxiosError } from 'axios';
import type { CheckAuthResponse, User } from '@/lib/definitions';

async function getUser(username: string, password: string): Promise<User | undefined> {
  try {
    const response = await axios.post(`${process.env.API_URL}/api/login`, {
      username,
      password,
    });

    return response.data as User;
  } catch (e) {
    const error = e as AxiosError;
    throw new Error((error.response?.data as string) || 'Invalid credentials');
  }
}

async function checkAuth(accessToken: string): Promise<CheckAuthResponse | undefined> {
  try {
    const response = await axios.get(`${process.env.API_URL}/api/check-auth`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.data as CheckAuthResponse;
  } catch (e) {
    const error = e as AxiosError;
    throw new Error((error.response?.data as string) || 'Invalid check auth');
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ username: z.string(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { username, password } = parsedCredentials.data;
          const user = await getUser(username, password);
          if (!user) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.username,
            accessToken: user.token,
          };
        }

        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      const response = await checkAuth(token.accessToken as string);
      if (response && response.isAuthenticated) {
        return {
          ...session,
          accessToken: token.accessToken,
          userId: response.userId,
          lastAppVersion: response.lastAppVersion,
        };
      }

      await signOut();

      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.id = user.id;
      }

      return token;
    },
  },
});
