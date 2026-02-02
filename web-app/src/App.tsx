import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './components/common/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import EditPlaylist from './pages/EditPlaylist';
import './App.css';
import Login from './pages/Login';
import SpotifyCallback from './pages/SpotifyCallback';

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
