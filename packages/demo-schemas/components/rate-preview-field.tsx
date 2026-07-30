import { JSX } from 'react';

export function RatePreviewField({ value }: { value: number | undefined }): JSX.Element {
  return <div className="flex w-full justify-center">{value?.toFixed(3) ?? ''}</div>;
}
