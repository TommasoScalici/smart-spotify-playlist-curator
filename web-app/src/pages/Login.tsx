import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  if (user) {
    navigate('/');
    return null;
  }

  const handleLogin = async () => {
    try {
      await signIn();
      navigate('/');
    } catch {
      setError('Failed to log in. Please try again.');
      // Handle error (e.g. toast) but no console log
      // console.error(error);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="glass-panel login-card animate-fade-in">
        <div className="login-icon">🎧</div>

        <h1 className="login-title">
          Smart <span className="text-gradient">Curator</span>
        </h1>

        <p className="login-subtitle">
          Automate your Spotify playlists with the power of fit-for-vibe AI.
        </p>

        {error && <div className="error-message">{error}</div>}

        <button onClick={handleLogin} className="btn-primary btn-full-width">
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
