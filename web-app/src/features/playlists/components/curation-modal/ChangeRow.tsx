import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChangeRowProps {
  label: string;
  count: number;
  type: 'add' | 'remove';
  icon: React.ReactNode;
  color: string;
  bg: string;
}

export const ChangeRow = ({ label, count, type, icon, color, bg }: ChangeRowProps) => {
  if (count <= 0) return null;
  return (
    <div className="group flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full transition-all group-hover:scale-110',
            bg,
            color
          )}
        >
          {icon}
        </div>
        <span className="text-sm font-medium text-white/80">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="mx-2 h-px w-12 bg-white/5 transition-colors group-hover:bg-white/10"></div>
        <Badge variant="outline" className={cn('border-0 font-mono text-xs', bg, color)}>
          {type === 'remove' ? '-' : '+'}
          {count}
        </Badge>
      </div>
    </div>
  );
};
