import {
    LoaderCircle,
} from 'lucide-react';

export default function Loader() {
    return (
        <div className="flex h-full flex-1 items-center gap-2 justify-center p-2 font-light text-muted-foreground">
            <LoaderCircle className="animate-spin" /> Loading...
        </div>
    );
}