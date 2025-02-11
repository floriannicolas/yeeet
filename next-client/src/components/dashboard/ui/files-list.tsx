import { FileInfo} from '@/lib/definitions';
import { useToast } from "@/hooks/use-toast";
import {
    EllipsisVertical,
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
import { Button } from "@/components/ui/button"
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatFileSize } from '@/utils/format';
import { deleteUserFile, toggleUserFileExpiration } from '@/lib/actions';
import { filesReducerAction } from '..';

export default function FilesList({
    files,
    limit,
    setOptimisticFiles,
    fetchFiles,
}: {
    files: FileInfo[],
    limit: number,
    setOptimisticFiles: (action: { type: filesReducerAction, file: FileInfo }) => void,
    fetchFiles: (limit?: number) => Promise<void>,
}) {
    const { toast } = useToast();

    const handleOpenLink = (url: string) => {
        window.open(url, '_blank');
    };

    const handleCopyLink = (url: string) => {
        navigator.clipboard.writeText(url);
    };

    const handleDelete = async (file: FileInfo) => {
        try {
            setOptimisticFiles({ type: 'DELETE', file: file });
            deleteUserFile(file.id);
            toast({
                title: "File deleted successfully",
                description: <>Your file is now deleted.</>
            });
            fetchFiles(limit);
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    };

    const handleToggleExpiration = async (file: FileInfo) => {
        try {
            setOptimisticFiles({ type: 'TOGGLE_EXPIRATION', file: file });
            toggleUserFileExpiration(file.id);
            fetchFiles(limit);
        } catch (error) {
            console.error('Error toggling file expiration:', error);
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
                                            <DropdownMenuItem onClick={() => handleCopyLink(file.viewUrl)} className='cursor-pointer'>
                                                <ClipboardCopy />
                                                Copy link
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleOpenLink(file.viewUrl)} className='cursor-pointer'>
                                                <Eye />
                                                View
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleOpenLink(file.downloadUrl)} className='cursor-pointer'>
                                                <Download />
                                                Download
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleToggleExpiration(file)} className='cursor-pointer'>
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
                                            <DropdownMenuItem className='cursor-pointer'>
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
                                        <AlertDialogAction onClick={() => handleDelete(file)}>Continue</AlertDialogAction>
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