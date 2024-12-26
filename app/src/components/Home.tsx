import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';
import { UploadProgress } from '../types';
import { FlameKindling, LogOut, EllipsisVertical, Upload } from 'lucide-react';
import { LogicalSize, getCurrentWindow } from '@tauri-apps/api/window';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { listen } from '@tauri-apps/api/event';
import { readFile, remove } from '@tauri-apps/plugin-fs';
import { Command } from '@tauri-apps/plugin-shell';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
const API_URL = import.meta.env.VITE_API_URL;
const CLIENT_URL = import.meta.env.VITE_CLIENT_URL;
const FILES_LIMIT = 3;

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
      const response = await axios.get(
        `${API_URL}${url}`,
        { withCredentials: true }
      );
      const data = response.data || [];
      setFiles(data);
      resizeWindow(data.length || 0);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const resizeWindow = async (limit: number) => {
    let height = 390;
    switch (limit) {
      case 0:
        height = 310;
        break;
      case 1:
        height = 320;
        break;
      case 2:
        height = 360;
        break;
      case 3:
        height = 390;
        break;
    }
    try {
      await getCurrentWindow().setSize(new LogicalSize(360, height));
    } catch (error) {
      console.error('Failed to resize window:', error);
    }
  };

  useEffect(() => {
    resizeWindow(3);
  }, []);

  useEffect(() => {
    const unlistenBlur = listen('tauri://blur', async () => {
      try {
        const window = getCurrentWindow();
        await window.hide();
      } catch (error) {
        console.error('Error hiding window:', error);
      }
    });

    return () => {
      unlistenBlur.then(unlisten => unlisten());
    };
  }, []);

  useEffect(() => {
    socketRef.current = io(API_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socketRef.current.on('progress', (data: UploadProgress) => {
      setProgress((data.uploadedChunks / data.totalChunks) * 100);
    });

    socketRef.current.on('completed', async (result: any) => {
      await writeText(result.viewUrl);
      fetchFiles(FILES_LIMIT);
      setProgress(0);
      new Audio("/yeeet.mp3").play();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    const unlistenScreenshot = listen('screenshot-created', async (event) => {
      try {
        const path = (event.payload as string).replace('/.', '/');
        const fileContent = await readFile(path);
        const filename = path.split('/').pop() || 'screenshot.png';
        const normalizedFilename = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace('’', '');
        const file = new File([fileContent], normalizedFilename, {
          type: 'image/png'
        });

        await handleUpload(file);
        await remove(path);
      } catch (error) {
        console.error('Error handling screenshot:', error);
      }
    });

    return () => {
      unlistenScreenshot.then(unlisten => unlisten());
    };
  }, []);

  useEffect(() => {
    const unlistenTauriFocus = listen('tauri://focus', () => {
      fetchFiles(FILES_LIMIT);
    });
    fetchFiles(FILES_LIMIT);

    return () => {
      unlistenTauriFocus.then(unlisten => unlisten());
    };
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

      await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
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

  const handleSelectArea = async () => {
    try {
      await Command.create('run-screencapture-select-area').execute();
    } catch (error) {
      console.error('Error launching screenshot:', error);
    }
  };

  const handleDesktopScreenshot = async () => {
    try {
      await Command.create('run-screencapture-desktop').execute();
    } catch (error) {
      console.error('Error launching screenshot:', error);
    }
  };

  return (
    <div
      className="min-h-svh"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="flex sticky top-0 bg-background z-10 h-16 shrink-0 items-center gap-2 border-b px-6">
        <div className="flex justify-center gap-2 md:justify-start w-full">
          <a
            href={CLIENT_URL}
            target="_blank"
            rel="noopener noreferrer" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FlameKindling className="size-4" />
            </div>
            Yeeet
          </a>
          <div className="flex items-center gap-2 font-medium ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full p-2.5">
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-32 -ml-12">
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
            <div className="left-0 right-0 top-full h-2 bg-gray-200 text-right" style={{ width: `${progress}%` }} />
          </div>
        )}
      </header>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-2 divide-y">
          <div className="flex flex-col">
            <h2 className="text-1xl font-bold mb-2">
              Recent uploads
            </h2>
            {files.length > 0 ? (
              <ul className="list-none w-full">
                {files.map(file => (
                  <li key={file.id} className="-mx-2">
                    <a
                      className="transition-all duration-300 text-sm text-muted-foreground hover:text-white text-ellipsis whitespace-nowrap overflow-hidden block rounded p-2 cursor-pointer hover:bg-neutral-800"
                      href={file.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {file.originalName}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No files uploaded yet
              </p>
            )}
          </div>
          <div className="flex flex-col pt-2">
            <div className="flex w-full items-center justify-center relative">
              <Label
                htmlFor="dropzone-file"
                className="w-full block flex cursor-pointer flex-col items-center justify-center bg-transparent transition-all duration-300"
              >
                <div
                  className={`w-full block inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground shadow font-medium rounded-lg focus:outline-none ${progress > 0 ? 'opacity-50 cursor-default' : 'hover:bg-primary/90 cursor-pointer'}`}
                >
                  <Upload className="w-4 h-4 me-2" />
                  Upload
                </div>
                <Input
                  id="dropzone-file" className="hidden"
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              </Label>
            </div>
          </div>
          <div className="flex flex-col pt-2">
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleSelectArea}
            >
              Select area…
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleDesktopScreenshot}
            >
              Desktop screenshot
            </Button>
          </div>
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