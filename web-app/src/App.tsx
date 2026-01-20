import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SpotifyCallback from './pages/SpotifyCallback';
import './App.css';

import EditPlaylist from './pages/EditPlaylist';

import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/callback" element={<SpotifyCallback />} />
            <Route path="/playlist/:id" element={<EditPlaylist />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
