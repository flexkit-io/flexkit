'use client';

import type { JSX } from 'react';
import '@flexkit/studio/styles.css';
import { FlexkitStudio } from '@flexkit/studio';

/** Hosted mode: no `projectIds`; the Studio signs the user in and lists every project they can access. */
export default function Page(): JSX.Element | null {
  return <FlexkitStudio />;
}
