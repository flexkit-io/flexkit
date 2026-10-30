import type { JSX } from 'react';
import { useState } from 'react';

/**
 * A plugin's logo: a full-bleed square with its own background, rounded like
 * the Marketplace shows it. The muted tile behind it only shows through a
 * transparent logo, and stands in when the logo is missing or fails to load.
 * Decorative: the plugin's name is always shown next to it.
 *
 * `className` sets the size and corner radius.
 */
export function PluginLogo({ className, src }: { className: string; src: string | null | undefined }): JSX.Element {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const classes = `fk:shrink-0 fk:bg-muted fk:corner-squircle ${className}`;

  if (!src || failedSrc === src) {
    return <span aria-hidden="true" className={classes} />;
  }

  return <img alt="" className={`${classes} fk:object-cover`} src={src} onError={() => setFailedSrc(src)} />;
}
