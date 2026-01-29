import { X, Activity } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ActivityFeed } from './ActivityFeed';
import { useEffect } from 'react';

interface ActivityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ActivityDrawer = ({ open, onOpenChange }: ActivityDrawerProps) => {
  // Prevent body scroll when drawer is open
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

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer Content */}
      <div
        className={cn(
          'relative w-full max-w-md bg-card border-l shadow-2xl flex flex-col h-full overflow-hidden',
          'animate-in slide-in-from-right duration-300'
        )}
      >
        <div className="p-4 border-b flex items-center justify-between bg-accent/5">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight">Recent Activity</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="rounded-full hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full p-0">
            <ActivityFeed isDrawer onClose={() => onOpenChange(false)} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
