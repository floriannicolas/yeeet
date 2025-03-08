import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorsList?: string[];
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, errorsList, ...props }, ref) => {
    return (
      <>
        <input
          type={type}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            className,
            error && 'border-red-600 focus-visible:ring-red-600'
          )}
          ref={ref}
          {...props}
        />
        {errorsList && errorsList.length > 0 && (
          <ul className="text-red-500 flex flex-col gap-2 mb-4 text-sm list-disc pl-5">
            {errorsList.map((error) => (
              <li key={error}>{error}.</li>
            ))}
          </ul>
        )}
      </>
    );
  }
);
Input.displayName = 'Input';

export { Input };
