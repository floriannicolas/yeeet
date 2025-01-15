import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import axios from 'axios';
import { getApiToken, removeApiToken } from '@/utils/api-token';
import { LoaderCircle } from 'lucide-react';
import { Helmet } from 'react-helmet';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: number | null;
  lastAppVersion: string | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadingTitleRef = useRef<string>('Loading...');
  const [lastAppVersion, setLastAppVersion] = useState(null);
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/check-auth`,
          { headers: { Authorization: `Bearer ${getApiToken()}` } }
        );
        setIsAuthenticated(response.data.isAuthenticated);
        setUserId(response.data.userId);
        setLastAppVersion(response.data.lastAppVersion);
      } catch (error) {
        setIsAuthenticated(false);
        removeApiToken();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = () => setIsAuthenticated(true);
  const logout = () => setIsAuthenticated(false);

  useEffect(() => {
    const intervalId = setInterval(() => {
      switch (loadingTitleRef.current) {
        case 'Loading':
          loadingTitleRef.current = 'Loading.';
          break;
        case 'Loading.':
          loadingTitleRef.current = 'Loading..';
          break;
        case 'Loading..':
          loadingTitleRef.current = 'Loading...';
          break;
        case 'Loading...':
          loadingTitleRef.current = 'Loading';
          break;
        default:
          loadingTitleRef.current = 'Loading...';
          break;
      }
    }, 800);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, userId, lastAppVersion, login, logout }}>
      {!isLoading && children}
      {isLoading && (
        <>
          <Helmet>
            <title>{loadingTitleRef.current}</title>
          </Helmet>
          <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 text-muted-foreground gap-3">
            <LoaderCircle className="animate-spin" /> Loading...
          </div>
        </>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};