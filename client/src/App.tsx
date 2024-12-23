import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
      <BrowserRouter>
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
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  );
}; 