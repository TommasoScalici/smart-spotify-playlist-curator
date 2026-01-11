import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { FunctionsService } from '../services/functions-service';

interface RunButtonProps {
  playlistId?: string;
  iconOnly?: boolean;
  className?: string; // Allow custom styling
}

export const RunButton = ({ playlistId, iconOnly = false, className = '' }: RunButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleRun = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    const confirmMsg = playlistId
      ? 'Run curation for this playlist?'
      : 'Run global curation for ALL playlists?';

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      await FunctionsService.triggerCuration(playlistId);
      alert('Curation triggered successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Error handled by parent or silence
      // console.error(error); // Removed for strict linting
      alert(`Failed to trigger curation: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  if (iconOnly) {
    return (
      <button
        onClick={handleRun}
        disabled={loading}
        className={`hover-btn ${className}`}
        style={{
          background: 'rgba(29, 185, 84, 0.1)',
          color: '#1DB954',
          padding: '10px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: loading ? 'not-allowed' : 'pointer',
          border: '1px solid rgba(29, 185, 84, 0.2)',
          transition: 'all 0.2s',
          ...(loading ? { opacity: 0.7 } : {})
        }}
        title="Trigger Curation"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
      </button>
    );
  }

  return (
    <button
      className={`btn-primary ${className}`}
      onClick={handleRun}
      disabled={loading}
      style={{ display: 'flex', gap: '8px', alignItems: 'center', opacity: loading ? 0.7 : 1 }}
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
      <span>{playlistId ? 'Run' : 'Run All'}</span>
    </button>
  );
};
