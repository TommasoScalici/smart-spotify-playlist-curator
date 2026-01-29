import { useState } from 'react';
import { ArrowRight, CheckCircle2, Music, Play, Settings, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TutorialDialog = ({ open, onOpenChange }: TutorialDialogProps) => {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      onOpenChange(false);
      navigate('/playlist/new');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card w-[90%] overflow-hidden rounded-lg p-0 sm:w-full sm:max-w-[500px] sm:rounded-lg">
        {/* Header Image / Gradient */}
        <div className="from-primary/20 via-background to-secondary/20 relative flex h-32 items-center justify-center overflow-hidden bg-linear-to-br">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          {step === 1 && <Music className="text-primary/40 h-16 w-16 animate-pulse" />}
          {step === 2 && <Settings className="text-secondary/40 animate-spin-slow h-16 w-16" />}
          {step === 3 && <Sparkles className="text-tertiary/40 h-16 w-16 animate-bounce" />}
        </div>

        <div className="space-y-6 p-6">
          <DialogHeader className="space-y-2 text-center sm:text-left">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {step === 1 && 'Welcome to Smart Curator'}
              {step === 2 && 'How It Works'}
              {step === 3 && 'Ready to Automate?'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              {step === 1 &&
                'Your personal AI music editor. Let’s set up your first automated playlist in seconds.'}
              {step === 2 && 'Build your perfect flow with simple rules:'}
              {step === 3 &&
                'Launch your first curator job and let the AI handle the rest. You just listen.'}
            </DialogDescription>
          </DialogHeader>

          {/* Step 2 Content: Workflow Icons */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-accent/20 flex items-start gap-4 rounded-lg border border-white/5 p-3">
                <div className="bg-primary/10 text-primary shrink-0 rounded p-2">
                  <Music className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">1. Select a Playlist</h4>
                  <p className="text-muted-foreground text-xs">
                    Choose one of your existing playlists as the target.
                  </p>
                </div>
              </div>

              <div className="bg-accent/20 flex items-start gap-4 rounded-lg border border-white/5 p-3">
                <div className="bg-secondary/10 text-secondary shrink-0 rounded p-2">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">2. Define Rules</h4>
                  <p className="text-muted-foreground text-xs">
                    Set AI prompts, max track age, and VIP tracks.
                  </p>
                </div>
              </div>

              <div className="bg-accent/20 flex items-start gap-4 rounded-lg border border-white/5 p-3">
                <div className="bg-tertiary/10 text-tertiary shrink-0 rounded p-2">
                  <Play className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">3. Run Automation</h4>
                  <p className="text-muted-foreground text-xs">
                    The AI updates your playlist automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 Content: Checklist */}
          {step === 3 && (
            <div className="space-y-3 pl-2">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-5 w-5 text-green-500" />{' '}
                <span>Connect Spotify Account</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-5 w-5 text-green-500" /> <span>Grant Permissions</span>
              </div>
              <div className="flex items-center gap-3 text-sm opacity-50">
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-current">
                  <div className="h-2 w-2 rounded-full bg-current" />
                </div>
                <span>Create First Playlist</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex-row items-center justify-between pt-2 sm:justify-between">
            {/* Stepper Dots */}
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === step ? 'bg-primary w-6' : 'bg-muted w-2'
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              className="gap-2 shadow-lg transition-transform hover:scale-105"
            >
              {step === 3 ? 'Create First Playlist' : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
