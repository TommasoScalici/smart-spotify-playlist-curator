import * as React from 'react';
import { Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface NumberInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange'
> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, min = 0, max = 100, step = 1, disabled, ...props }, ref) => {
    const handleIncrement = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!disabled && (max === undefined || value < max)) {
        onChange(Math.min(max, value + step));
      }
    };

    const handleDecrement = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!disabled && (min === undefined || value > min)) {
        onChange(Math.max(min, value - step));
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      if (!isNaN(newValue)) {
        onChange(newValue);
      } else if (e.target.value === '') {
        // Handle empty input if needed, but for controlled number input typically we keep it valid or 0
        // For now, let's keep the last valid value or allow partial typing behavior if we refactor to local state
        // But simply, let's just ignore or set to min
      }
    };

    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-r-none border-r-0"
          onClick={handleDecrement}
          disabled={disabled || (min !== undefined && value <= min)}
          type="button"
        >
          <Minus className="h-4 w-4" />
          <span className="sr-only">Decrease</span>
        </Button>
        <div className="relative flex-1">
          <Input
            ref={ref}
            type="number"
            className="h-10 [appearance:textfield] rounded-none text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={value}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            {...props}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-l-none border-l-0"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && value >= max)}
          type="button"
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Increase</span>
        </Button>
      </div>
    );
  }
);
NumberInput.displayName = 'NumberInput';
