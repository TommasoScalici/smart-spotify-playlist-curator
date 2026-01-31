import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, Mic2, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';

import { AiGenerationConfig, SearchResult } from '@smart-spotify-curator/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { LabelWithTooltip } from '@/components/ui/label-with-tooltip';
import { NumberInput } from '@/components/ui/number-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { FunctionsService } from '../../../../services/functions-service';

interface ArtistSelectorProps {
  value: SearchResult[];
  onChange: (artists: SearchResult[]) => void;
  maxArtists?: number;
  playlistName: string;
  description?: string;
  aiConfig?: AiGenerationConfig;
}

export const ArtistSelector = ({
  value = [],
  onChange,
  maxArtists = 5,
  playlistName,
  description,
  aiConfig
}: ArtistSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [nToGenerate, setNToGenerate] = useState(3);
  const [temperature, setTemperature] = useState(0.7);

  useEffect(() => {
    if (!open) {
      setResults([]);
      setQuery('');
    }
  }, [open]);

  // ... (existing useEffect for open state)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query && query.trim().length >= 2) {
        setLoading(true);
        try {
          const data = await FunctionsService.searchSpotify(query, 'artist');
          setResults(data);
        } catch (error) {
          console.error('Artist search failed', error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (artist: SearchResult) => {
    if (value.some((v) => v.uri === artist.uri)) {
      // Already selected
      setOpen(false);
      return;
    }

    if (maxArtists && value.length >= maxArtists) {
      return;
    }

    onChange([...value, artist]);
    setOpen(false);
    setQuery('');
  };

  const handleRemove = (uri: string) => {
    onChange(value.filter((a) => a.uri !== uri));
  };

  const handleGenerate = async () => {
    if (!playlistName || playlistName.trim().length === 0) {
      toast.error('Please enter a playlist name first!');
      return;
    }
    setGenerating(true);
    try {
      // Allow user to override temperature locally for this suggestion
      const baseConfig: AiGenerationConfig = aiConfig || {
        enabled: true,
        tracksToAdd: 0,
        model: 'gpt-4o',
        temperature: 0.7,
        isInstrumentalOnly: false
      };

      const effectiveConfig = { ...baseConfig, temperature };

      const suggested = await FunctionsService.suggestReferenceArtists(
        playlistName,
        description,
        nToGenerate,
        effectiveConfig
      );

      const currentUris = new Set(value.map((v) => v.uri));
      const newArtists = suggested.filter((a) => !currentUris.has(a.uri));

      if (newArtists.length > 0) {
        const updated = [...value, ...newArtists].slice(0, maxArtists);
        onChange(updated);
        toast.success(`AI suggested ${newArtists.length} artists!`);
      } else {
        toast.info('AI suggested artists that were already selected.');
      }
    } catch (error) {
      console.error('Suggest artists failed', error);
      toast.error('Failed to auto-suggest artists.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Pills Container */}
      <div className="flex flex-wrap gap-2">
        {value.map((artist) => (
          <Badge
            key={artist.uri}
            variant="secondary"
            className="hover:bg-secondary/80 flex h-8 items-center gap-1.5 pr-2 pl-1 text-sm font-medium transition-all"
          >
            {artist.imageUrl ? (
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="bg-muted flex h-6 w-6 items-center justify-center rounded-full">
                <Mic2 className="h-3 w-3 opacity-50" />
              </div>
            )}
            {artist.name}
            <button
              onClick={() => handleRemove(artist.uri)}
              className="hover:text-destructive ml-1 focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {value.length === 0 && (
          <span className="text-muted-foreground py-1 text-sm italic">
            No reference artists selected.
          </span>
        )}
      </div>

      {/* AI Discovery Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            handleGenerate();
          }}
          disabled={generating || value.length >= maxArtists}
          className="text-primary hover:bg-primary/10 w-full font-bold transition-all sm:w-auto"
        >
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Auto-Suggest Artists
        </Button>

        <div className="flex flex-wrap items-center justify-end gap-4">
          <div className="flex items-center gap-2">
            <LabelWithTooltip
              htmlFor="ai-count"
              tooltip="Controls how many new artists the AI will suggest."
              className="text-muted-foreground text-xs font-medium"
            >
              Count:
            </LabelWithTooltip>
            <NumberInput
              id="ai-count"
              min={1}
              max={20}
              value={nToGenerate}
              onChange={(val) => setNToGenerate(val)}
              className="w-32"
            />
          </div>

          <div className="flex items-center gap-2">
            <LabelWithTooltip
              htmlFor="ai-temp"
              tooltip="Creativity (Temperature). Higher values = more random/diverse suggestions."
              className="text-muted-foreground text-xs font-medium"
            >
              Temp:
            </LabelWithTooltip>
            <NumberInput
              id="ai-temp"
              min={0}
              max={1}
              step={0.1}
              value={temperature}
              onChange={(val) => setTemperature(val)}
              className="w-32"
            />
          </div>
        </div>
      </div>

      {/* Search Input */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={value.length >= maxArtists}
            className="w-full justify-between border-dashed bg-transparent"
          >
            {value.length >= maxArtists
              ? `Max ${maxArtists} artists selected`
              : 'Add reference artist...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="border-primary/20 w-[85vw] overflow-hidden p-0 shadow-2xl sm:w-[400px]"
          align="start"
        >
          <Command shouldFilter={false} className="rounded-none">
            <CommandInput
              placeholder="Search Spotify artists..."
              value={query}
              onValueChange={setQuery}
              className="h-12"
            />
            <CommandList className="max-h-[400px]">
              {loading && (
                <div className="text-muted-foreground flex items-center justify-center py-6 text-sm">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching Spotify...
                </div>
              )}
              {!loading && results.length === 0 && query.length >= 2 && (
                <CommandEmpty>No artists found.</CommandEmpty>
              )}

              <CommandGroup>
                {results.map((artist) => {
                  const isSelected = value.some((v) => v.uri === artist.uri);
                  return (
                    <CommandItem
                      key={artist.uri}
                      value={artist.uri}
                      onSelect={() => handleSelect(artist)}
                      className="aria-selected:bg-primary/5 flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors data-disabled:pointer-events-auto data-disabled:opacity-100"
                    >
                      <div
                        className={cn(
                          'border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                          isSelected ? 'bg-primary text-primary-foreground' : 'opacity-0'
                        )}
                      >
                        <Check
                          className={cn('h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
                        />
                      </div>

                      <div className="flex w-full items-center gap-3">
                        {artist.imageUrl ? (
                          <img
                            src={artist.imageUrl}
                            alt={artist.name}
                            className="bg-muted h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                            <Mic2 className="h-5 w-5 opacity-50" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">{artist.name}</span>
                          <span className="text-muted-foreground text-xs">
                            Popularity: {artist.popularity}%
                          </span>
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
