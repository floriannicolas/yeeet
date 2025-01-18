"use client";

import { useActionState } from 'react';
import { resetPassword } from '@/lib/actions';
import { Button } from "@/components/ui/button";
import { InputPassword } from "@/components/ui/input-password";
import { Label } from "@/components/ui/label";

export default function ResetPasswordForm({ token }: { token: string }) {
    const [formState, formAction, isPending] = useActionState(
        resetPassword,
        {},
    );

    return (
        <>
            {formState?.status === 'success' ? (
                <div className="text-center text-semibold">
                    Password reset successful! Redirecting to login...
                </div>
            ) : (
                <form action={formAction}>
                    {formState?.status === 'error' && formState?.message && <p className="text-red-500 text-sm mb-4">{formState?.message}</p>}
                    <input type="hidden" name="token" value={token} />
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-2">
                            <Label
                                htmlFor="password"
                                className={!!formState?.errors?.password ? 'text-red-500' : ''}
                            >
                                New password
                            </Label>
                            <InputPassword
                                id="password"
                                name="password"
                                defaultValue={formState?.formData?.password as string}
                                error={!!formState?.errors?.password}
                                errorsList={formState?.errors?.password}
                                autoComplete="new-password"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label
                                htmlFor="confirmPassword"
                                className={!!formState?.errors?.confirmPassword ? 'text-red-500' : ''}
                            >
                                Confirm password
                            </Label>
                            <InputPassword
                                id="confirmPassword"
                                name="confirmPassword"
                                defaultValue={formState?.formData?.confirmPassword as string}
                                error={!!formState?.errors?.confirmPassword}
                                errorsList={formState?.errors?.confirmPassword}
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