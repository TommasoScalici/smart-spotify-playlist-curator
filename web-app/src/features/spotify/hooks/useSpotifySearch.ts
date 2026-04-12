import { SearchResult } from '@smart-spotify-curator/shared';
import { useEffect, useState } from 'react';

import { FunctionsService } from '@/services/functions-service';

interface UseSpotifySearchProps {
  defaultValue?: string;
  type: 'playlist' | 'track';
}

export function useSpotifySearch({ defaultValue, type }: UseSpotifySearchProps) {
  const [query, setQuery] = useState(defaultValue || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query && query.trim().length >= 3) {
        setLoading(true);
        try {
          const data = await FunctionsService.searchSpotify(query, type);
          setResults(data);
          if (data.length > 0) setOpen(true);
        } catch (error) {
          console.error('Search failed', error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, type]);

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  return {
    clearSearch,
    loading,
    open,
    query,
    results,
    setOpen,
    setQuery
  };
}
