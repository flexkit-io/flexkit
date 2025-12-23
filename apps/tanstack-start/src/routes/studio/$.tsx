import { createFileRoute } from '@tanstack/react-router';
import { FlexkitStudio } from '@flexkit/studio';
import config from '../../flexkit.config';

export const Route = createFileRoute('/studio/$')({
  ssr: false,
  component: StudioPage,
});

function StudioPage(): JSX.Element {
  return <FlexkitStudio config={config} />;
}
