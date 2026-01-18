import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Music, CheckCircle2, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { useSpotifyAuth } from '../hooks/useSpotifyAuth';

export const OnboardingHero = () => {
  const { login } = useSpotifyAuth();

  const benefits = [
    { icon: Zap, label: 'Automated Playlist Curation' },
    { icon: Sparkles, label: 'AI-Powered Recommendations' },
    { icon: CheckCircle2, label: 'Safe & Secure Connection' }
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl w-full max-w-6xl bg-black/40 backdrop-blur-2xl border border-white/10 flex flex-col items-center justify-center p-8 md:p-24 text-center animate-in fade-in zoom-in-95 duration-700 shadow-2xl">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20 z-0" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0"></div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-2 ring-1 ring-primary/20 shadow-lg shadow-primary/10 backdrop-blur-sm">
            <Music className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 pb-2">
            Unlock Your Music Potential
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Connect your Spotify account to let our AI curate the perfect soundtrack for your life.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {benefits.map((bg, idx) => (
            <Card
              key={idx}
              className="bg-card/30 backdrop-blur-md border border-white/10 p-4 flex flex-col items-center text-center gap-2 hover:bg-card/50 transition-colors"
            >
              <bg.icon className="h-5 w-5 text-secondary" />
              <span className="font-semibold text-sm">{bg.label}</span>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="pt-4">
          <Button
            onClick={login}
            size="lg"
            className="group relative px-8 py-6 text-lg font-bold bg-[#1DB954] hover:bg-[#1ed760] text-white shadow-[0_0_20px_rgba(29,185,84,0.3)] hover:shadow-[0_0_30px_rgba(29,185,84,0.5)] hover:scale-105 transition-all duration-300 rounded-full"
          >
            Connect Spotify Account
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            We respect your privacy. No data is shared with third parties.
          </p>
        </div>
      </div>
    </div>
  );
};
