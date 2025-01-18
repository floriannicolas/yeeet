'use server';

import { auth, signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { FileInfo } from './definitions';
import { z } from 'zod';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
        redirect('/');
    } catch (error) {
        if (error instanceof AuthError) {
            console.log('error', error);
            switch (error.type) {
                case 'CredentialsSignin':
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
    },
    formData?: {
        username?: string;
        password?: string;
        confirmPassword?: string;
        email?: string;
        invitationKey?: string;
    },
    message?: string | null;
};

export async function register(
    prevState: RegisterState | undefined,
    formData: FormData,
) {
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
            message: "Passwords do not match",
            path: ["confirmPassword", "confirmPassword"],
        })
        .safeParse(formDataObj);

    if (!validatedFields.success) {
        return {
            formData: formDataObj,
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Some error(s) appeared during your registration.',
        };
    }

    const { 
        username,
        password,
        email,
        invitationKey,
    } = validatedFields.data;
    try {
        const response = await axios.post(
            `${process.env.API_URL}/api/register`,
            { username, password, email, invitationKey }
        );
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

export async function forgotPassword(
    prevState: { success?: string | null, error?: string | null } | undefined,
    formData: FormData,
): Promise<{ success?: string | null, error?: string | null }> {
    const email = formData.get('email');
    try {
        const response = await axios.post(`${process.env.API_URL}/api/forgot-password`, { email });
        const message = response.data.message;
        if (response.status === 200) {
            return {
                success: message,
            };
        }
        return {
            error: message,
        };
    } catch (e) {
        const error = e as AxiosError;
        return {
            error: error.message || 'An error occurred. Please try again later.',
        };
    }
}

export async function resetPassword(
    prevState: { success?: string | null, error?: string | null } | undefined,
    formData: FormData,
): Promise<{ success?: string | null, error?: string | null }> {
    const token = formData.get('token');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (password !== confirmPassword) {
        return {
            error: 'Passwords do not match',
        };
    }

    try {
        const response = await axios.post(`${process.env.API_URL}/api/reset-password`, {
            token,
            password
        });

        const message = response.data.message;
        if (response.status === 200) {
            setTimeout(() => {
                redirect('/login');
            }, 2000);
            return {
                success: message,
            };
        }
        return {
            error: message,
        };
    } catch (e) {
        const error = e as AxiosError;
        return {
            error: error.message || 'An error occurred. Please try again later.',
        };
    }
}

export async function handleLogout() {
    const session = await auth();
    await fetch(`${process.env.API_URL}/api/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.accessToken}` }
    });
    await signOut();
    redirect('/login');
}

export async function getUserFiles(limit?: number): Promise<FileInfo[]> {
    const session = await auth();
    const url = limit
        ? `${process.env.API_URL}/api/files?limit=${limit}`
        : `${process.env.API_URL}/api/files`;
    const response = await axios.get(url, { headers: { Authorization: `Bearer ${session?.accessToken}` } });

    return response.data;
}

export async function getUserStorageInfo() {
    const session = await auth();
    const response = await axios.get(
        `${process.env.API_URL}/api/storage-info`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` }
    });

    return response.data;
}

export async function deleteUserFile(id: number) {
    const session = await auth();
    await axios.delete(`${process.env.API_URL}/api/files/${id}`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` }
    });
}

export async function toggleUserFileExpiration(id: number) {
    const session = await auth();
    await fetch(`${process.env.API_URL}/api/files/${id}/toggle-expiration`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.accessToken}` }
    });
}

export async function uploadUserFileChunk(formData: FormData) {
    const session = await auth();
    const response = await fetch(`${process.env.API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${session?.accessToken}` }
    });
    console.log('response', response);

    const error = (!response.ok) ? await response.json() : null;

    return {
        ok: response.ok,
        error,
    }
}