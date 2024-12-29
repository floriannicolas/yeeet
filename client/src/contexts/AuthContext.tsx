import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { getApiToken, removeApiToken } from '@/utils/api-token';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: number | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/check-auth`, 
          { withCredentials: true, headers: { Authorization: `Bearer ${getApiToken()}` } }
        );
        setIsAuthenticated(response.data.isAuthenticated);
        setUserId(response.data.userId);
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

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, userId, login, logout }}>
      {!isLoading && children}
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