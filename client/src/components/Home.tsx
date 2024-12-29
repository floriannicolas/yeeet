import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { StorageInfo, UploadComplete, UploadProgress } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from "@/hooks/use-toast";
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
} from 'lucide-react';
import axios from 'axios';
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
import { formatFileSize } from '../utils/format';
import { Helmet } from "react-helmet";
import { getApiToken, removeApiToken } from '@/utils/api-token';

interface FileInfo {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  expiresAt?: string;
  downloadUrl: string;
  viewUrl: string;
}

const FILES_LIMIT = 50;
const API_URL = import.meta.env.VITE_API_URL;

export const Home = () => {
  const [progress, setProgress] = useState(0);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const socketRef = useRef<Socket>();
  const navigate = useNavigate();
  const { logout, userId } = useAuth();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const fetchFiles = async (limit?: number) => {
    try {
      const url = limit ? `${API_URL}/api/files?limit=${limit}` : `${API_URL}/api/files`;
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${getApiToken()}` } });
      setFiles(response.data);
      fetchStorageInfo();
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const fetchStorageInfo = async () => {
    const response = await axios.get(
      `${API_URL}/api/storage-info`, {
      headers: { Authorization: `Bearer ${getApiToken()}` }
    });
    setStorageInfo(response.data);
  };

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
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
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);


  useEffect(() => {
    fetchFiles(FILES_LIMIT);
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

      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${getApiToken()}` }
      });
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
    window.open('/releases/download/Yeeet_0.1.0_x64.dmg', '_blank');
  };

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank');
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const handleLogout = async () => {
    await fetch(`${API_URL}/api/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getApiToken()}` }
    });
    removeApiToken();
    logout();
    navigate('/login');
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/api/files/${id}`, {
        headers: { Authorization: `Bearer ${getApiToken()}` }
      });
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
      await fetch(`${API_URL}/api/files/${id}/toggle-expiration`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getApiToken()}` }
      });
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

      handleUpload(droppedFiles[0]);
    }
  };

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
    return mimeType.startsWith('image/');
  };

  const getFileIcon = (mimeType: string) => {
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
    <div className="min-h-svh"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Helmet>
        <title>Yeeet</title>
      </Helmet>
      <header className="flex sticky top-0 bg-background z-10 h-16 shrink-0 items-center gap-2 border-b px-6">
        <div className="flex justify-center gap-2 md:justify-start w-full">
          <Link to="/" className="flex items-center gap-2 font-medium">
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
                        <div className="text-semibold">
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
                  <DropdownMenuShortcut>v0.1.0</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
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
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between space-y-2 md:space-y-0 mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Your files</h2>
            <p className="text-md font-light text-muted-foreground">Your secure file sharing space…</p>
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
        {files.length === 0 && (
          <div className="flex h-full">
            <p className="text-muted-foreground">No files yet…</p>
          </div>
        )}
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
                  <img
                    className={`w-full h-44 object-contain rounded-lg ${getFileBackground(file.mimeType)} group-hover:blur-sm group-hover:scale-125 transition-all duration-300`}
                    src={file.viewUrl}
                    alt=""
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
                        <DropdownMenuItem>
                          <AlertDialogTrigger asChild>
                            <div className="w-full h-full text-red-500">
                              <Trash className="w-4 h-4 inline-block mr-2 align-middle" />
                              <span className="inline-block align-middle">Delete</span>
                            </div>
                          </AlertDialogTrigger>
                        </DropdownMenuItem>
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
}; 