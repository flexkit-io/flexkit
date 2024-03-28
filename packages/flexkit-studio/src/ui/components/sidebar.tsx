import { Archive, Tag } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Button } from '../primitives/button';
import { ScrollArea } from '../primitives/scroll-area';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  playlists: [];
}

export function Sidebar({ className, playlists }: SidebarProps): JSX.Element {
  return (
    <div className={cn('fk-w-full fk-h-full', className)}>
      <ScrollArea className="fk-h-full">
        <div className="fk-px-3 fk-pt-3 fk-pb-2">
          <h2 className="fk-mb-2 fk-px-4 fk-text-sm fk-font-semibold fk-tracking-tight">Catalog</h2>
          <div className="fk-space-y-1">
            <Button asChild className="fk-w-full fk-justify-start" variant="ghost">
              <NavLink
                className="fk-text-muted-foreground aria-[current]:fk-text-foreground aria-[current]:fk-bg-muted aria-[current]:fk-border-l-white"
                to="list/products"
              >
                <Tag className="fk-h-4 fk-w-4 fk-mr-2" strokeWidth={2} />
                Products
              </NavLink>
            </Button>
            <Button asChild className="fk-w-full fk-justify-start" variant="ghost">
              <NavLink
                className="fk-text-muted-foreground aria-[current]:fk-text-foreground aria-[current]:fk-bg-muted aria-[current]:fk-border-l-white"
                to="list/categories"
              >
                <Archive className="fk-h-4 fk-w-4 fk-mr-2" strokeWidth={2} />
                Categories
              </NavLink>
            </Button>
            <Button asChild className="fk-w-full fk-justify-start" variant="ghost">
              <NavLink
                className="fk-text-muted-foreground aria-[current]:fk-text-foreground aria-[current]:fk-bg-muted aria-[current]:fk-border-l-white"
                to="list/brands"
              >
                <Archive className="fk-h-4 fk-w-4 fk-mr-2" strokeWidth={2} />
                Brands
              </NavLink>
            </Button>
            <Button asChild className="fk-w-full fk-justify-start" variant="ghost">
              <NavLink
                className="fk-text-muted-foreground aria-[current]:fk-text-foreground aria-[current]:fk-bg-muted aria-[current]:fk-border-l-white"
                to="list/flags"
              >
                <Archive className="fk-h-4 fk-w-4 fk-mr-2" strokeWidth={2} />
                Flags
              </NavLink>
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
