import { useState, useEffect } from 'react';
import { FunctionsService } from '../services/functions-service';
import { Loader2, Music, Disc, Check, ChevronsUpDown } from 'lucide-react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  defaultValue?: string;
}

export const SpotifySearch = ({
  type,
  placeholder,
  onSelect,
  defaultValue
}: SpotifySearchProps) => {
  const [query, setQuery] = useState(defaultValue || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Debounce logic
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

  const handleSelect = (item: SearchResult) => {
    setQuery(item.name);
    setOpen(false);
    onSelect(item);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 text-left font-normal bg-background/50 hover:bg-background/80 border-border/50"
        >
          {query ? (
            <span className="truncate">{query}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder || `Search ${type}s...`}</span>
          )}
          {loading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          {/* We use shouldFilter={false} because the API already filters for us */}
          <CommandInput
            placeholder={`Type to search ${type}s...`}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
            )}

            {!loading && results.length === 0 && query.length >= 3 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            <CommandGroup>
              {results.map((item) => (
                <CommandItem
                  key={item.uri}
                  value={item.uri} // Value must be unique-ish
                  onSelect={() => handleSelect(item)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3 w-full overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-8 w-8 rounded object-cover bg-muted"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                        {type === 'track' ? (
                          <Music className="h-4 w-4" />
                        ) : (
                          <Disc className="h-4 w-4" />
                        )}
                      </div>
                    )}
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {type === 'track' ? item.artist : `by ${item.owner}`}
                      </span>
                    </div>
                  </div>
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4',
                      query === item.name ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
