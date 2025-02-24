'use server';

import { auth, signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { FileInfo } from './definitions';
import { z } from 'zod';

export async function authenticate(prevState: string | undefined, formData: FormData) {
  try {
    await signIn('credentials', formData);
    redirect('/');
  } catch (error) {
    if (error instanceof AuthError) {
      console.log('error', error.type);
      switch (error.type) {
        case 'CredentialsSignin':
        case 'CallbackRouteError':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

export type RegisterState = {
  errors?: {
    username?: string[];
    password?: string[];
    confirmPassword?: string[];
    email?: string[];
    invitationKey?: string[];
  };
  formData?: {
    username?: string;
    password?: string;
    confirmPassword?: string;
    email?: string;
    invitationKey?: string;
  };
  message?: string | null;
};

export async function register(prevState: RegisterState | undefined, formData: FormData) {
  const formDataObj = Object.fromEntries(formData.entries());
  const validatedFields = z
    .object({
      username: z.string(),
      password: z.string().min(6, 'Password must contain at least 6 character(s)'),
      confirmPassword: z.string().min(6, 'Password must contain at least 6 character(s)'),
      email: z.string().email(),
      invitationKey: z.string(),
    })
    .refine(({ password, confirmPassword }) => password === confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })
    .safeParse(formDataObj);

  if (!validatedFields.success) {
    return {
      formData: formDataObj,
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Some error(s) appeared during your registration.',
    };
  }

  const { username, password, email, invitationKey } = validatedFields.data;
  try {
    const response = await axios.post(`${process.env.API_URL}/api/register`, {
      username,
      password,
      email,
      invitationKey,
    });
    if (response.status !== 200) {
      return {
        message: response.data,
        formData: formDataObj,
      };
    }
    redirect('/login');
  } catch (e) {
    const error = e as AxiosError;
    const errorResponse = error.response?.data as RegisterState;
    return {
      errors: errorResponse?.errors,
      message: 'Some error(s) appeared during your registration.',
      formData: formDataObj,
    };
  }
}

export type ForgotPasswordState = {
  status?: string;
  message?: string | null;
};

export async function forgotPassword(
  prevState: ForgotPasswordState | undefined,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = formData.get('email');
  try {
    const response = await axios.post(`${process.env.API_URL}/api/forgot-password`, { email });
    const message = response.data.message;
    if (response.status === 200) {
      return {
        status: 'success',
        message,
      };
    }
    return {
      status: 'error',
      message,
    };
  } catch (e) {
    const error = e as AxiosError;
    const errorResponse = error.response?.data as { message: string };
    return {
      status: 'error',
      message:
        errorResponse?.message || error.message || 'An error occurred. Please try again later.',
    };
  }
}

export type ResetPasswordState = {
  errors?: {
    password?: string[];
    confirmPassword?: string[];
    token?: string[];
  };
  formData?: {
    token?: string;
    password?: string;
    confirmPassword?: string;
  };
  status?: string;
  message?: string | null;
};

export async function resetPassword(
  prevState: ResetPasswordState | undefined,
  formData: FormData
): Promise<ResetPasswordState> {
  const formDataObj = Object.fromEntries(formData.entries());
  const validatedFields = z
    .object({
      token: z.string(),
      password: z.string().min(6, 'Password must contain at least 6 character(s)'),
      confirmPassword: z.string().min(6, 'Password must contain at least 6 character(s)'),
    })
    .refine(({ password, confirmPassword }) => password === confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })
    .safeParse(formDataObj);

  if (!validatedFields.success) {
    return {
      status: 'error',
      formData: formDataObj,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { token, password } = validatedFields.data;

  try {
    const response = await axios.post(`${process.env.API_URL}/api/reset-password`, {
      token,
      password,
    });

    const message = response.data.message;
    if (response.status === 200) {
      setTimeout(() => {
        redirect('/login');
      }, 2000);
      return {
        status: 'success',
        message,
      };
    }
    return {
      status: 'error',
      message,
    };
  } catch (e) {
    const error = e as AxiosError;
    const errorResponse = error.response?.data as { message: string };
    return {
      status: 'error',
      message:
        errorResponse?.message || error.message || 'An error occurred. Please try again later.',
    };
  }
}

export async function handleLogout() {
  const session = await auth();
  await fetch(`${process.env.API_URL}/api/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.accessToken}` },
  });
  await signOut();
  redirect('/login');
}

export async function getUserFiles(limit?: number): Promise<FileInfo[]> {
  const session = await auth();
  const url = limit
    ? `${process.env.API_URL}/api/files?limit=${limit}`
    : `${process.env.API_URL}/api/files`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${session?.accessToken}` },
  });

  return response.data;
}

export async function getUserStorageInfo() {
  const session = await auth();
  const response = await axios.get(`${process.env.API_URL}/api/storage-info`, {
    headers: { Authorization: `Bearer ${session?.accessToken}` },
  });

  return response.data;
}

export async function deleteUserFile(id: number) {
  const session = await auth();
  await axios.delete(`${process.env.API_URL}/api/files/${id}`, {
    headers: { Authorization: `Bearer ${session?.accessToken}` },
  });
}

export async function toggleUserFileExpiration(id: number) {
  const session = await auth();
  await fetch(`${process.env.API_URL}/api/files/${id}/toggle-expiration`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.accessToken}` },
  });
}

export async function uploadUserFileChunk(formData: FormData) {
  const session = await auth();
  const response = await fetch(`${process.env.API_URL}/api/upload`, {
    method: 'POST',
    body: formData,
    headers: { Authorization: `Bearer ${session?.accessToken}` },
  });
  const data = await response.json();

  return {
    ok: response.ok,
    data,
  };
}
