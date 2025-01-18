"use client";

import { useActionState } from 'react';
import { forgotPassword } from '@/lib/actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from 'next/link';

export default function ForgotPasswordForm() {
    const [state, formAction, isPending] = useActionState(
        forgotPassword,
        {},
    );

    return (
        <>
            {state?.success ? (
                <div className="text-center text-semibold">
                    {state.success}
                </div>
            ) : (
                <form action={formAction}>
                    {state?.error && <p className="text-red-500 mb-4">{state.error}</p>}
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                placeholder="jon.snow@example.com"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" aria-disabled={isPending} disabled={isPending}>
                            {isPending ? 'Sending...' : 'Send reset link'}
                        </Button>
                    </div>
                    <div className="mt-4 text-center text-sm">
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className="underline underline-offset-4">
                            Sign up
                        </Link>
                    </div>
                </form>
            )}
        </>
    );
}