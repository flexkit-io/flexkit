import type { JSX } from 'react';
import { Star } from 'lucide-react';

const MAX_RATING = 5;

export function RatingPreviewField({ value }: { value: number | null | undefined }): JSX.Element {
  if (value == null) {
    return <span />;
  }

  const filledCount = Math.min(MAX_RATING, Math.max(0, Math.round(value)));

  return (
    <span className="inline-flex items-center gap-0.25" aria-label={`${filledCount} out of ${MAX_RATING} stars`}>
      {Array.from({ length: MAX_RATING }, (_, index) => {
        const isFilled = index < filledCount;

        return (
          <Star
            key={index}
            className={`h-3 w-3 ${isFilled ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-zinc-300 dark:text-zinc-600'}`}
          />
        );
      })}
    </span>
  );
}
