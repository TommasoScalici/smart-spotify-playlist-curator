import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Activity, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { ActivityFeed } from './ActivityFeed';

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
    <div className="fixed inset-0 z-100 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className="bg-background/80 animate-in fade-in absolute inset-0 backdrop-blur-sm duration-300"
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer Content */}
      <div
        className={cn(
          'bg-card relative flex h-full w-full max-w-md flex-col overflow-hidden border-l shadow-2xl',
          'animate-in slide-in-from-right duration-300'
        )}
      >
        <div className="bg-accent/5 flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Activity className="text-primary h-5 w-5" />
            <h2 className="text-xl font-bold tracking-tight">Recent Activity</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="hover:bg-accent rounded-full"
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
