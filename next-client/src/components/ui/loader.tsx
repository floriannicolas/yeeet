import { LoaderCircle } from 'lucide-react';

export default function Loader({ type }: { type?: string }) {
  const className =
    type === 'global'
      ? 'flex min-h-svh w-full items-center justify-center p-6 md:p-10 text-muted-foreground gap-3'
      : 'flex h-full flex-1 items-center gap-2 justify-center p-2 font-light text-muted-foreground';
  return (
    <div className={className}>
      <LoaderCircle className="animate-spin" /> Loading...
    </div>
  );
}
