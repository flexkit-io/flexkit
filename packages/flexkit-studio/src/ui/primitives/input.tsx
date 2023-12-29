import * as React from 'react';
import { cn } from 'src/ui/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-empty-interface -- from radix-ui
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      className={cn(
        'fk-flex fk-h-10 fk-w-full fk-rounded-md fk-border fk-border-input fk-bg-background fk-px-3 fk-py-2 fk-text-sm fk-ring-offset-background file:fk-border-0 file:fk-bg-transparent file:fk-text-sm file:fk-font-medium placeholder:fk-text-muted-foreground focus-visible:fk-outline-none focus-visible:fk-ring-2 focus-visible:fk-ring-ring focus-visible:fk-ring-offset-2 disabled:fk-cursor-not-allowed disabled:fk-opacity-50',
        className
      )}
      ref={ref}
      type={type}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
