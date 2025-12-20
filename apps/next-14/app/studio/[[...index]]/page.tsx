'use client';

import { FlexkitStudio } from '@flexkit/studio';
import config from '../../../flexkit.config';

export default function Page(): JSX.Element | null {
  return <FlexkitStudio config={config} />;
}
