import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { UploadProgress } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { GalleryVerticalEnd } from 'lucide-react';
import axios from 'axios';
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface FileInfo {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  expiresAt?: string;
  downloadUrl: string;
}

export const Home = () => {
  const [progress, setProgress] = useState(0);
  const socketRef = useRef<Socket>();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    try {
      const response = await axios.get('/api/files');
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
      fetchFiles();
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
    fetchFiles();
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

  const handleLogout = async () => {
    console.log('logout');
    await fetch('/api/logout');
    logout();
    navigate('/login');
  };

  return (
    <div className="grid min-h-svh">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Yeeet
          </a>
          <div className="flex items-center gap-2 font-medium ml-auto">
            <Button onClick={handleLogout}>Logout</Button>
          </div>
        </div>
        <div className="flex flex-1 justify-center">
          <div className="w-full">
            <h2 className="text-2xl font-bold mb-4">Upload a file</h2>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Input ref={fileInputRef}
                type="file"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              <br />
              <Progress value={progress} />
            </div>
            <br />
            <br />
            <br />
            <h2 className="text-2xl font-bold mb-4">Your Files</h2>

            <div className="">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Filename</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Expires At</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map(file => (
                    <TableRow key={file.id}>
                      <TableCell className="font-bold">{file.originalName}</TableCell>
                      <TableCell>{file.mimeType}</TableCell>
                      <TableCell>{new Date(file.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{file.expiresAt ? new Date(file.createdAt).toLocaleString() : ''}</TableCell>
                      <TableCell className="text-right">
                        <a
                          className="text-primary underline-offset-4 hover:underline"
                          href={file.downloadUrl}
                          download
                        >Download</a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 