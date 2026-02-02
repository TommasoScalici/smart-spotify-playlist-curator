import { Activity, X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { ActivityLog } from '@/hooks/useActivityFeed';
import { cn } from '@/lib/utils';

import { ActivityFeed } from './ActivityFeed';

// ... other imports ...

interface ActivityDrawerProps {
  onActivitySelect?: (activity: ActivityLog) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export const ActivityDrawer = ({ onActivitySelect, onOpenChange, open }: ActivityDrawerProps) => {
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
            className="hover:bg-accent rounded-full"
            onClick={() => onOpenChange(false)}
            size="icon"
            variant="ghost"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full p-0">
            <ActivityFeed
              isDrawer
              onActivitySelect={onActivitySelect}
              onClose={() => onOpenChange(false)}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
