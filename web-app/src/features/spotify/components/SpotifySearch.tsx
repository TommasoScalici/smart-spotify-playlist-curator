import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Disc, Loader2, Music } from 'lucide-react';

import { SearchResult } from '@smart-spotify-curator/shared';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { FunctionsService } from '../../../services/functions-service';

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
          className="bg-background/50 hover:bg-background/80 border-border/50 h-12 w-full justify-between text-left font-normal"
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
              <div className="text-muted-foreground py-6 text-center text-sm">Searching...</div>
            )}

            {!loading && results.length === 0 && query.length >= 3 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            <CommandGroup>
              {results.map((item) => (
                <CommandItem
                  key={item.uri}
                  value={`${item.name} - ${item.uri}`}
                  onSelect={() => {
                    handleSelect(item);
                  }}
                  className="aria-selected:bg-accent aria-selected:text-accent-foreground cursor-pointer data-disabled:pointer-events-auto data-disabled:opacity-100"
                >
                  <div className="flex w-full items-center gap-3 overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="bg-muted h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded">
                        {type === 'track' ? (
                          <Music className="h-4 w-4" />
                        ) : (
                          <Disc className="h-4 w-4" />
                        )}
                      </div>
                    )}
                    <div className="flex flex-col overflow-hidden text-left">
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {type === 'track' ? item.artist : `by ${item.owner}`}
                      </span>
                    </div>
                  </div>
                  <Check
                    className={cn(
                      'text-primary ml-auto h-4 w-4 shrink-0',
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
