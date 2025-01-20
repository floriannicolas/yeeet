
export type User = {
    id: string;
    username: string;
    email: string;
    token: string;
};

export type FileInfo = {
    id: number;
    originalName: string;
    mimeType: string;
    size: number;
    createdAt: string;
    expiresAt?: string;
    downloadUrl: string;
    viewUrl: string;
}

export type CheckAuthResponse = {
    isAuthenticated: string; 
    userId: string;
    lastAppVersion: string;
};

export type StorageInfo = {
    used: number;
    limit: number;
    available: number;
    usedPercentage: number;
}