'use client';

import Link from 'next/link';

export default function Page(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center flex-1 m-10">
      <h1 className="text-6xl font-bold">Hello there!</h1>
      <p className="text-xl mt-4">
        This is a Flexkit app running on Next.js 14 App Router.{' '}
        <Link className="underline" href="/studio">
          Head over to the Studio
        </Link>
      </p>
    </div>
  );
}
