"use client";

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { FileInfo, StorageInfo, UploadComplete, UploadProgress } from '@/lib/definitions';
import { useToast } from "@/hooks/use-toast";
import { Upload } from 'lucide-react';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getUserStorageInfo, getUserFiles, uploadUserFileChunk } from '@/lib/actions';
import { Session } from 'next-auth';
import DropZone from '@/components/dashboard/ui/drop-zone';
import Header from '@/components/dashboard/ui/header';
import Loader from '@/components/ui/loader';
import EmptyState from '@/components/dashboard/ui/empty-state';
import FilesList from '@/components/dashboard/ui/files-list';


const FILES_LIMIT = 50;

export default function Dashboard({
    session,
}: {
    session: Session
}) {
    const [progress, setProgress] = useState(0);
    const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
    const socketRef = useRef<Socket>(undefined);
    const { userId, lastAppVersion } = session;
    const [files, setFiles] = useState<FileInfo[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const filesToUploadQueue = useRef<File[]>([]);
    const { toast } = useToast();

    const fetchFiles = async (limit?: number) => {
        try {
            const newFiles = await getUserFiles(limit);
            setFiles(newFiles);
            fetchStorageInfo();
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching files:', error);
        }
    };

    const fetchStorageInfo = async () => {
        const newStorageInfo = await getUserStorageInfo();
        setStorageInfo(newStorageInfo);
    };

    useEffect(() => {
        socketRef.current = io(process.env.VITE_SOCKET_URL, {
            path: '/socket.io',
            withCredentials: true,
            transports: ['websocket', 'polling'],
        });

        socketRef.current.on(`progress.${userId}`, (data: UploadProgress) => {
            setProgress((data.uploadedChunks / data.totalChunks) * 100);
        });

        socketRef.current.on(`completed.${userId}`, (data: UploadComplete) => {
            fetchFiles(FILES_LIMIT);
            setProgress(0);
            toast({
                title: "File uploaded successfully",
                description: <>Your file <span className="font-semibold">{data.originalName}</span> is now available.</>
            });
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            manageUploadQueueList();
        });

        return () => {
            socketRef.current?.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchFiles(FILES_LIMIT);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUpload = async (file: File) => {
        if (progress > 0) {
            return;
        }

        const chunkSize = 1024 * 1024; // 1MB
        const totalChunks = Math.ceil(file.size / chunkSize);
        const uploadId = Date.now().toString();

        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            const formData = new FormData();
            const metadata = JSON.stringify({
                index: i.toString(),
                totalChunks: totalChunks.toString(),
                uploadId,
                originalSize: file.size,
                originalName: file.name,
            });
            formData.append('chunk', new Blob([chunk], { type: file.type }), metadata);

            const response = await uploadUserFileChunk(formData);
            if (!response.ok) {
                const error = await response.json();
                const title = error.code === 'STORAGE_LIMIT_EXCEEDED' ? 'Storage limit exceeded' : 'Error uploading file';
                toast({
                    title,
                    description: error.message,
                });
                break;
            }
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0 && fileInputRef.current) {
            const dataTransfer = new DataTransfer();
            droppedFiles.forEach(file => dataTransfer.items.add(file));
            fileInputRef.current.files = dataTransfer.files;

            filesToUploadQueue.current = droppedFiles;
            handleUpload(droppedFiles[0]);
        }
    };

    const manageUploadQueueList = () => {
        if (filesToUploadQueue.current.length > 0) {
            const [, ...otherFiles] = filesToUploadQueue.current;
            filesToUploadQueue.current = otherFiles;
            if (otherFiles.length > 0) {
                handleUpload(otherFiles[0]);
            }
        }
    }

    return (
        <div className="min-h-svh flex flex-col"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <Header
                storageInfo={storageInfo}
                progress={progress}
                lastAppVersion={lastAppVersion}
            />
            <div className="flex flex-col gap-4 p-6 h-full flex-1">
                <div className="flex items-center justify-between space-y-2 md:space-y-0 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
                        <p className="text-md font-light text-muted-foreground">Access & manage your screenshots & files!</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="grid w-full items-center gap-1.5">
                            <div className="flex w-full items-center justify-center relative">
                                <Label
                                    htmlFor="input-file"
                                    className="flex cursor-pointer flex-col items-center justify-center bg-transparent transition-all duration-300"
                                >
                                    <div
                                        className={`inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground shadow font-medium rounded-lg focus:outline-none ${progress > 0 ? 'opacity-50 cursor-default' : 'hover:bg-primary/90 cursor-pointer'}`}
                                    >
                                        <Upload className="w-4 h-4 me-2" />
                                        Upload
                                    </div>
                                    <Input
                                        id="input-file" className="hidden"
                                        ref={fileInputRef}
                                        disabled={progress > 0}
                                        type="file"
                                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                                </Label>
                            </div>
                        </div>
                    </div>
                </div>
                {isLoading && (<Loader />)}
                {!isLoading && files.length === 0 && (<EmptyState fileInputRef={fileInputRef} />)}
                {!isLoading && (<FilesList files={files} limit={FILES_LIMIT} fetchFiles={fetchFiles} />)}
            </div>
            <DropZone isVisible={isDragging} />
        </div>
    );
}