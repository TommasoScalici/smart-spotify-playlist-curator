import * as SeparatorPrimitive from '@radix-ui/react-separator';
import * as React from 'react';

import { cn } from '@/lib/utils';

const Separator = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', ...props }, ref) => (
  <SeparatorPrimitive.Root
    className={cn(
      'bg-border shrink-0',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      className
    )}
    decorative
    orientation={orientation}
    ref={ref}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
