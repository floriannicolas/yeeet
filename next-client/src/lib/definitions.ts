
export type User = {
    id: string;
    username: string;
    email: string;
    token: string;
};

export interface FileInfo {
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


export interface UploadProgress {
    uploadId: string;
    uploadedChunks: number;
    totalChunks: number;
}

export interface UploadComplete {
    uploadId: string;
    originalName: string;
}

export interface StorageInfo {
    used: number;
    limit: number;
    available: number;
    usedPercentage: number;
}