'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import axios from 'axios';
import { FileInfo } from './definitions';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
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

export async function handleLogout(accessToken: string) {
    await fetch(`${process.env.API_URL}/api/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    await signOut();
    redirect('/login');
}

export async function getUserFiles(accessToken: string, limit?: number): Promise<FileInfo[]> {
    const url = limit 
        ? `${process.env.API_URL}/api/files?limit=${limit}`
        : `${process.env.API_URL}/api/files`;
    const response = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    return response.data;
}

export async function getUserStorageInfo(accessToken: string) {
    const response = await axios.get(
        `${process.env.API_URL}/api/storage-info`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    return response.data;
}

export async function deleteUserFile(accessToken: string, id: number) {
    await axios.delete(`${process.env.API_URL}/api/files/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
}

export async function toggleUserFileExpiration(accessToken: string, id: number) {
    await fetch(`${process.env.API_URL}/api/files/${id}/toggle-expiration`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
    });
}

export async function uploadUserFileChunk(accessToken: string, formData: FormData) {
    return await fetch(`${process.env.API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${accessToken}` }
    });
}