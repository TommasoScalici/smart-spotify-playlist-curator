import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Music,
  CheckCircle2,
  Zap,
  ArrowRight,
  Sparkles,
  Trophy,
  Users,
  ShieldCheck
} from 'lucide-react';
import { useSpotifyAuth } from '../../../hooks/useSpotifyAuth';
import { cn } from '@/lib/utils';

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
    <div className="relative overflow-hidden rounded-3xl w-full max-w-4xl bg-card/80 dark:bg-card/95 backdrop-blur-3xl border-2 border-border/50 shadow-2xl flex flex-col items-center p-6 sm:p-8 md:p-10 text-center animate-in fade-in zoom-in-95 duration-1000 transition-all min-h-[500px] sm:min-h-fit mx-4 sm:mx-auto my-auto ring-1 ring-black/5 dark:ring-white/5">
      {/* Dynamic Ambient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 z-0" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl space-y-6 md:space-y-8">
        <div className="space-y-3 md:space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-1 ring-1 ring-primary/20 shadow-2xl shadow-primary/20 backdrop-blur-xl animate-bounce-subtle">
            <Music className="h-7 w-7 md:h-8 md:w-8" />
          </div>
          <div className="space-y-2 px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-[1.1] text-foreground">
              Elevate Your <span className="text-primary">Spotify Experience</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-md mx-auto leading-relaxed font-medium">
              Connect to unleash professional-grade playlist automation powered by AI.
            </p>
          </div>
        </div>

        {/* Feature Slideshow */}
        <div className="relative min-h-[120px] md:min-h-[140px] w-full max-w-xl mx-auto flex items-center justify-center">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={cn(
                'absolute inset-0 transition-all duration-700 flex flex-col items-center justify-center gap-1 md:gap-3',
                idx === currentSlide
                  ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
                  : 'opacity-0 translate-y-4 pointer-events-none scale-95'
              )}
            >
              <div
                className={cn(
                  'p-3 md:p-4 rounded-full ring-1 shadow-lg shrink-0',
                  feature.bg,
                  feature.color,
                  feature.border
                )}
              >
                <feature.icon className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <div className="space-y-1 px-4">
                <h3 className="text-base md:text-xl font-bold tracking-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="text-foreground/60 text-xs md:text-sm max-w-sm mx-auto italic leading-tight">
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
                'p-0 h-2 md:h-2.5 rounded-full transition-all duration-500 hover:scale-110 active:scale-95',
                idx === currentSlide
                  ? 'w-8 md:w-10 bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.8)] ring-2 ring-primary/30'
                  : 'w-2 md:w-2.5 bg-foreground/30 dark:bg-white/40 hover:bg-foreground/50 dark:hover:bg-white/60 shadow-md'
              )}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="pt-4 md:pt-6 space-y-4 md:space-y-6">
          <Button
            onClick={login}
            className="group relative w-full sm:w-auto h-12 md:h-13 px-8 md:px-10 text-base md:text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:scale-105 active:scale-95 transition-all duration-300 rounded-full overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="relative flex items-center justify-center gap-2">
              Connect Spotify Account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-x-4 md:gap-x-6 gap-y-2 text-[10px] md:text-xs text-foreground/50 uppercase tracking-widest font-bold px-4">
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
