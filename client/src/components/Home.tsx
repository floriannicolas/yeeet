import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { UploadProgress } from '../types';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface FileInfo {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
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
    <div>
      <h1>YEEET</h1>
      <button onClick={handleLogout}>Logout</button>
      <br />
      <br />
      <h2>Upload a file</h2>
      <input
        ref={fileInputRef}
        type="file"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />
      <progress value={progress} max="100" />
      <br />
      <br />
      <h2>Your Files</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Size</th>
            <th>Upload Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {files.map(file => (
            <tr key={file.id}>
              <td>{file.originalName}</td>
              <td>{file.mimeType}</td>
              <td>{Math.round(file.size / 1024)} KB</td>
              <td>{new Date(file.createdAt).toLocaleString()}</td>
              <td>
                <a href={file.downloadUrl} download>Download</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}; 