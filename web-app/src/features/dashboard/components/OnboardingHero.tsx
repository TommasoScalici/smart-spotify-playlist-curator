import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Music,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { useSpotifyAuth } from '../../../hooks/useSpotifyAuth';

export const OnboardingHero = () => {
  const { login } = useSpotifyAuth();
  const [currentSlide, setCurrentSlide] = useState(0);

  const features = [
    {
      title: 'AI Smart Curation',
      description:
        'Powered by Gemini, we analyze your vibe to orchestrate the perfect sonic journey.',
      icon: Sparkles,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20'
    },
    {
      title: 'VIP Track Pinning',
      description:
        'Secure "must-have" tracks in specific slots. Your favorites, exactly where they belong.',
      icon: Trophy,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20'
    },
    {
      title: 'Artist Fatigue Prevention',
      description:
        'Intelligent spacing prevents repetitive artists, keeping your listening experience fresh.',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    {
      title: 'Automated Health Check',
      description:
        'Daily maintenance removes duplicates and fills gaps using advanced logical rules.',
      icon: ShieldCheck,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev: number) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [features.length]);

  return (
    <div className="bg-card/80 dark:bg-card/95 border-border/50 animate-in fade-in zoom-in-95 relative mx-4 my-auto flex min-h-[500px] w-full max-w-4xl flex-col items-center overflow-hidden rounded-3xl border-2 p-6 text-center shadow-2xl ring-1 ring-black/5 backdrop-blur-3xl transition-all duration-1000 sm:mx-auto sm:min-h-fit sm:p-8 md:p-10 dark:ring-white/5">
      {/* Dynamic Ambient Background */}
      <div className="from-primary/10 via-background to-secondary/10 absolute inset-0 z-0 bg-linear-to-br" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl space-y-6 md:space-y-8">
        <div className="space-y-3 md:space-y-4">
          <div className="bg-primary/10 text-primary ring-primary/20 shadow-primary/20 animate-bounce-subtle mb-1 inline-flex items-center justify-center rounded-2xl p-3 shadow-2xl ring-1 backdrop-blur-xl">
            <Music className="h-7 w-7 md:h-8 md:w-8" />
          </div>
          <div className="space-y-2 px-2">
            <h1 className="text-foreground text-2xl leading-[1.1] font-black tracking-tight sm:text-3xl md:text-4xl">
              Elevate Your <span className="text-primary">Spotify Experience</span>
            </h1>
            <p className="text-foreground/70 mx-auto max-w-md text-sm leading-relaxed font-medium sm:text-base md:text-lg">
              Connect to unleash professional-grade playlist automation powered by AI.
            </p>
          </div>
        </div>

        {/* Feature Slideshow */}
        <div className="relative mx-auto flex min-h-[120px] w-full max-w-xl items-center justify-center md:min-h-[140px]">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={cn(
                'absolute inset-0 flex flex-col items-center justify-center gap-1 transition-all duration-700 md:gap-3',
                idx === currentSlide
                  ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                  : 'pointer-events-none translate-y-4 scale-95 opacity-0'
              )}
            >
              <div
                className={cn(
                  'shrink-0 rounded-full p-3 shadow-lg ring-1 md:p-4',
                  feature.bg,
                  feature.color,
                  feature.border
                )}
              >
                <feature.icon className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <div className="space-y-1 px-4">
                <h3 className="text-foreground text-base font-bold tracking-tight md:text-xl">
                  {feature.title}
                </h3>
                <p className="text-foreground/60 mx-auto max-w-sm text-xs leading-tight italic md:text-sm">
                  "{feature.description}"
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-2.5 md:gap-3">
          {features.map((_, idx) => (
            <Button
              key={idx}
              variant="ghost"
              size="sm"
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={cn(
                'h-2 rounded-full p-0 transition-all duration-500 hover:scale-110 active:scale-95 md:h-2.5',
                idx === currentSlide
                  ? 'bg-primary ring-primary/30 w-8 shadow-[0_0_20px_hsl(var(--primary)/0.8)] ring-2 md:w-10'
                  : 'bg-foreground/30 hover:bg-foreground/50 w-2 shadow-md md:w-2.5 dark:bg-white/40 dark:hover:bg-white/60'
              )}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-4 pt-4 md:space-y-6 md:pt-6">
          <Button
            onClick={login}
            className="group bg-primary hover:bg-primary/90 text-primary-foreground relative h-12 w-full overflow-hidden rounded-full px-8 text-base font-bold shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] active:scale-95 sm:w-auto md:h-13 md:px-10 md:text-lg"
          >
            <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-1000 group-hover:translate-x-full" />
            <span className="relative flex items-center justify-center gap-2">
              Connect Spotify Account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Button>

          <div className="text-foreground/50 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 text-[10px] font-bold tracking-widest uppercase md:gap-x-6 md:text-xs">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Zap className="h-3 w-3" /> Fully Automated
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className="h-3 w-3" /> Secure OAuth
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <CheckCircle2 className="h-3 w-3" /> Multi-Tenant
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
