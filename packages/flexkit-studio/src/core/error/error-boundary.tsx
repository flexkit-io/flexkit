import { AlertCircle } from 'lucide-react';
import { useRouteError } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '../../ui/primitives/alert';

export function ErrorBoundary() {
  const error = useRouteError();
  const errorText =
    error instanceof Error ? error.message : 'An unexpected error has occurred. Please try refreshing the page.';

  return (
    <Alert variant="destructive">
      <AlertCircle className="fk-h-4 fk-w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{errorText}</AlertDescription>
    </Alert>
  );
}
