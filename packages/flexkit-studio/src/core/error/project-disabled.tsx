import type { JSX } from 'react';
import { AlertCircle, Moon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/primitives/alert';

/**
 * Shown when the GraphQL API refuses the project: paused (`PROJECT_PAUSED`), or a Free project
 * hibernated after a week without activity (`PROJECT_HIBERNATED`), which an owner wakes up from the
 * dashboard.
 */
export function ProjectDisabled({
  isHibernated = false,
  projectId,
}: {
  isHibernated?: boolean;
  projectId?: string;
}): JSX.Element {
  if (isHibernated) {
    return (
      <Alert>
        <Moon className="fk:h-4 fk:w-4" />
        <AlertTitle>Project Hibernated</AlertTitle>
        <AlertDescription>
          Free projects hibernate after a week without activity. All its data is kept. To use it again,{' '}
          <a
            className="fk:text-blue-500 fk:underline"
            href={`https://flexkit.io/dashboard/*/${projectId ?? ''}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            wake it up from the dashboard
          </a>
          ; it takes a few minutes.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="fk:h-4 fk:w-4" />
      <AlertTitle>Project Paused</AlertTitle>
      <AlertDescription>
        This project has been paused. To troubleshoot this error, please{' '}
        <a
          className="fk:text-blue-500 fk:underline"
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
