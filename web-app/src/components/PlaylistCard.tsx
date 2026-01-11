import { useNavigate } from 'react-router-dom';
import { PlaylistConfig } from '@smart-spotify-curator/shared';
import { Edit2, Music } from 'lucide-react';
import { RunButton } from './RunButton';

interface PlaylistCardProps {
  config: PlaylistConfig & { _docId: string };
}

export const PlaylistCard = ({ config }: PlaylistCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      className="glass-panel status-card"
      style={{ height: 'auto', minHeight: '220px', alignItems: 'flex-start', textAlign: 'left' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {config.imageUrl ? (
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                flexShrink: 0
              }}
            >
              <img
                src={config.imageUrl}
                alt={config.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '8px',
                background: 'rgba(29, 185, 84, 0.1)',
                color: '#1DB954',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Music size={32} />
            </div>
          )}
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', lineHeight: '1.2' }}>{config.name}</h3>
            {config.owner && (
              <div
                style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}
              >
                by {config.owner}
              </div>
            )}
            <span
              style={{
                fontSize: '0.75rem',
                color: config.enabled ? '#1DB954' : 'var(--text-secondary)',
                background: config.enabled ? 'rgba(29, 185, 84, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                padding: '2px 8px',
                borderRadius: '99px',
                marginTop: '6px',
                display: 'inline-block',
                fontWeight: 500
              }}
            >
              {config.enabled ? 'Active' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          marginBottom: '24px',
          lineHeight: '1.5',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}
      >
        {config.settings.description || 'No description provided.'}
      </p>

      <div
        style={{
          marginTop: 'auto',
          width: '100%',
          display: 'flex',
          gap: '12px',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '16px'
        }}
      >
        <button
          onClick={() => navigate(`/playlist/${config._docId}`)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'var(--bg-surface-elevated)',
            color: 'var(--text-primary)',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '0.9rem'
          }}
          className="hover-btn"
        >
          <Edit2 size={16} />
          Edit
        </button>

        <RunButton playlistId={config.id} iconOnly={true} />
      </div>
    </div>
  );
};
