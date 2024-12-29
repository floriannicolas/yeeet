import { FormEvent, useState } from 'react';
import { FlameKindling } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputPassword } from "@/components/ui/input-password"
import { Label } from "@/components/ui/label"
import { Helmet } from "react-helmet";
import { setApiToken } from '@/utils/api-token';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/login`, {
        username,
        password,
      }, {
      });
      setApiToken(response.data.token);
      login();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data || 'Invalid credentials');
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <Helmet>
        <title>Login - Yeeet</title>
      </Helmet>
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link to="/" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FlameKindling className="size-4" />
            </div>
            Yeeet
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Login to your account</h1>
                <p className="text-balance text-sm text-muted-foreground">
                  Enter your email or your username below to login to your account
                </p>
              </div>
              {error && <p className="text-red-500 mb-4">{error}</p>}
              <div className="grid gap-6">
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
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" className="ml-auto text-sm underline-offset-4 hover:underline">
                      Forgot your password?
                    </Link>
                  </div>
                  <InputPassword
                    id="password"
                    value={password}
                    error={!!error}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Login
                </Button>
              </div>
              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link to="/register" className="underline underline-offset-4">
                  Sign up
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block p-10 lg:flex">
        <img
          src="/login-bg.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.5] dark:grayscale"
        />
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">“Yeeet has saved me countless hours of work by helping me share screenshots faster than ever before.”</p>
            <footer className="text-sm">Eric Martin</footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}; 