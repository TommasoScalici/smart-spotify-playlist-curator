import { LucideIcon } from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface DiffColumnProps {
  title: string;
  count: number;
  icon: LucideIcon;
  colorClass: string; // e.g., "text-green-500"
  bgClass: string; // e.g., "bg-green-500/10"
  children: React.ReactNode;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
}

export const DiffColumn = ({
  title,
  count,
  icon: Icon,
  colorClass,
  bgClass,
  children,
  emptyMessage = 'No items to show.',
  emptyIcon: EmptyIcon
}: DiffColumnProps) => {
  return (
    <div className="bg-card/30 flex h-72 shrink-0 flex-col overflow-hidden rounded-lg border border-white/5 backdrop-blur-md md:h-full md:shrink">
      <div className={cn('flex shrink-0 items-center gap-2 border-b p-3', bgClass)}>
        <Icon className={cn('h-4 w-4', colorClass)} />
        <span className={cn('font-semibold', colorClass.replace('text-', 'text-opacity-80 text-'))}>
          {title} ({count})
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        <ScrollArea className="h-full w-full" type="always">
          <div className="space-y-2 p-3">
            {children}
            {count === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center opacity-40">
                {EmptyIcon && <EmptyIcon className="mb-2 h-6 w-6" />}
                <p className="text-xs italic">{emptyMessage}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
