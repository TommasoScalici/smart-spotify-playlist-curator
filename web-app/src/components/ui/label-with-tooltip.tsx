import { Info } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface LabelWithTooltipProps extends React.ComponentPropsWithoutRef<typeof Label> {
  tooltip: React.ReactNode;
}

export function LabelWithTooltip({
  children,
  tooltip,
  className,
  ...props
}: LabelWithTooltipProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className={cn('flex items-center gap-2', className)} {...props}>
        {children}
      </Label>
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Info className="text-muted-foreground/50 hover:text-foreground/80 h-4 w-4 cursor-help transition-colors" />
          </TooltipTrigger>
          <TooltipContent side="top" align="start" className="max-w-[280px] p-3 text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
