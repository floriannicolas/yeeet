import { FlameKindling } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import LoginForm from '@/components/form/login-form';

export const metadata: Metadata = {
  title: 'Login - Yeeet',
};

export default function Login() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FlameKindling className="size-4" />
            </div>
            Yeeet
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block p-10 lg:flex">
        <Image
          src="/login-bg.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.5] dark:grayscale"
          width={1443}
          height={2160}
        />
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              “Yeeet has saved me countless hours of work by helping me share screenshots faster
              than ever before.”
            </p>
            <footer className="text-sm">Eric Martin</footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
