'use server';

import { auth, signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { FileInfo } from './definitions';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
        redirect('/');
    } catch (error) {
        if (error instanceof AuthError) {
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

export async function register(
    prevState: string | undefined,
    formData: FormData,
) {
    const username = formData.get('username');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    const email = formData.get('email');
    const invitationKey = formData.get('invitationKey');
    if (password !== confirmPassword) {
        return 'Passwords do not match';
    }
    try {
        await axios.post(
            `${process.env.API_URL}/api/register`,
            { username, password, email, invitationKey }
        );
        redirect('/login');
    } catch (e) {
        const error = e as AxiosError;
        return error.message || 'An error occurred';
    }
}

export async function forgotPassword(
    prevState: { success?: string | null, error?: string | null} | undefined,
    formData: FormData,
) : Promise<{ success?: string | null, error?: string | null}> {
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
    prevState: { success?: string | null, error?: string | null} | undefined,
    formData: FormData,
) : Promise<{ success?: string | null, error?: string | null}> {
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
    return await fetch(`${process.env.API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${session?.accessToken}` }
    });
}