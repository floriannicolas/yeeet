import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FlameKindling } from 'lucide-react';
import { Button } from "@/components/ui/button";

export const Home = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3000/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };


  return (
    <div className="flex min-h-svh flex-col items-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center gap-2 md:justify-start">
          <a
            href="http://localhost:5173/"
            target="_blank"
            rel="noopener noreferrer" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FlameKindling className="size-4" />
            </div>
            Yeeet
          </a>
          <div className="flex items-center gap-2 font-medium ml-auto">
            <Button onClick={handleLogout}>Logout</Button>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-2">
              <a
                href="http://localhost:5173/"
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
                You are logged in.
              </div>
              <Button onClick={handleLogout} className="w-full">Logout</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 