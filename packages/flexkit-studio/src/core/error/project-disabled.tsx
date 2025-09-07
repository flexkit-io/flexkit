import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/primitives/alert';

export function ProjectDisabled(): JSX.Element {
  return (
    <Alert variant="destructive">
      <AlertCircle className="fk-h-4 fk-w-4" />
      <AlertTitle>Project Paused</AlertTitle>
      <AlertDescription>
        This project has been paused. To troubleshoot this error, please{' '}
        <a
          className="fk-text-blue-500 fk-underline"
          href="https://flexkit.io/docs/errors/project-paused"
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
