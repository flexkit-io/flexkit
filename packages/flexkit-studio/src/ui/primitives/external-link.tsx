import { SquareArrowOutUpRight as ExternalLinkIcon } from 'lucide-react';
import { Button } from './button';
import type { JSX } from 'react';

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }): JSX.Element {
  return (
    <Button asChild className="fk:h-6 fk:px-1! fk:py-0 fk:text-sm fk:font-light fk:text-link" size="sm" variant="link">
      <a href={href} target="_blank">
        {children} <ExternalLinkIcon className="fk:size-3" strokeWidth={3} />
      </a>
    </Button>
  );
}
