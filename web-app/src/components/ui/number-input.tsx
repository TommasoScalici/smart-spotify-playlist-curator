import { Minus, Plus } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface NumberInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange'
> {
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, disabled, max = 100, min = 0, onChange, step = 1, value, ...props }, ref) => {
    const getPrecision = (num: number) => {
      if (!isFinite(num)) return 0;
      let e = 1;
      let p = 0;
      while (Math.round(num * e) / e !== num) {
        e *= 10;
        p++;
      }
      return p;
    };

    const handleIncrement = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!disabled && (max === undefined || value < max)) {
        const precision = getPrecision(step);
        const next = parseFloat((value + step).toFixed(precision));
        onChange(Math.min(max, next));
      }
    };

    const handleDecrement = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!disabled && (min === undefined || value > min)) {
        const precision = getPrecision(step);
        const next = parseFloat((value - step).toFixed(precision));
        onChange(Math.max(min, next));
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
          className="h-10 w-10 shrink-0 rounded-r-none border-r-0"
          disabled={disabled || (min !== undefined && value <= min)}
          onClick={handleDecrement}
          size="icon"
          type="button"
          variant="outline"
        >
          <Minus className="h-4 w-4" />
          <span className="sr-only">Decrease</span>
        </Button>
        <div className="relative flex-1">
          <Input
            className="h-10 [appearance:textfield] rounded-none text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            disabled={disabled}
            max={max}
            min={min}
            onChange={handleChange}
            ref={ref}
            step={step}
            type="number"
            value={value}
            {...props}
          />
        </div>
        <Button
          className="h-10 w-10 shrink-0 rounded-l-none border-l-0"
          disabled={disabled || (max !== undefined && value >= max)}
          onClick={handleIncrement}
          size="icon"
          type="button"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Increase</span>
        </Button>
      </div>
    );
  }
);
NumberInput.displayName = 'NumberInput';
