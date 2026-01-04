import { useState, useEffect, useRef } from 'react';
import { FunctionsService } from '../services/functions-service';
import { Search, Loader2, Music, Disc } from 'lucide-react';

interface SearchResult {
    uri: string;
    name: string;
    artist?: string;
    owner?: string;
    imageUrl?: string;
    type: 'track' | 'playlist' | 'artist';
}

interface SpotifySearchProps {
    type: 'track' | 'playlist';
    placeholder?: string;
    onSelect: (result: SearchResult) => void;
    defaultValue?: string; // To show initial URI if needed, though usually we want the name
}

export const SpotifySearch = ({ type, placeholder, onSelect, defaultValue }: SpotifySearchProps) => {
    const [query, setQuery] = useState(defaultValue || '');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce logic manually here to avoid dep issues if hook missing
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length < 3) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const data = await FunctionsService.searchSpotify(query, type);
                setResults(data);
                setIsOpen(true);
            } catch {
                // Silent failure or handled by UI state if critical
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, type]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (item: SearchResult) => {
        setQuery(item.name); // Set input to name for display
        setIsOpen(false);
        onSelect(item);
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                    type="text"
                    className="form-input"
                    placeholder={placeholder || `Search ${type}s...`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                    style={{
                        width: '100%',
                        padding: '10px 10px 10px 40px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'white'
                    }}
                />
                {loading && (
                    <Loader2 className="animate-spin" size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    background: '#1e1e1e', // bg-surface-elevated
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    marginTop: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}>
                    {results.map((item) => (
                        <div
                            key={item.uri}
                            onClick={() => handleSelect(item)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 14px',
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {type === 'track' ? <Music size={20} color="#666" /> : <Disc size={20} color="#666" />}
                                </div>
                            )}

                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {type === 'track' ? item.artist : `by ${item.owner}`}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
