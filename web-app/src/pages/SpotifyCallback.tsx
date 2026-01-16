import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FunctionsService } from '../services/functions-service';
import { useAuth } from '../contexts/AuthContext';

export default function SpotifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const code = searchParams.get('code');
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(() => {
    return code ? 'processing' : 'error';
  });
  const [errorMsg, setErrorMsg] = useState(() => {
    return code ? '' : 'No authentication code received from Spotify.';
  });

  useEffect(() => {
    // Code is checked in initial state. If status is error, do nothing.
    if (status === 'error' && !code) {
      return;
    }

    if (!code) {
      return;
    }

    if (!user) {
      return;
    }

    const linkAccount = async () => {
      try {
        const redirectUri = window.location.origin + '/callback';
        await FunctionsService.linkSpotifyAccount(code, redirectUri);
        setStatus('success');
        setTimeout(() => navigate('/'), 1500);
      } catch (error) {
        console.error('Linking failed', error);
        setStatus('error');
        setErrorMsg('Failed to link account. Please try again.');
      }
    };

    if (status === 'processing') {
      linkAccount();
    }
  }, [code, user, navigate, status]);

  return (
    <div className="login-wrapper">
      <div className="glass-panel text-center animate-fade-in" style={{ padding: '3rem' }}>
        {status === 'processing' && (
          <>
            <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
            <h2>Linking Spotify...</h2>
            <p className="text-secondary">Please wait while we secure your connection.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2>Success!</h2>
            <p className="text-secondary">Your account has been linked.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
            <h2>Linking Failed</h2>
            <p className="text-error">{errorMsg}</p>
            <button
              onClick={() => navigate('/')}
              className="btn-secondary"
              style={{ marginTop: '1rem' }}
            >
              Back to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
