"use client";

import { useActionState } from 'react';
import { authenticate } from '@/lib/actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/ui/input-password";
import { Label } from "@/components/ui/label";
import Link from 'next/link';

export default function LoginForm() {
    const [errorMessage, formAction, isPending] = useActionState(
        authenticate,
        undefined,
    );

    return (
        <form className="flex flex-col gap-6" action={formAction}>
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Login to your account</h1>
                <p className="text-balance text-sm text-muted-foreground">
                    Enter your email or your username below to login to your account
                </p>
            </div>
            <div className="grid gap-6">
                <div className="grid gap-2">
                    <Label
                        htmlFor="email"
                        className={!!errorMessage ? 'text-red-500' : ''}
                    >
                        Email (or username)
                    </Label>
                    <Input
                        id="email"
                        type="text"
                        name="username"
                        error={!!errorMessage}
                        placeholder="jon.snow@example.com"
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <div className="flex flex-col-reverse gap-2">
                        <InputPassword
                            id="password"
                            name="password"
                            error={!!errorMessage}
                            required
                        />
                        <div className="flex items-center">
                            <Label
                                htmlFor="password"
                                className={!!errorMessage ? 'text-red-500' : ''}
                            >
                                Password
                            </Label>
                            <Link href="/forgot-password" className="ml-auto text-sm underline-offset-4 hover:underline">
                                Forgot your password?
                            </Link>
                        </div>
                    </div>
                </div>
                {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
                <Button type="submit" className="w-full" aria-disabled={isPending} disabled={isPending}>
                    Login
                </Button>
            </div>
            <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="underline underline-offset-4">
                    Sign up
                </Link>
            </div>
        </form>
    );
}