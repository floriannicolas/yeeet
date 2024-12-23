import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { UploadProgress } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { FlameKindling, CloudUpload, LogOut, EllipsisVertical, User, Settings, AppWindowMac } from 'lucide-react';
import axios from 'axios';
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

export const Home = () => {
  const [progress, setProgress] = useState(0);
  const socketRef = useRef<Socket>();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fetchFiles = async (limit?: number) => {
    try {
      const url = limit ? `/api/files?limit=${limit}` : '/api/files';
      const response = await axios.get(url);
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  useEffect(() => {
    socketRef.current = io('http://localhost:3000', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socketRef.current.on('progress', (data: UploadProgress) => {
      setProgress((data.uploadedChunks / data.totalChunks) * 100);
    });

    socketRef.current.on('completed', () => {
      fetchFiles(FILES_LIMIT);
      setProgress(0);
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
        originalName: file.name,
      });
      formData.append('chunk', new Blob([chunk], { type: file.type }), metadata);

      await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
    }
  };

  const handleDownloadApp = () => {
    window.open('https://github.com/floriannicolas/yeeet/releases/download/v0.0.1/Yeeet-app-v0.0.1.dmg', '_blank');
  };

  const handleLogout = async () => {
    console.log('logout');
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
    logout();
    navigate('/login');
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/files/${id}`);
      fetchFiles(FILES_LIMIT);
    } catch (error) {
      console.error('Error deleting file:', error);
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
      // Créer un nouveau FileList à partir des fichiers déposés
      const dataTransfer = new DataTransfer();
      droppedFiles.forEach(file => dataTransfer.items.add(file));
      fileInputRef.current.files = dataTransfer.files;

      // Déclencher l'upload
      handleUpload(droppedFiles[0]);
    }
  };

  return (
    <div className="grid min-h-svh">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link to="/" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FlameKindling className="size-4" />
            </div>
            Yeeet
          </Link>
          <div className="flex items-center gap-2 font-medium ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52 -ml-24">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
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
                <DropdownMenuItem onClick={handleDownloadApp}>
                  <AppWindowMac />
                  <span>Download app</span>
                  <DropdownMenuShortcut>v0.0.1</DropdownMenuShortcut>
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
        <br />
        <div className="flex flex-1 justify-center">
          <div className="w-full">
            <h2 className="text-2xl font-bold mb-4">Upload a file</h2>
            <div className="grid w-full max-w-md items-center gap-1.5">
              <div className="flex w-full items-center justify-center relative">
                <Label
                  htmlFor="dropzone-file"
                  className="flex h-24 w-full cursor-pointer flex-col items-center justify-center bg-transparent rounded-lg border border-dashed border-gray-400 hover:border-white text-muted-foreground hover:text-white transition-all duration-300"
                >
                  <div className="w-full flex flex-col items-center justify-center pb-6 pt-5"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {progress <= 0 && (
                      <>
                        <CloudUpload className="mb-2 h-8 w-8 text-gray-500" />
                        <p className="font-light">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                      </>
                    )}
                  </div>
                  <Input
                    id="dropzone-file" className="hidden"
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                </Label>
                {(progress > 0) && (
                  <div className="absolute w-full h-full flex flex-col border border-white rounded-lg items-center justify-center">
                    <Progress value={progress} className="w-full h-full rounded-lg" />
                    <div className="absolute w-full h-full flex flex-col items-center justify-center">
                      <p className="text-sm text-center color-white">
                        Uploading... {Math.round(progress)}%
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <br />
            <br />
            <h2 className="text-2xl font-bold mb-4">Your Files</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Filename</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Expires At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map(file => (
                  <TableRow key={file.id}>
                    <TableCell className="font-bold">{file.originalName}</TableCell>
                    <TableCell>{file.mimeType}</TableCell>
                    <TableCell>{format(new Date(file.createdAt), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{file.expiresAt ? format(new Date(file.expiresAt), 'dd/MM/yyyy') : ''}</TableCell>
                    <TableCell className="text-right gap-2 flex justify-end">
                      <a
                        className="text-primary underline-offset-4 hover:underline"
                        href={file.viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                      <a
                        className="text-primary underline-offset-4 hover:underline"
                        href={file.downloadUrl}
                        download
                      >
                        Download
                      </a>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="link" className="p-0 h-auto">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.<br />The file "{file.originalName}" will be permanently deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(file.id)}>Continue</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}; 