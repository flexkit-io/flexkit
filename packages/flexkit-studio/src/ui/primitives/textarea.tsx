import * as React from 'react';
import { cn } from 'src/ui/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-empty-interface -- intentionally empty, so it can be extended in the future
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'fk-flex fk-min-h-[80px] fk-w-full fk-rounded-md fk-border fk-border-input fk-bg-background fk-px-3 fk-py-2 fk-text-sm fk-ring-offset-background placeholder:fk-text-muted-foreground focus-visible:fk-outline-none focus-visible:fk-ring-2 focus-visible:fk-ring-ring focus-visible:fk-ring-offset-2 disabled:fk-cursor-not-allowed disabled:fk-opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
