import type { JSX } from 'react';
import { RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/primitives/alert';
import { Button } from '../../ui/primitives/button';

/**
 * Shown in place of a part of the Studio whose code could not be loaded,
 * usually because a newer version was deployed while the page was open.
 * The page is not reloaded on its own: other opened apps stay mounted and may
 * hold unsaved work, so the user reloads when they are ready.
 * `wholeStudio`: the error replaced the entire Studio, so there is nothing left to save.
 */
export function NewVersionNotice({ wholeStudio = false }: { wholeStudio?: boolean }): JSX.Element {
  return (
    <Alert>
      <RefreshCw className="fk:h-4 fk:w-4" />
      <AlertTitle>A new version of Flexkit Studio is available</AlertTitle>
      <AlertDescription>
        <p>
          {wholeStudio
            ? 'The Studio could not be loaded. Reload the page to update.'
            : 'This part of the Studio could not be loaded. Save any unsaved work, then reload the page to update.'}
        </p>
        <Button className="fk:mt-2" onClick={() => window.location.reload()} size="sm" variant="outline">
          Reload
        </Button>
      </AlertDescription>
    </Alert>
  );
}
