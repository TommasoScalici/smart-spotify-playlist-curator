import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Music, Settings, Play, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TutorialDialog = ({ open, onOpenChange }: TutorialDialogProps) => {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  // Prevent scrolling when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      onOpenChange(false);
      navigate('/playlist/new');
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 duration-300 animate-in fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog Content */}
      <div className="relative z-10 w-full max-w-[500px] overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-20 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground text-white/50 hover:text-white"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header Image / Gradient */}
        <div className="h-32 bg-gradient-to-br from-primary/20 via-background to-secondary/20 relative flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          {step === 1 && <Music className="h-16 w-16 text-primary/40 animate-pulse" />}
          {step === 2 && <Settings className="h-16 w-16 text-secondary/40 animate-spin-slow" />}
          {step === 3 && <Sparkles className="h-16 w-16 text-tertiary/40 animate-bounce" />}
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-2xl font-bold tracking-tight">
              {step === 1 && 'Welcome to Smart Curator'}
              {step === 2 && 'How It Works'}
              {step === 3 && 'Ready to Automate?'}
            </h2>
            <p className="text-muted-foreground">
              {step === 1 &&
                'Your personal AI music editor. Let’s set up your first automated playlist in seconds.'}
              {step === 2 && 'Build your perfect flow with simple rules:'}
              {step === 3 &&
                'Launch your first curator job and let the AI handle the rest. You just listen.'}
            </p>
          </div>

          {/* Step 2 Content: Workflow Icons */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-3 rounded-lg bg-accent/10 border border-white/5">
                <div className="p-2 rounded bg-primary/10 text-primary shrink-0">
                  <Music className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">1. Select a Playlist</h4>
                  <p className="text-xs text-muted-foreground">
                    Choose one of your existing playlists as the target.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-lg bg-accent/10 border border-white/5">
                <div className="p-2 rounded bg-secondary/10 text-secondary shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">2. Define Rules</h4>
                  <p className="text-xs text-muted-foreground">
                    Set AI prompts, max track age, and VIP tracks.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-lg bg-accent/10 border border-white/5">
                <div className="p-2 rounded bg-tertiary/10 text-tertiary shrink-0">
                  <Play className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">3. Run Automation</h4>
                  <p className="text-xs text-muted-foreground">
                    The AI updates your playlist automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 Content: Checklist */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />{' '}
                <span>Connect Spotify Account</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> <span>Grant Permissions</span>
              </div>
              <div className="flex items-center gap-2 text-sm opacity-50">
                <div className="h-4 w-4 rounded-full border border-current" />{' '}
                <span>Create First Playlist</span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            {/* Stepper Dots */}
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === step ? 'w-6 bg-primary' : 'w-2 bg-muted'
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              className="gap-2 shadow-lg hover:scale-105 transition-transform"
            >
              {step === 3 ? 'Create First Playlist' : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
