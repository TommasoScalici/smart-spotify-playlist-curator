import { AiGenerationConfig, SearchResult } from '@smart-spotify-curator/shared';
import { Check, ChevronsUpDown, Loader2, Mic2, Wand2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
  aiConfig?: AiGenerationConfig;
  description?: string;
  maxArtists?: number;
  onChange: (artists: SearchResult[]) => void;
  playlistName: string;
  value: SearchResult[];
}

export const ArtistSelector = ({
  aiConfig,
  description,
  maxArtists = 20,
  onChange,
  playlistName,
  value = []
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
        isInstrumentalOnly: false,
        model: 'gpt-4o',
        temperature: 0.7,
        tracksToAdd: 0
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
            className="hover:bg-secondary/80 flex h-8 items-center gap-1.5 pr-2 pl-1 text-sm font-medium transition-all"
            key={artist.uri}
            variant="secondary"
          >
            {artist.imageUrl ? (
              <img
                alt={artist.name}
                className="h-6 w-6 rounded-full object-cover"
                src={artist.imageUrl}
              />
            ) : (
              <div className="bg-muted flex h-6 w-6 items-center justify-center rounded-full">
                <Mic2 className="h-3 w-3 opacity-50" />
              </div>
            )}
            {artist.name}
            <button
              className="hover:text-destructive ml-1 focus:outline-none"
              onClick={() => handleRemove(artist.uri)}
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
          className="text-primary hover:bg-primary/10 w-full font-bold transition-all sm:w-auto"
          disabled={generating || value.length >= maxArtists}
          onClick={(e) => {
            e.preventDefault();
            handleGenerate();
          }}
          size="sm"
          type="button"
          variant="secondary"
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
              className="text-muted-foreground text-xs font-medium"
              htmlFor="ai-count"
              tooltip="Controls how many new artists the AI will suggest."
            >
              Count:
            </LabelWithTooltip>
            <NumberInput
              className="w-32"
              id="ai-count"
              max={20}
              min={1}
              onChange={(val) => setNToGenerate(val)}
              value={nToGenerate}
            />
          </div>

          <div className="flex items-center gap-2">
            <LabelWithTooltip
              className="text-muted-foreground text-xs font-medium"
              htmlFor="ai-temp"
              tooltip="Creativity (Temperature). Higher values = more random/diverse suggestions."
            >
              Temperature:
            </LabelWithTooltip>
            <NumberInput
              className="w-40"
              id="ai-temp"
              max={1}
              min={0}
              onChange={(val) => setTemperature(val)}
              step={0.1}
              value={temperature}
            />
          </div>
        </div>
      </div>

      {/* Search Input */}
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            aria-expanded={open}
            className="w-full justify-between border-dashed bg-transparent"
            disabled={value.length >= maxArtists}
            role="combobox"
            variant="outline"
          >
            {value.length >= maxArtists
              ? `Max ${maxArtists} artists selected`
              : 'Add reference artist...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="border-primary/20 w-[85vw] overflow-hidden p-0 shadow-2xl sm:w-[400px]"
        >
          <Command className="rounded-none" shouldFilter={false}>
            <CommandInput
              className="h-12"
              onValueChange={setQuery}
              placeholder="Search Spotify artists..."
              value={query}
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
                      className="aria-selected:bg-primary/5 flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors data-disabled:pointer-events-auto data-disabled:opacity-100"
                      key={artist.uri}
                      onSelect={() => handleSelect(artist)}
                      value={artist.uri}
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
                            alt={artist.name}
                            className="bg-muted h-10 w-10 rounded-full object-cover"
                            src={artist.imageUrl}
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
