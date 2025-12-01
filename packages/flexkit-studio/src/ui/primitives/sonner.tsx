'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster({ ...props }: ToasterProps): JSX.Element {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      className="toaster fk-group"
      theme={theme as ToasterProps['theme']}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:fk-bg-background group-[.toaster]:fk-text-foreground group-[.toaster]:fk-border-border group-[.toaster]:fk-shadow-lg',
          description: 'group-[.toast]:fk-text-muted-foreground',
          actionButton: 'group-[.toast]:fk-bg-primary group-[.toast]:fk-text-primary-foreground',
          cancelButton: 'group-[.toast]:fk-bg-muted group-[.toast]:fk-text-muted-foreground',
          success:
            'group-[.toaster]:!fk-bg-emerald-500 group-[.toaster]:!fk-border-emerald-500 group-[.toaster]:!fk-text-white',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
