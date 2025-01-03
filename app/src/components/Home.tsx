import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { io, Socket } from 'socket.io-client';
import { StorageInfo, UploadProgress } from '../types';
import { FlameKindling, LogOut, EllipsisVertical, Upload, Settings, CircleHelp } from 'lucide-react';
import { LogicalSize, getCurrentWindow } from '@tauri-apps/api/window';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { listen, emit } from '@tauri-apps/api/event';
import { readFile, remove, BaseDirectory, watchImmediate, WatchEvent } from '@tauri-apps/plugin-fs';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { getVersion } from '@tauri-apps/api/app';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getApiToken, removeApiToken } from '@/utils/api-token';
import { useToast } from "@/hooks/use-toast";
import { formatFileSize } from '@/utils/format';
import { getDeleteScreenshotAfterUpload, getScreenshotPath, setDeleteScreenshotAfterUpload, setScreenshotPath } from '@/utils/settings';
import {
  debug as debugLog,
  info as infoLog,
  error as errorLog,
} from '@tauri-apps/plugin-log';

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
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const socketRef = useRef<Socket>();
  const navigate = useNavigate();
  const { logout, userId } = useAuth();
  const [deleteScreenshotAfterUploadState, setDeleteScreenshotAfterUploadState] = useState(getDeleteScreenshotAfterUpload());
  const [screenshotPathState, setScreenshotPathState] = useState(getScreenshotPath());
  const [screenshotPathUpdated, setScreenshotPathUpdated] = useState(screenshotPathState);
  const [areSettingsOpen, setAreSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const [lastScreenshotPath, setLastScreenshotPath] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  const launchScreenshotWatcher = async () => {
    try {
      const screenshotPath = getScreenshotPath().replace('$HOME/', '').replace('~/', '');
      const regex = /\d{2}\.\d{2}\.\d{2}\.(png|jpg)(-[\w\-]+)?$/;
      const stopWatcher = await watchImmediate(
        screenshotPath,
        (event: WatchEvent) => {
          let isScreenshot = false;
          if (event.type !== 'any') {
            for (const [key, value] of Object.entries(event.type)) {
              if (key === 'create' && value.kind === 'file') {
                debugLog('event file created detected :: ' + event.paths[0]);
                const path = event.paths[0];
                if (regex.test(path)) {
                  debugLog('file considerated as a screenshot :: ' + event.paths[0]);
                  isScreenshot = true;
                }
              }
            }
          }
          if (isScreenshot) {
            console.log('new screenshot detected', event);
            const regex = /(.+\.(png|jpg))/;
            const match = event.paths[0].match(regex);
            const filename = (match ? match[1] : event.paths[0])
              .replace('/.', '/')
              .replace('/.', '/')
              .replace('/.', '/');
            setTimeout(() => {
              errorLog('watchImmediate :: screenshot detected :: ' + filename);
              emit('screenshot-created', filename);
            }, 200);
          }
        },
        {
          baseDir: BaseDirectory.Home,
          recursive: true,
        }
      );

      return stopWatcher;
    } catch (error) {
      toast({
        title: 'Error setting up screenshot watcher',
        description: error instanceof Error ? error.message : 'Check your screenshot path',
      });
      errorLog(error instanceof Error ? error.message : 'Check your screenshot path');
      console.error('Error setting up screenshot watcher:', error);
    }
  };

  useEffect(() => {
    const stopWatcher = launchScreenshotWatcher();
    return () => {
      stopWatcher.then(stop => stop?.());
    };
  }, [screenshotPathUpdated]);

  const fetchFiles = async (limit?: number) => {
    try {
      const url = limit ? `/api/files?limit=${limit}` : '/api/files';
      const response = await axios.get(
        `${API_URL}${url}`,
        {
          headers: { Authorization: `Bearer ${getApiToken()}` }
        }
      );
      const data = response.data || [];
      setFiles(data);
      resizeWindow(data.length || 0);
      fetchStorageInfo();
    } catch (error: any) {
      resizeWindow(0);
      console.error('Error fetching files:', error);
      errorLog('Error fetching files :: ' + error.response.status + ' :: ' + error.response.data);
      if (error.response.status === 401) {
        removeApiToken();
        navigate('/login');
      }
    }
  };

  const fetchCronJobs = async () => {
    const now = new Date();
    if (now.getHours() < 2) {
      return;
    }
    try {
      await axios.get(
        `${API_URL}/api/cron-jobs`, {
        headers: { Authorization: `Bearer ${getApiToken()}` },
      });
    } catch (error) {
      console.error('Error fetching cron jobs:', error);
    }
  };

  const fetchAppVersion = async () => {
    const version = await getVersion();
    setAppVersion(version);
    await axios.post(
      `${import.meta.env.VITE_API_URL}/api/update-app-version`,
      { appVersion: version },
      { headers: { Authorization: `Bearer ${getApiToken()}` } }
    );
  };

  useEffect(() => {
    fetchAppVersion()
    fetchCronJobs();
    const interval = setInterval(fetchCronJobs, 3600000); // Every hour

    return () => clearInterval(interval);
  }, []);

  const fetchStorageInfo = async () => {
    const response = await axios.get(
      `${API_URL}/api/storage-info`, {
      headers: { Authorization: `Bearer ${getApiToken()}` },
    });
    setStorageInfo(response.data);
  };

  const resizeWindow = async (limit: number) => {
    let height = 305;
    switch (limit) {
      case 0:
      case 1:
        height = 255;
        break;
      case 2:
        height = 275;
        break;
      case 3:
        height = 305;
        break;
    }
    try {
      await getCurrentWindow().setSize(new LogicalSize(360, height));
    } catch (error) {
      console.error('Failed to resize window:', error);
      errorLog('Failed to resize window :: ' + error);
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
        errorLog('Error hiding window :: ' + error);
      }
    });

    return () => {
      unlistenBlur.then(unlisten => unlisten());
    };
  }, []);

  useEffect(() => {
    socketRef.current = io(API_URL, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
    }).on('error', (error) => {
      toast({
        title: 'Error connecting to socket server',
        description: error instanceof Error ? error.message : 'Check your internet connection',
      });
      errorLog(error instanceof Error ? error.message : 'Check your internet connection');
    });

    socketRef.current.on(`progress.${userId}`, (data: UploadProgress) => {
      setProgress((data.uploadedChunks / data.totalChunks) * 100);
    });

    socketRef.current.on(`completed.${userId}`, async (result: any) => {
      infoLog(`completed.${userId} :: ${result.viewUrl}`);
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
      infoLog(`listen.screenshot-created :: ${event.payload as string}`);
      try {
        const path = (event.payload as string);
        if (path === lastScreenshotPath) {
          return;
        }
        setLastScreenshotPath(path);
        const fileContent = await readFile(path);
        const filename = path.split('/').pop() || 'screenshot.png';
        const mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const normalizedFilename = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace('’', '');
        const file = new File([fileContent], normalizedFilename, {
          type: mimeType
        });

        await handleUpload(file);
        if (getDeleteScreenshotAfterUpload()) {
          infoLog(`listen.screenshot-created :: delete-screenshot-after-upload :: ${path}`);
          await remove(path);
        }
      } catch (error) {
        errorLog(`listen.screenshot-created :: error :: ${error instanceof Error ? error.message : 'Screenshot not handled'}`);
        toast({
          title: 'Error handling screenshot',
          description: error instanceof Error ? error.message : 'Screenshot not handled',
        });
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
        errorLog(`handleUpload :: error :: ${title} :: ${error.message}`);
        toast({
          title,
          description: error.message,
        });
        break;
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getApiToken()}` }
      });
      removeApiToken();
      logout();
      navigate('/login');
    } catch (err) {
      errorLog(`handleLogout :: error :: ${err instanceof Error ? err.message : 'Logout failed'}`);
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

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDeleteScreenshotAfterUpload(deleteScreenshotAfterUploadState);
    setScreenshotPath(screenshotPathState);
    setScreenshotPathUpdated(screenshotPathState);
    setAreSettingsOpen(false);
  };

  return (
    <div
      className="min-h-svh flex flex-col"
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
              <DropdownMenuContent className="w-52 -ml-36">
                {storageInfo && (
                  <>
                    <DropdownMenuGroup>
                      <div className="px-2 py-1.5 text-xm flex gap-2 items-center">
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
                <DropdownMenuItem onClick={() => setAreSettingsOpen(true)}>
                  <div className="w-full h-full">
                    <Settings className="w-4 h-4 inline-block mr-2 align-middle" />
                    <span className="inline-block align-middle">App settings</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsHelpOpen(true)}>
                  <div className="w-full h-full">
                    <CircleHelp className="w-4 h-4 inline-block mr-2 align-middle" />
                    <span className="inline-block align-middle">Help</span>
                  </div>
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
        {
          (progress > 0) && (
            <div className="absolute left-0 right-0 top-full border-b border-t bg-background overflow-hidden">
              <div className="left-0 right-0 top-full h-2 bg-gray-200 text-right" style={{ width: `${progress}%` }} />
            </div>
          )
        }
      </header >
      <div className="flex flex-col flex-1 gap-4 p-6">
        <div className="flex flex-col flex-1 gap-2 divide-y">
          <div className="flex flex-col flex-1">
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
        </div>
      </div>
      <Drawer
        onClose={() => {
          setDeleteScreenshotAfterUploadState(getDeleteScreenshotAfterUpload());
          setScreenshotPathState(getScreenshotPath());
          setAreSettingsOpen(false);
        }}
        open={areSettingsOpen}
      >
        <DrawerContent>
          <ScrollArea className="h-[75vh]">
            <form onSubmit={handleSaveSettings}>
              <div className="mx-auto w-full max-w-sm">
                <DrawerHeader>
                  <DrawerTitle>App settings</DrawerTitle>
                  <DrawerDescription>
                    Update app <span className="text-white">v{appVersion}</span> settings here.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="flex items-center justify-center w-full">
                  <div className="flex flex-col gap-4 w-full px-4">
                    <div className="grid gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="deleteScreenshotAfterUpload"
                          checked={deleteScreenshotAfterUploadState}
                          onCheckedChange={(checked) => {
                            setDeleteScreenshotAfterUploadState(checked);
                          }}
                        />
                        <Label htmlFor="deleteScreenshotAfterUpload" className="text-right">
                          Delete screenshot after upload
                        </Label>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Screenshot path</Label>
                      <Input
                        id="screenshotPath"
                        value={screenshotPathState}
                        className="w-full"
                        onChange={(e) => {
                          setScreenshotPathState(e.target.value);
                        }}
                      />
                    </div>
                  </div>
                </div>
                <DrawerFooter>
                  <Button type="submit">Save</Button>
                  <DrawerClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DrawerClose>
                </DrawerFooter>
              </div>
            </form>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
      <Drawer
        onClose={() => {
          setIsHelpOpen(false);
        }}
        open={isHelpOpen}
      >
        <DrawerContent>
          <ScrollArea className="h-[75vh]">
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader>
                <DrawerTitle>Help</DrawerTitle>
                <DrawerDescription className="text-left">
                  Yeeet is a tool to upload your screenshots to a web server.
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex items-center justify-center w-full">
                <div className="flex flex-col gap-2 w-full px-4">
                  <div className="font-medium text-lg">
                    MacOs Shortcuts
                  </div>
                  <div className="flex flex-col gap-2 divide-y">
                    <div className="text-sm text-muted-foreground">
                      Using MacOs Shortcuts, you can take a screenshot of the part of the screen or the entire screen and they will be automatically uploaded to Yeeet.
                    </div>
                    <div className="flex gap-2 pt-2">
                      <div className="text-muted-foreground flex items-center gap-0.5">
                        <kbd>⌘</kbd><span className="text-xs">+</span><kbd>⇧</kbd><span className="text-xs">+</span><kbd>4</kbd>
                      </div>
                      <div className="flex-1 text-sm">
                        Take a screenshot of the part of the screen.
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <div className="text-muted-foreground flex items-center gap-0.5">
                        <kbd>⌘</kbd><span className="text-xs">+</span><kbd>⇧</kbd><span className="text-xs">+</span><kbd>3</kbd>
                      </div>
                      <div className="flex-1 text-sm">
                        Take a screenshot of the entire screen.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button type="button" variant="outline">Close</Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
      {
        isDragging && (
          <div className="fixed inset-0 bg-gray-600/50 z-50 p-12">
            <div className="flex items-center justify-center h-full border-2 rounded-lg border-dashed border-white">
              <div className="flex flex-col gap-4 items-center justify-center h-full">
                <Upload className="w-16 h-16" />
                <p className="text-white text-2xl">Drop your <span className="font-bold">file</span> here</p>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};