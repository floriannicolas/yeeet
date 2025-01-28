import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { StorageInfo } from '../types';
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
import {
  getDeleteScreenshotAfterUpload,
  getIsShottrFriendly,
  getScreenshotPath,
  setDeleteScreenshotAfterUpload,
  setIsShottrFriendly,
  setScreenshotPath,
} from '@/utils/settings';
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
const NOT_SCREENSHOT_PATH = 'NOT_SCREENSHOT_PATH';

export const Home = () => {
  const [progress, setProgress] = useState(0);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [deleteScreenshotAfterUploadState, setDeleteScreenshotAfterUploadState] = useState(getDeleteScreenshotAfterUpload());
  const [isShottrFriendlyState, setIsShottrFriendlyState] = useState(getIsShottrFriendly());
  const [screenshotPathState, setScreenshotPathState] = useState(getScreenshotPath());
  const [screenshotPathUpdated, setScreenshotPathUpdated] = useState(screenshotPathState);
  const [areSettingsOpen, setAreSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const lastScreenshotRef = useRef<string | null>(null);
  const uploadPathsQueue = useRef<string[]>([]);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const filesToUploadQueue = useRef<File[]>([]);

  const detectDefaultScreenshot = (event: WatchEvent) => {
    const regex = /\d{2}\.\d{2}\.\d{2}\.(png|jpg)(-[\w\-]+)?$/;
    if (
      typeof event.type === 'object'
      && 'create' in event.type
      && event.type.create.kind === 'file'
    ) {
      debugLog('event file created detected :: ' + event.paths[0]);
      const path = event.paths[0];
      if (regex.test(path)) {
        debugLog('file considerated as a screenshot :: ' + path);
        const regex = /(.+\.(png|jpg))/;
        const match = path.match(regex);
        const filename = (match ? match[1] : path)
          .replace('/.', '/')
          .replace('/.', '/')
          .replace('/.', '/');
        setTimeout(() => {
          errorLog('detectDefaultScreenshot :: screenshot detected :: ' + filename);
          emit('screenshot-created', filename);
        }, 200);
      }
    }
  }

  const detectShottrScreenshot = (event: WatchEvent) => {
    if (!isShottrFriendlyState) {
      return;
    }

    const regex = /SCR-\d{8}-[a-zA-Z0-9]+\.(png|jpg)(-[\w\-]+)?$/;
    if (
      typeof event.type === 'object'
      && 'modify' in event.type
      && event.type.modify.kind === 'data'
    ) {
      debugLog('shottr event file created detected :: ' + event.paths[0]);
      const path = event.paths[0];
      if (regex.test(path)) {
        debugLog('Shottr file considerated as a screenshot :: ' + path);
        const regex = /(.+\.(png|jpg))/;
        const match = path.match(regex);
        const filename = (match ? match[1] : path)
          .replace('/.', '/')
          .replace('/.', '/')
          .replace('/.', '/');
        setTimeout(() => {
          errorLog('detectShottrScreenshot :: screenshot detected :: ' + filename);
          emit('screenshot-created', filename);
        }, 200);
      }
    }
  }

  const launchScreenshotWatcher = async () => {
    try {
      const screenshotPath = getScreenshotPath().replace('$HOME/', '').replace('~/', '');
      const stopWatcher = await watchImmediate(
        screenshotPath,
        (event: WatchEvent) => {
          detectDefaultScreenshot(event);
          detectShottrScreenshot(event);
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

  const removeFileFromQueueList = async (isSuccess: boolean = false) => {
    if (filesToUploadQueue.current.length > 0) {
      const [, ...otherFiles] = filesToUploadQueue.current;
      filesToUploadQueue.current = otherFiles;
    }
    if (uploadPathsQueue.current.length > 0) {
      const [uploadedPath, ...otherPaths] = uploadPathsQueue.current;
      uploadPathsQueue.current = otherPaths;
      if (
        isSuccess
        && uploadedPath
        && uploadedPath !== NOT_SCREENSHOT_PATH
        && getDeleteScreenshotAfterUpload()
      ) {
          try {
            infoLog(`listen.screenshot-created :: delete-screenshot-after-upload :: ${uploadedPath}`);
            await remove(uploadedPath);
          } catch (error) {
            console.error('Failed to delete screenshot after upload:', error);
            errorLog('Failed to delete screenshot after upload :: ' + error);
          }
      }
    }
  }

  const manageUploadQueueList = (file?: File, path?: string) => {
    if (file) {
      filesToUploadQueue.current = [...filesToUploadQueue.current, file];
      uploadPathsQueue.current = [...uploadPathsQueue.current, path ? path : NOT_SCREENSHOT_PATH];
    }
    if (filesToUploadQueue.current.length > 0) {
      handleUpload(filesToUploadQueue.current[0]);
    }
  }

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
    const unlistenScreenshot = listen('screenshot-created', async (event) => {
      infoLog(`listen.screenshot-created :: ${event.payload as string}`);
      try {
        const path = (event.payload as string);
        if (path === lastScreenshotRef.current) {
          infoLog(`listen.screenshot-created :: last screenshot detected, doing nothing`);
          return;
        }
        lastScreenshotRef.current = path;
        const fileContent = await readFile(path);
        const filename = path.split('/').pop() || 'screenshot.png';
        const mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const normalizedFilename = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace('’', '');
        const file = new File([fileContent], normalizedFilename, {
          type: mimeType
        });

        manageUploadQueueList(file, path);
        infoLog(`listen.screenshot-created :: screenshot uploaded :: ${path}`);
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
    if (progress > 0) {
      return;
    }

    const chunkSize = 1024 * 1024; // 1MB
    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadId = Date.now().toString();
    setProgress(2);

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


      try {
        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData,
          headers: { Authorization: `Bearer ${getApiToken()}` }
        });
        const data = await response.json();
        if (!response.ok) {
          const title = data.code === 'STORAGE_LIMIT_EXCEEDED' ? 'Storage limit exceeded' : 'Error uploading file';
          errorLog(`handleUpload :: error :: ${title} :: ${data.message}`);
          toast({
            title,
            description: data.message,
          });
          removeFileFromQueueList();
          manageUploadQueueList();
          break;
        }
        if (data.status === 'completed') { // Upload completed
          infoLog(`completed :: ${data.viewUrl}`);
          await writeText(data.viewUrl);
          fetchFiles(FILES_LIMIT);
          setProgress(0);
          new Audio("/yeeet.mp3").play();
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          removeFileFromQueueList(true);
          manageUploadQueueList();
        } else { // partial
          setProgress((data.uploadedChunks / data.totalChunks) * 100);
        }
      } catch (e) {
        const error = e as Error;
        errorLog(`handleUpload :: error :: Error uploading file :: ${error.message}`);
        setProgress(0);
        toast({
          title: 'Error uploading file',
          description: error.message,
        });
        removeFileFromQueueList();
        manageUploadQueueList();
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

      manageUploadQueueList(droppedFiles[0]);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDeleteScreenshotAfterUpload(deleteScreenshotAfterUploadState);
    setIsShottrFriendly(isShottrFriendlyState);
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
      <header className="flex sticky top-0 bg-background z-10 h-16 shrink-0 items-center gap-2 border-b px-6 select-none">
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
      <div className="flex flex-col flex-1 gap-4 p-6 select-none">
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
                  onChange={(e) => e.target.files?.[0] && manageUploadQueueList(e.target.files[0])} />
              </Label>
            </div>
          </div>
        </div>
      </div>
      <Drawer
        onClose={() => {
          setDeleteScreenshotAfterUploadState(getDeleteScreenshotAfterUpload());
          setIsShottrFriendlyState(getIsShottrFriendly());
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
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isShottrFriendly"
                          checked={isShottrFriendlyState}
                          onCheckedChange={(checked) => {
                            setIsShottrFriendlyState(checked);
                          }}
                        />
                        <Label htmlFor="isShottrFriendly" className="text-right">
                          Detect Shottr screenshots
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