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
    const [state, formAction, isPending] = useActionState(
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
            {state?.message && <p className="text-red-500 text-sm">{state.message}</p>}
            <div className="grid gap-6">
                <div className="grid gap-2">
                    <Label
                        htmlFor="invitationKey"
                        className={!!state?.errors?.invitationKey ? 'text-red-500' : ''}
                    >
                        Invitation key
                    </Label>
                    <Input
                        id="invitationKey"
                        name="invitationKey"
                        type="text"
                        defaultValue={state?.formData?.invitationKey as string}
                        error={!!state?.errors?.invitationKey}
                        errorsList={state?.errors?.invitationKey}
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <Label
                        htmlFor="username"
                        className={!!state?.errors?.username ? 'text-red-500' : ''}
                    >
                        Username
                    </Label>
                    <Input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="new-username"
                        defaultValue={state?.formData?.username as string}
                        error={!!state?.errors?.username}
                        errorsList={state?.errors?.username}
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <Label
                        htmlFor="email"
                        className={!!state?.errors?.email ? 'text-red-500' : ''}
                    >
                        Email
                    </Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="new-email"
                        defaultValue={state?.formData?.email as string}
                        error={!!state?.errors?.email}
                        errorsList={state?.errors?.email}
                        placeholder="jon.snow@example.com"
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <div className="flex items-center">
                        <Label
                            htmlFor="password"
                            className={!!state?.errors?.password ? 'text-red-500' : ''}
                        >
                            Password
                        </Label>
                    </div>
                    <InputPassword
                        id="password"
                        name="password"
                        autoComplete="new-password"
                        defaultValue={state?.formData?.password as string}
                        error={!!state?.errors?.password}
                        errorsList={state?.errors?.password}
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <div className="flex items-center">
                        <Label
                            htmlFor="confirmPassword"
                            className={!!state?.errors?.confirmPassword ? 'text-red-500' : ''}
                        >
                            Confirm password
                        </Label>
                    </div>
                    <InputPassword
                        id="confirmPassword"
                        name="confirmPassword"
                        autoComplete="new-password"
                        defaultValue={state?.formData?.confirmPassword as string}
                        error={!!state?.errors?.confirmPassword}
                        errorsList={state?.errors?.confirmPassword}
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