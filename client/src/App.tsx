import { Routes, Route, Navigate, HashRouter } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Home } from './components/Home';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectableRoute } from './components/ProtectableRoute';
import { Toaster } from "@/components/ui/sonner"

export const App = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={
            <ProtectableRoute>
              <Login />
            </ProtectableRoute>
          } />
          <Route path="/register" element={
            <ProtectableRoute>
              <Register />
            </ProtectableRoute>
          } />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
      <Toaster />
    </AuthProvider>
  );
}; 