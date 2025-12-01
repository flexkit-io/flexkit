import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'src/ui/lib/utils';

const alertVariants = cva(
  'fk-relative fk-w-full fk-rounded-lg fk-border fk-p-4 [&>svg~*]:fk-pl-7 [&>svg+div]:fk-translate-y-[-3px] [&>svg]:fk-absolute [&>svg]:fk-left-4 [&>svg]:fk-top-4 [&>svg]:fk-text-foreground',
  {
    variants: {
      variant: {
        'default': 'fk-bg-background fk-text-foreground',
        destructive: 'fk-border-none fk-text-destructive fk-bg-destructive-foreground [&>svg]:fk-text-destructive',
        success: 'fk-border-none fk-text-success fk-bg-success-foreground [&>svg]:fk-text-success',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div className={cn(alertVariants({ variant }), className)} ref={ref} role="alert" {...props} />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    // eslint-disable-next-line jsx-a11y/heading-has-content -- intentional, content is set later
    <h5 className={cn('fk-mb-1 fk-font-medium fk-leading-none fk-tracking-tight', className)} ref={ref} {...props} />
  )
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div className={cn('fk-text-sm [&_p]:fk-leading-relaxed', className)} ref={ref} {...props} />
  )
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
