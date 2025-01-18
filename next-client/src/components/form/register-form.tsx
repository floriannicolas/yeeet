"use client";

import { CircleAlert } from 'lucide-react';
import { useActionState } from 'react';
import { register } from '@/lib/actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/ui/input-password";
import { Label } from "@/components/ui/label";
import Link from 'next/link';

export default function RegisterForm() {
    const [errorMessage, formAction, isPending] = useActionState(
        register,
        undefined,
    );

    return (
        <form className="flex flex-col gap-6" action={formAction}>
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Create an account</h1>
                <p className="text-balance text-sm text-muted-foreground">
                    Fill the form below to create an account.
                </p>
                <p className="text-xs">
                    <CircleAlert className="size-4 inline" /> You need an invitation key to create an account.
                </p>
            </div>
            {errorMessage && <p className="text-red-500 mb-4">{errorMessage}</p>}
            <div className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="invitationKey">Invitation key</Label>
                    <Input
                        id="invitationKey"
                        name="invitationKey"
                        type="text"
                        error={!!errorMessage}
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="new-username"
                        error={!!errorMessage}
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="new-email"
                        error={!!errorMessage}
                        placeholder="jon.snow@example.com"
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <div className="flex items-center">
                        <Label htmlFor="password">Password</Label>
                    </div>
                    <InputPassword
                        id="password"
                        name="password"
                        autoComplete="new-password"
                        error={!!errorMessage}
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <div className="flex items-center">
                        <Label htmlFor="password">Confirm password</Label>
                    </div>
                    <InputPassword
                        id="confirmPassword"
                        name="confirmPassword"
                        autoComplete="new-password"
                        error={!!errorMessage}
                        required
                    />
                </div>
                <Button type="submit" className="w-full" aria-disabled={isPending} disabled={isPending}>
                    Register
                </Button>
            </div>
            <div className="text-center text-sm">
                Already have an account?{" "}
                <Link href="/login" className="underline underline-offset-4">
                    Login
                </Link>
            </div>
        </form>
    );
}