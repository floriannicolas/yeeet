import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Home } from './components/Home';
import { Command } from '@tauri-apps/plugin-shell';
import { LoaderCircle } from 'lucide-react';
import './styles/global.css';
import { Toaster } from "@/components/ui/toaster";
import { enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { useEffect } from 'react';
import {
  info as infoLog,
  error as errorLog,
} from '@tauri-apps/plugin-log';
import { setScreenshotPathIfNull } from './utils/settings';

const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 text-muted-foreground gap-3">
        <LoaderCircle className="animate-spin" /> Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/" element={isAuthenticated ? <Home /> : <Navigate to="/login" replace />} />
    </Routes>
  );
};

function App() {
  const enableAutostartIfNotEnabled = async () => {
    try {
      if (import.meta.env.VITE_ENV === 'development') {
        infoLog("Development mode, no autostart");
        return;
      }

      const enabled = await isEnabled();
      if (!enabled) {
        await enable();
        infoLog("Autostart enabled");
      } else {
        infoLog("Autostart already enabled");
      }
    } catch (error) {
      errorLog("Error enabling autostart :: " + error);
    }
  };

  const getDefaultScreenCaptureLocation = async () => {
    const result = await Command.create('run-read-default-screencapture').execute();
    console.log('getDefaultScreenCaptureLocation', result.stdout);
    const correctedData = result.stdout
      .replace(/=/g, ":")
      .replace(/;\s*(?=[}\]])/g, "")
      .replace(/;\s*/g, ",") 
      .replace(/(\b[a-zA-Z0-9_-]+)\s*:/g, '"$1":')
      .replace(/:\s*([a-zA-Z0-9_-]+)\b/g, ': "$1"');

    try {
      const jsonData = JSON.parse(correctedData);
      const location = jsonData.location.replace('~', '$HOME');
      infoLog(`Default MacOS screencapture location detected: ${jsonData.location}`);
      setScreenshotPathIfNull(location);
    } catch (error) {
      errorLog("Error getting default screencapture location :: " + error);
    }
  }

  useEffect(() => {
    enableAutostartIfNotEnabled();
    getDefaultScreenCaptureLocation();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
