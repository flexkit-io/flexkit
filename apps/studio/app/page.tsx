'use client';

import Link from 'next/link';

export default function Page(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <h1 className="text-6xl font-bold">Hello there!</h1>
      <p className="text-xl mt-4">
        This is a Flexkit app. Head over to the{' '}
        <Link className="underline" href="/studio">
          Flexkit Studio
        </Link>
      </p>
    </div>
  );
}
