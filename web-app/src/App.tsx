import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './components/common/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import Login from './features/auth/pages/LoginPage';
import SpotifyCallback from './features/auth/pages/SpotifyCallbackPage';
import './App.css';
import Dashboard from './features/dashboard/pages/DashboardPage';
import EditPlaylist from './features/playlists/pages/PlaylistEditorPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Login />} path="/login" />

          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route element={<Dashboard />} path="/" />
            <Route element={<SpotifyCallback />} path="/callback" />
            <Route element={<EditPlaylist />} path="/playlist/:id" />
          </Route>

          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
