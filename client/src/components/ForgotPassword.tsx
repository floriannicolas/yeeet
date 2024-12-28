import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlameKindling } from 'lucide-react';
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label";

const API_URL = import.meta.env.VITE_API_URL;

export const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setError('');

        try {
            const response = await fetch(`${API_URL}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (response.ok) {
                setStatus('success');
            } else {
                const data = await response.json();
                setError(data.message);
                setStatus('error');
            }
        } catch (err: any) {
            setError('An error occurred. Please try again.');
            setStatus('error');
        }
    };

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center gap-2 text-center mb-6">
                    <Link to="/" className="flex items-center gap-2 font-medium">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                            <FlameKindling className="size-4" />
                        </div>
                        Yeeet
                    </Link>
                </div>
                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Reset your password</CardTitle>
                            <CardDescription>
                                Enter your email address and we'll send you a link to reset your password
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {status === 'success' ? (
                                <div className="text-center text-green-600">
                                    {error}
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    {error && <p className="text-red-500">{error}</p>}
                                    <div className="flex flex-col gap-6">
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="jon.snow@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <Button type="submit" className="w-full" disabled={status === 'loading'}>
                                            {status === 'loading' ? 'Sending...' : 'Send reset link'}
                                        </Button>
                                    </div>
                                    <div className="mt-4 text-center text-sm">
                                        Don&apos;t have an account?{" "}
                                        <Link to="/register" className="underline underline-offset-4">
                                            Sign up
                                        </Link>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}; 