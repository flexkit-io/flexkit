import './env';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@flexkit/studio/styles.css';
import './globals.css';
import { FlexkitStudio } from '@flexkit/studio';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Missing #root element.');
}

/** Hosted mode, like flexkit.app: the app signs the user in and lists every project they can access. */
createRoot(container).render(
  <StrictMode>
    <FlexkitStudio />
  </StrictMode>
);
