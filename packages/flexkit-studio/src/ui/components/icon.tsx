import type { JSX } from 'react';
import { DynamicIcon, iconNames } from 'lucide-react/dynamic';
import type { IconName } from 'lucide-react/dynamic';
import { createIconResolver } from './icon-name';

const resolve = createIconResolver(iconNames);

/** Picks the lucide icon to render for `name`, see `createIconResolver`. */
export function resolveIconName(name: string | undefined, fallbackFor?: string): IconName {
  return resolve(name, fallbackFor) as IconName;
}

type Props = {
  /** Lucide icon name, PascalCase (`'Tag'`) or kebab-case (`'tag'`). */
  name?: string;
  /** Concept to fuzzy-match an icon for when `name` is missing or unknown. */
  fallbackFor?: string;
  className?: string;
  strokeWidth?: number;
};

/**
 * Renders a lucide icon by name. Icons load as separate chunks, so the whole
 * icon set stays out of the main bundle. A fixed-size placeholder keeps the
 * layout stable while a chunk loads.
 */
export function Icon({ name, fallbackFor, className = 'fk:h-4 fk:w-4', strokeWidth = 2 }: Props): JSX.Element {
  return (
    <DynamicIcon
      className={className}
      fallback={() => <span aria-hidden className={`fk:inline-block ${className}`} />}
      name={resolveIconName(name, fallbackFor)}
      strokeWidth={strokeWidth}
    />
  );
}
