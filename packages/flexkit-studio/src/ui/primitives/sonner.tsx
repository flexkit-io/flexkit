'use client';

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react';
import { useTheme } from '../theme-context';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ richColors = true, style, ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      richColors={richColors}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="fk:size-4" />,
        info: <InfoIcon className="fk:size-4" />,
        warning: <TriangleAlertIcon className="fk:size-4" />,
        error: <OctagonXIcon className="fk:size-4" />,
        loading: <Loader2Icon className="fk:size-4 fk:animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'hsl(var(--popover))',
          '--normal-text': 'hsl(var(--popover-foreground))',
          '--normal-border': 'hsl(var(--border))',
          '--border-radius': 'var(--radius)',
          ...style,
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
