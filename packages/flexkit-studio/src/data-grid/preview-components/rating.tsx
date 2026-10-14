import type { JSX } from 'react';
import { Star } from 'lucide-react';
import type { NumberOptions } from '../../core/types';
import { getRatingState } from './rating-state';

type Props = {
  value: number | string | null | undefined;
  options?: NumberOptions;
};

/** Filled stars for a numeric attribute (`previewType: 'rating'`); `options.max` sets the count. */
export function Rating({ value, options }: Props): JSX.Element {
  const state = getRatingState(value, options?.max);

  if (!state) {
    return <span />;
  }

  return (
    <span aria-label={state.label} className="fk:inline-flex fk:items-center fk:gap-0.5" role="img" title={state.label}>
      {Array.from({ length: state.max }, (_, index) => (
        <Star
          aria-hidden
          className={
            index < state.filled
              ? 'fk:h-3.5 fk:w-3.5 fk:fill-amber-400 fk:text-amber-400'
              : 'fk:h-3.5 fk:w-3.5 fk:fill-transparent fk:text-muted-foreground/40'
          }
          key={index}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}
