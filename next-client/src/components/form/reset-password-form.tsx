"use client";

import { useActionState } from 'react';
import { resetPassword } from '@/lib/actions';
import { Button } from "@/components/ui/button";
import { InputPassword } from "@/components/ui/input-password";
import { Label } from "@/components/ui/label";

export default function ResetPasswordForm({ token } : { token: string}) {
    const [state, formAction, isPending] = useActionState(
        resetPassword,
        {},
    );

    return (
        <>
            {state?.success ? (
                <div className="text-center text-semibold">
                    Password reset successful! Redirecting to login...
                </div>
            ) : (
                <form action={formAction}>
                    {state?.error && <p className="text-red-500 mb-4">{state?.error}</p>}
                    <input type="hidden" name="token" value={token} />
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="password">New password</Label>
                            <InputPassword
                                id="password"
                                name="password"
                                autoComplete="new-password"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">Confirm password</Label>
                            <InputPassword
                                id="confirmPassword"
                                name="confirmPassword"
                                autoComplete="new-password"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" aria-disabled={isPending} disabled={isPending}>
                            {isPending ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </div>
                </form>
            )}
        </>
    );
}