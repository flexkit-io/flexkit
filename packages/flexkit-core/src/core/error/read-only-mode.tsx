import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/primitives/alert';

export function ReadOnlyMode(): JSX.Element {
  return (
    <Alert className="fk-mb-4" variant="destructive">
      <AlertCircle className="fk-h-4 fk-w-4" />
      <AlertTitle>Read Only Mode</AlertTitle>
      <AlertDescription>
        This project is currently in read only mode and changes cannot be saved. To troubleshoot this error, please{' '}
        <a
          className="fk-text-blue-500 fk-underline"
          href="https://flexkit.io/docs/errors/read-only-mode"
          target="_blank"
          rel="noopener noreferrer"
        >
          follow these steps
        </a>
        .
      </AlertDescription>
    </Alert>
  );
}
