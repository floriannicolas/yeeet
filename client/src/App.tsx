import { Routes, Route, Navigate, HashRouter } from 'react-router-dom';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectableRoute } from './components/ProtectableRoute';
import { Toaster } from "@/components/ui/toaster"
import { ForgotPassword } from './components/ForgotPassword';
import { ResetPassword } from './components/ResetPassword';
import { ProtectedHome } from './components/ProtectedHome';

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
              <ProtectedHome />
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
      <Toaster />
    </AuthProvider>
  );
}; 