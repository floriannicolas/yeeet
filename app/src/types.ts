export interface User {
  id: number;
  username: string;
}

export interface UploadProgress {
  uploadId: string;
  uploadedChunks: number;
  totalChunks: number;
}

export interface UploadComplete {
  uploadId: string;
  originalName: string;
} 