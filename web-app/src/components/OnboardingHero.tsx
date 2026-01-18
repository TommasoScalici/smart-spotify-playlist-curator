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
import { useSpotifyAuth } from '../hooks/useSpotifyAuth';
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
    <div className="relative overflow-hidden rounded-3xl w-full max-w-5xl bg-black/40 backdrop-blur-3xl border border-white/10 flex flex-col items-center justify-center p-6 md:p-12 text-center animate-in fade-in zoom-in-95 duration-1000 shadow-2xl">
      {/* Dynamic Ambient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 z-0" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-3xl space-y-10">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-1 ring-1 ring-primary/20 shadow-2xl shadow-primary/20 backdrop-blur-xl animate-bounce-subtle">
            <Music className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Elevate Your <span className="text-primary">Spotify Experience</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed font-medium opacity-80">
              Connect to unleash professional-grade playlist automation powered by AI.
            </p>
          </div>
        </div>

        {/* Feature Slideshow */}
        <div className="relative h-[160px] md:h-[140px] w-full max-w-2xl mx-auto">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={cn(
                'absolute inset-0 transition-all duration-700 flex flex-col items-center justify-center gap-4',
                idx === currentSlide
                  ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
                  : 'opacity-0 translate-y-4 pointer-events-none scale-95'
              )}
            >
              <div
                className={cn(
                  'p-4 rounded-full ring-1 shadow-lg',
                  feature.bg,
                  feature.color,
                  feature.border
                )}
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto italic opacity-90">
                  "{feature.description}"
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-2">
          {features.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-500',
                idx === currentSlide
                  ? 'w-8 bg-primary shadow-[0_0_10px_rgba(29,185,84,0.5)]'
                  : 'w-2 bg-white/20 hover:bg-white/40'
              )}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="pt-2 space-y-6">
          <Button
            onClick={login}
            size="lg"
            className="group relative px-10 py-7 text-lg font-bold bg-[#1DB954] hover:bg-[#1ed760] text-white shadow-[0_0_30px_rgba(29,185,84,0.3)] hover:shadow-[0_0_40px_rgba(29,185,84,0.6)] hover:scale-110 active:scale-95 transition-all duration-500 rounded-full overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="relative flex items-center gap-3">
              Connect Spotify Account
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
            </span>
          </Button>
          <div className="flex items-center justify-center gap-6 text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">
            <span className="flex items-center gap-2">
              <Zap className="h-3 w-3" /> Fully Automated
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-3 w-3" /> Secure OAuth
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3" /> Multi-Tenant
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
