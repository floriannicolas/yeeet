import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FlameKindling } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { InputPassword } from "@/components/ui/input-password";
import { Label } from "@/components/ui/label";
import axios from 'axios';
import { Helmet } from "react-helmet";

const API_URL = import.meta.env.VITE_API_URL;

export const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setStatus('loading');
        setError('');

        try {
            const response = await axios.post(`${API_URL}/api/reset-password`, {
                token,
                password
            }, {
                withCredentials: true
            });

            if (response.status === 200) {
                setStatus('success');
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'An error occurred');
            setStatus('error');
        }
    };

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <Helmet>
                <title>Reset your password - Yeeet</title>
            </Helmet>
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center gap-2 text-center mb-6">
                    <Link to="/" className="flex items-center gap-2 font-medium">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                            <FlameKindling className="size-4" />
                        </div>
                        Yeeet
                    </Link>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Reset your password</CardTitle>
                        <CardDescription>
                            Enter your new password below
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {status === 'success' ? (
                            <div className="text-center text-semibold">
                                Password reset successful! Redirecting to login...
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                {error && <p className="text-red-500 mb-4">{error}</p>}
                                <div className="flex flex-col gap-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="password">New password</Label>
                                        <InputPassword
                                            id="password"
                                            value={password}
                                            autoComplete="new-password"
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="confirmPassword">Confirm password</Label>
                                        <InputPassword
                                            id="confirmPassword"
                                            autoComplete="new-password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={status === 'loading'}>
                                        {status === 'loading' ? 'Resetting...' : 'Reset Password'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}; 