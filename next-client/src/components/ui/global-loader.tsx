import {
    LoaderCircle,
} from 'lucide-react';

export default function GlobalLoader() {
    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 text-muted-foreground gap-3">
            <LoaderCircle className="animate-spin" /> Loading...
        </div>
    );
}