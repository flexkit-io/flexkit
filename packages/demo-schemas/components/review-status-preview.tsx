import type { JSX } from 'react';

type StatusConfig = {
  label: string;
  className: string;
};

const STATUS_CONFIG: { [status: string]: StatusConfig } = {
  pending: {
    label: 'Pending',
    className: 'border-0 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  moderated: {
    label: 'Moderated',
    className: 'border-0 bg-green-500/20 text-green-900 dark:bg-green-500/20 dark:text-green-500',
  },
  rejected: {
    label: 'Rejected',
    className: 'border-0 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-500/25 dark:text-rose-200',
  },
};

const FALLBACK_CLASS_NAME =
  'border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200';

export function ReviewStatusPreviewField({ value }: { value: string | null | undefined }): JSX.Element {
  if (value == null || value === '') {
    return <span />;
  }

  const status = STATUS_CONFIG[value];

  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${status?.className ?? FALLBACK_CLASS_NAME}`}
    >
      {status?.label ?? value}
    </span>
  );
}
