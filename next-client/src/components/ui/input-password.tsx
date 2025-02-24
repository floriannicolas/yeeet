import * as React from 'react';
import { Input, InputProps } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const InputPassword = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, errorsList, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    return (
      <>
        <div className="relative w-full">
          <Input
            className={cn(className, 'pr-10', 'peer')}
            error={error}
            ref={ref}
            {...props}
            type={isVisible ? 'text' : 'password'}
          />
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer peer-autofill:text-black"
            onClick={() => setIsVisible(!isVisible)}
          >
            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </div>
        </div>
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
InputPassword.displayName = 'InputPassword';

export { InputPassword };
