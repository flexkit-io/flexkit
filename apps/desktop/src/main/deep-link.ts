import { resolve } from 'node:path';
import { app } from 'electron';
import { APP_SCHEME } from './constants';

function findAppUrl(argv: string[]): string | undefined {
  return argv.find((argument) => argument.startsWith(`${APP_SCHEME}://`));
}

/**
 * Registers the `flexkit://` scheme with the OS and routes every URL the OS
 * hands the app (login callbacks, links into the Studio) to `onUrl`. One
 * instance only: a second launch passes its URL to the running one.
 * Returns false when this launch must quit because another instance runs.
 */
export function setupDeepLinks(onUrl: (url: string) => void, onSecondInstance: () => void): boolean {
  if (process.defaultApp && process.argv.length >= 2) {
    // Development (`electron .`): the handler must point at this checkout.
    app.setAsDefaultProtocolClient(APP_SCHEME, process.execPath, [resolve(process.argv[1] ?? '.')]);
  } else {
    app.setAsDefaultProtocolClient(APP_SCHEME);
  }

  if (!app.requestSingleInstanceLock()) {
    app.quit();

    return false;
  }

  app.on('second-instance', (_event, argv) => {
    onSecondInstance();

    const url = findAppUrl(argv);

    if (url) {
      onUrl(url);
    }
  });

  // macOS
  app.on('open-url', (event, url) => {
    event.preventDefault();
    onUrl(url);
  });

  return true;
}

/** The URL this launch was started with (Windows and Linux pass it in argv). */
export function getLaunchUrl(): string | undefined {
  return findAppUrl(process.argv);
}
