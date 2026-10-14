import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default'
    },
    variants: {
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-xs',
        xs: 'px-1.5 py-0.25 text-2xs tracking-wider uppercase'
      },
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        glass: 'glass-panel text-foreground',
        indigo: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20',
        info: 'border-sky-500/20 bg-sky-500/10 text-sky-500 hover:bg-sky-500/20',
        outline: 'text-foreground border-border',
        pink: 'border-pink-500/20 bg-pink-500/10 text-pink-500 hover:bg-pink-500/20',
        purple: 'border-purple-500/20 bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20',
        warning: 'border-amber-500/20 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
      }
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, size, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ size, variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
