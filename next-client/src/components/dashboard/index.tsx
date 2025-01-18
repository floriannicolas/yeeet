"use client";

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { FileInfo, StorageInfo, UploadComplete, UploadProgress } from '@/lib/definitions';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import {
    FlameKindling,
    Upload,
    LogOut,
    EllipsisVertical,
    AppWindowMac,
    File as FileIcon,
    FileVideo,
    FileText,
    Eye,
    Download,
    Trash,
    ClipboardCopy,
    ToggleLeft,
    ToggleRight,
    X,
    LoaderCircle,
} from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatFileSize } from '@/utils/format';
import { getAppVersionAlertClosed, setAppVersionAlertClosed } from '@/utils/app-version-alert';
import { handleLogout, getUserStorageInfo, getUserFiles, deleteUserFile, uploadUserFileChunk, toggleUserFileExpiration } from '@/lib/actions';
import { Session } from 'next-auth';


const FILES_LIMIT = 50;
const MACOS_APP_VERSION = process.env.NEXT_PUBLIC_MACOS_APP_VERSION;

export default function Dashboard({
    session,
}: {
    session: Session
})  {
    const [progress, setProgress] = useState(0);
    const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
    const socketRef = useRef<Socket>(undefined);
    const { userId, lastAppVersion, accessToken } = session;
    const [files, setFiles] = useState<FileInfo[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const filesToUploadQueue = useRef<File[]>([]);
    const { toast } = useToast();
    const [showAppUpdate, setShowAppUpdate] = useState(
        !getAppVersionAlertClosed() &&
        MACOS_APP_VERSION &&
        (!lastAppVersion || (lastAppVersion < MACOS_APP_VERSION))
    );

    console.log('datas', userId, lastAppVersion, accessToken);

    const fetchFiles = async (limit?: number) => {
        try {
            console.log('fetchFile');
            const newFiles = await getUserFiles(accessToken as string, limit);
            console.log('fetchFile.response', newFiles);
            setFiles(newFiles);
            fetchStorageInfo();
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching files:', error);
        }
    };

    const fetchStorageInfo = async () => {
        const newStorageInfo = await getUserStorageInfo(accessToken as string);
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
        console.log('here.firstFetchFile');
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

            const response = await uploadUserFileChunk(accessToken as string, formData);
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

    const handleDownloadApp = () => {
        window.open(`/releases/download/Yeeet_${MACOS_APP_VERSION}_x64.dmg`, '_blank');
    };

    const handleOpenLink = (url: string) => {
        window.open(url, '_blank');
    };

    const handleCopyLink = (url: string) => {
        navigator.clipboard.writeText(url);
    };

    const handleDelete = async (id: number) => {
        try {
            deleteUserFile(accessToken as string, id);
            toast({
                title: "File deleted successfully",
                description: <>Your file is now deleted.</>
            });
            fetchFiles(FILES_LIMIT);
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    };

    const handleToggleExpiration = async (id: number) => {
        try {
            toggleUserFileExpiration(accessToken as string, id);
            fetchFiles(FILES_LIMIT);
        } catch (error) {
            console.error('Error toggling file expiration:', error);
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
            console.log('decrementFilesToUpload.new', otherFiles);
            filesToUploadQueue.current = otherFiles;
            if (otherFiles.length > 0) {
                handleUpload(otherFiles[0]);
            }
        } else {
            console.log('decrementFilesToUpload.emptyList', filesToUploadQueue.current);
        }
    }

    const getFileExpiresAtLabel = (file: FileInfo) => {
        if (file.expiresAt) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const expireDate = new Date(file.expiresAt);

            if (expireDate.getTime() === today.getTime()) {
                return "Expires today";
            }

            const diffTime = expireDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                return "Expired";
            } else if (diffDays === 0) {
                return "Expires soon";
            } else if (diffDays === 1) {
                return "Expires tomorrow";
            } else {
                return `Expires in ${diffDays} days`;
            }
        }
        return 'Non-expiring';
    }

    const isImageType = (mimeType: string) => {
        if (!mimeType) {
            return false;
        }
        return mimeType.startsWith('image/');
    };

    const getFileIcon = (mimeType: string) => {
        if (!mimeType) {
            return <FileIcon className="w-16 h-16 text-muted-foreground" />;
        }
        if (mimeType.startsWith('video/')) {
            return <FileVideo className="w-16 h-16 text-muted-foreground" />
        }
        switch (mimeType) {
            case 'application/pdf':
                return <FileText className="w-16 h-16 text-muted-foreground" />
            default:
                return <FileIcon className="w-16 h-16 text-muted-foreground" />
        }
    };

    const getFileBackground = (mimeType: string): string => {
        if (!mimeType) {
            return 'bg-gray-950';
        }
        if (mimeType.startsWith('video/')) {
            return 'bg-emerald-950';
        }
        switch (mimeType) {
            case 'application/pdf':
                return 'bg-blue-950';
            case 'application/zip':
            case 'application/x-zip-compressed':
                return 'bg-yellow-100 dark:bg-yellow-950';
            case 'text/plain':
                return 'bg-gray-100 dark:bg-gray-950';
            case 'application/json':
                return 'bg-purple-100 dark:bg-purple-950';
            default:
                return 'bg-gray-950';
        }
    };

    return (
        <div className="min-h-svh flex flex-col"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {showAppUpdate && (
                <Alert className="rounded-none">
                    <div
                        className="absolute top-0 right-0 p-2 cursor-pointer"
                        onClick={() => {
                            setShowAppUpdate(false);
                            setAppVersionAlertClosed(true);
                        }}
                    >
                        <X className="w-4 h-4" />
                    </div>
                    <AppWindowMac className="h-4 w-4" />
                    <AlertTitle>Application update</AlertTitle>
                    <AlertDescription className="text-sm text-muted-foreground">
                        A new desktop app is available for macOS! you can download it <span onClick={handleDownloadApp} className="font-semibold text-white cursor-pointer hover:underline">here</span>.
                    </AlertDescription>
                </Alert>
            )}
            <header className="flex sticky top-0 bg-background z-10 h-16 shrink-0 items-center gap-2 border-b px-6">
                <div className="flex justify-center gap-2 md:justify-start w-full">
                    <Link href="/" className="flex items-center gap-2 font-medium">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                            <FlameKindling className="size-4" />
                        </div>
                        Yeeet
                    </Link>
                    <div className="flex items-center gap-2 font-medium ml-auto">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="rounded-full p-2.5">
                                    <EllipsisVertical />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-52 -ml-36">
                                <DropdownMenuLabel>Account</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {
                                    /*
                                  <DropdownMenuGroup>
                                    <DropdownMenuItem>
                                      <User />
                                      <span>Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Settings />
                                      <span>Settings</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>
                                  <DropdownMenuSeparator />
                                    */
                                }
                                {storageInfo && (
                                    <>
                                        <DropdownMenuGroup>
                                            <div className="px-2 py-1.5 text-sm flex gap-2 items-center">
                                                <div className="font-semibold">
                                                    Usage
                                                </div>
                                                <div className="ml-auto text-xs tracking-widest opacity-60">
                                                    {formatFileSize(storageInfo.used)} / {formatFileSize(storageInfo.limit)}
                                                </div>
                                            </div>
                                            <div className="px-2 py-1.5">
                                                <Progress value={storageInfo.usedPercentage} className="h-2" />
                                            </div>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                                <DropdownMenuItem onClick={handleDownloadApp}>
                                    <AppWindowMac />
                                    <span>Download app</span>
                                    <DropdownMenuShortcut>v{MACOS_APP_VERSION}</DropdownMenuShortcut>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleLogout(accessToken as string)}>
                                    <LogOut />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                {(progress > 0) && (
                    <div className="absolute left-0 right-0 top-full border-b border-t bg-background overflow-hidden">
                        <div className="left-0 right-0 top-full h-2 bg-gray-200 text-right transition-all" style={{ width: `${progress}%` }} />
                    </div>
                )}
            </header>
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
                                    htmlFor="dropzone-file"
                                    className="flex cursor-pointer flex-col items-center justify-center bg-transparent transition-all duration-300"
                                >
                                    <div
                                        className={`inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground shadow font-medium rounded-lg focus:outline-none ${progress > 0 ? 'opacity-50 cursor-default' : 'hover:bg-primary/90 cursor-pointer'}`}
                                    >
                                        <Upload className="w-4 h-4 me-2" />
                                        Upload
                                    </div>
                                    <Input
                                        id="dropzone-file" className="hidden"
                                        ref={fileInputRef}
                                        disabled={progress > 0}
                                        type="file"
                                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                                </Label>
                            </div>
                        </div>
                    </div>
                </div>
                {isLoading && (
                    <div className="flex h-full flex-1 items-center gap-2 justify-center p-2 font-light text-muted-foreground">
                        <LoaderCircle className="animate-spin" /> Loading...
                    </div>
                )}
                {!isLoading && files.length === 0 && (
                    <div className="flex flex-col h-full flex-1 items-center justify-center p-2">
                        <FlameKindling className="w-16 h-16 text-muted-foreground mb-2 flame-kindling-animation" />
                        <p className="text-md font-light text-muted-foreground mb-2">No files yet…</p>
                        <p className="text-sm font-light text-muted-foreground">
                            <span onClick={() => fileInputRef.current?.click()} className="font-semibold text-white cursor-pointer hover:underline">Upload your first file</span> to get started.
                        </p>
                    </div>
                )}
                {
                    !isLoading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 grid-flow-row gap-4 md:gap-6">
                            {files.map(file => (
                                <div className="flex flex-col gap-2 relative" key={file.id}>
                                    <a
                                        href={file.viewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative border overflow-hidden w-full h-44 rounded-lg flex items-center justify-center group"
                                    >
                                        {isImageType(file.mimeType) ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                className={`w-full h-44 object-contain rounded-lg ${getFileBackground(file.mimeType)} group-hover:blur-sm group-hover:scale-125 transition-all duration-300`}
                                                src={file.viewUrl}
                                                alt=""
                                                width={328}
                                                height={176}
                                            />
                                        ) : (
                                            <div className={`w-full h-44 rounded-lg flex items-center justify-center ${getFileBackground(file.mimeType)} group-hover:blur-sm group-hover:scale-125 transition-all duration-300`}>
                                                {getFileIcon(file.mimeType)}
                                            </div>
                                        )}
                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-background p-4 opacity-0 group-hover:opacity-70 transition-all duration-300">
                                            <Eye className="w-6 h-6" />
                                        </div>
                                    </a>
                                    <div className="flex justify-between items-center gap-2">
                                        <p className="flex-1 text-sm font-bold text-ellipsis whitespace-nowrap overflow-hidden block" title={file.originalName}>{file.originalName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            <AlertDialog>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="rounded-full p-2.5">
                                                            <EllipsisVertical />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="">
                                                        <DropdownMenuGroup>
                                                            <DropdownMenuItem onClick={() => handleCopyLink(file.viewUrl)}>
                                                                <ClipboardCopy />
                                                                Copy link
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleOpenLink(file.viewUrl)}>
                                                                <Eye />
                                                                View
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleOpenLink(file.downloadUrl)}>
                                                                <Download />
                                                                Download
                                                            </DropdownMenuItem>
                                                        </DropdownMenuGroup>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleToggleExpiration(file.id)}>
                                                            {
                                                                file.expiresAt ? (
                                                                    <>
                                                                        <ToggleRight />
                                                                        Make it non-expiring
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <ToggleLeft />
                                                                        Make it expiring
                                                                    </>
                                                                )
                                                            }
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem>
                                                                <div className="w-full h-full text-red-500">
                                                                    <Trash className="w-4 h-4 inline-block mr-2 align-middle" />
                                                                    <span className="inline-block align-middle">Delete</span>
                                                                </div>
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                        <AlertDialogDescription className="max-w-md text-ellipsis overflow-hidden">
                                                            This action cannot be undone.<br />The file <span className="text-slate-900 font-medium dark:text-slate-200">{file.originalName}</span> will be permanently deleted.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(file.id)}>Continue</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                        <p className="flex-1 text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {getFileExpiresAtLabel(file)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                }
            </div>
            {isDragging && (
                <div className="fixed inset-0 bg-gray-600/50 z-50 p-12">
                    <div className="flex items-center justify-center h-full border-2 rounded-lg border-dashed border-white">
                        <div className="flex flex-col gap-4 items-center justify-center h-full">
                            <Upload className="w-16 h-16" />
                            <p className="text-white text-2xl">Drop your <span className="font-bold">file</span> here</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}