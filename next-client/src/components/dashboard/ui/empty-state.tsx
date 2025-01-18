import {
    FlameKindling,
} from 'lucide-react';
import { RefObject } from 'react';

export default function EmptyState({ 
    fileInputRef,
} : { 
    fileInputRef: RefObject<HTMLInputElement | null>,
}) {
    return (
        <div className="flex flex-col h-full flex-1 items-center justify-center p-2">
            <FlameKindling className="w-16 h-16 text-muted-foreground mb-2 flame-kindling-animation" />
            <p className="text-md font-light text-muted-foreground mb-2">No files yet…</p>
            <p className="text-sm font-light text-muted-foreground">
                <span onClick={() => fileInputRef.current?.click()} className="font-semibold text-white cursor-pointer hover:underline">Upload your first file</span> to get started.
            </p>
        </div>
    )
}