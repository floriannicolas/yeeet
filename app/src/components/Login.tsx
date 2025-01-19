import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FlameKindling } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { InputPassword } from "@/components/ui/input-password";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogicalSize, getCurrentWindow } from '@tauri-apps/api/window';
import { setApiToken } from '@/utils/api-token';


export const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const resizeWindow = async () => {
            try {
                await getCurrentWindow().setSize(new LogicalSize(360, 450));
            } catch (error) {
                console.error('Failed to resize window:', error);
            }
        };

        resizeWindow();
    }, []);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(error);
            }

            const data = await response.json();
            setApiToken(data.token);
            login();
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        }
    };

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-6">
                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col items-center gap-2">
                                <a
                                    href={`${import.meta.env.VITE_CLIENT_URL}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center gap-2 font-medium"
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md">
                                        <FlameKindling className="size-6" />
                                    </div>
                                    <span className="sr-only">Yeeet</span>
                                </a>
                                <h1 className="text-xl font-bold">Welcome to Yeeet!</h1>
                                <div className="text-center text-sm">
                                    Don&apos;t have an account?{" "}
                                    <a
                                        href={`${import.meta.env.VITE_CLIENT_URL}/register`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline underline-offset-4"
                                    >
                                        Sign up
                                    </a>
                                </div>
                            </div>
                            {error && (<p className="text-red-500 text-sm">{error}</p>)}
                            <div className="flex flex-col gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email (or username)</Label>
                                    <Input
                                        id="email"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        type="text"
                                        error={!!error}
                                        placeholder="jon.snow@example.com"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <div className="flex flex-col-reverse gap-2">
                                        <InputPassword
                                            id="password"
                                            value={password}
                                            error={!!error}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <div className="flex items-center">
                                            <Label htmlFor="password">Password</Label>
                                            <a
                                                href={`${import.meta.env.VITE_CLIENT_URL}/forgot-password`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-auto text-sm underline-offset-4 hover:underline"
                                            >
                                                Forgot your password?
                                            </a>
                                        </div>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full">
                                    Login
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}; 