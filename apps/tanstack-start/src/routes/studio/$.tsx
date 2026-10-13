import { createFileRoute } from '@tanstack/react-router';
import type { JSX } from 'react';
import { FlexkitStudio } from '@flexkit/studio';

export const Route = createFileRoute('/studio/$')({
  ssr: false,
  component: StudioPage,
});

function StudioPage(): JSX.Element {
  return <FlexkitStudio projectIds={['abcdefghij', 'uwerfsxskp']} basename="/studio" />;
}
