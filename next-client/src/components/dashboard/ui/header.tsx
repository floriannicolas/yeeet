"use-client";

import Link from 'next/link';
import {
    FlameKindling,
    LogOut,
    AppWindowMac,
    EllipsisVertical,
    X,
} from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
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
import { handleLogout } from '@/lib/actions';
import { StorageInfo } from '@/lib/definitions';
import { useState } from 'react';
import { getAppVersionAlertClosed, setAppVersionAlertClosed } from '@/utils/app-version-alert';

const MACOS_APP_VERSION = process.env.NEXT_PUBLIC_MACOS_APP_VERSION;

export default function Header({
    storageInfo,
    progress,
    lastAppVersion,
}: {
    storageInfo: StorageInfo | null,
    progress: number,
    lastAppVersion: string | null | undefined,
}) {
    const [showAppUpdate, setShowAppUpdate] = useState(
        !getAppVersionAlertClosed() &&
        MACOS_APP_VERSION &&
        (!lastAppVersion || (lastAppVersion < MACOS_APP_VERSION))
    );

    const handleDownloadApp = () => {
        window.open(`/releases/download/Yeeet_${MACOS_APP_VERSION}_x64.dmg`, '_blank');
    };

    return (
        <>
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
                                <DropdownMenuItem onClick={handleDownloadApp} className='cursor-pointer'>
                                    <AppWindowMac />
                                    <span>Download app</span>
                                    <DropdownMenuShortcut>v{MACOS_APP_VERSION}</DropdownMenuShortcut>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleLogout()} className='cursor-pointer'>
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
        </>
    )
}