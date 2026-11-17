import { Component } from 'react';
import type { ErrorInfo, JSX, ReactNode } from 'react';
import { AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '../../ui/primitives/alert';
import { Button } from '../../ui/primitives/button';
import { isChunkLoadError } from './chunk-load-error';
import { reportStudioError } from './error-reporter';
import { NewVersionNotice } from './new-version-notice';

/**
 * A crash of the page, not something the user did: say so in plain words,
 * offer a way out, and keep the technical message (often a minified React
 * error) folded away for a bug report.
 */
function ErrorAlert({ error, onRetry }: { error: unknown; onRetry: () => void }): JSX.Element {
  const technical = error instanceof Error ? error.message : null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="fk:h-4 fk:w-4" />
      <AlertTitle>This page stopped working</AlertTitle>
      <AlertDescription>
        <p>Something went wrong while showing this page. Try again, or reload the page.</p>
        <div className="fk:mt-2 fk:flex fk:flex-wrap fk:gap-2">
          <Button onClick={onRetry} size="sm" variant="outline">
            <RotateCcw className="fk:h-3.5 fk:w-3.5" />
            Try again
          </Button>
          <Button onClick={() => window.location.reload()} size="sm" variant="outline">
            <RefreshCw className="fk:h-3.5 fk:w-3.5" />
            Reload
          </Button>
        </div>
        {technical ? (
          <details className="fk:mt-2 fk:text-xs">
            <summary className="fk:cursor-pointer">Technical details</summary>
            <p className="fk:mt-1 fk:break-words fk:font-mono">{technical}</p>
          </details>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

type BoundaryProps = {
  children: ReactNode;
  /** Changing it clears a caught error, like a navigation does in a data router. */
  resetKey: string;
};

type BoundaryState = { error: unknown; hasError: boolean };

class ErrorBoundaryImpl extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, hasError: false };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error, hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Flexkit Studio app error', error, info.componentStack);
    reportStudioError(error, { source: 'react', componentStack: info.componentStack ?? undefined });
  }

  componentDidUpdate(prevProps: BoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null, hasError: false });
    }
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return isChunkLoadError(this.state.error) ? (
      <NewVersionNotice />
    ) : (
      <ErrorAlert error={this.state.error} onRetry={() => this.setState({ error: null, hasError: false })} />
    );
  }
}

/**
 * Shows an error alert in place of the route element that threw, and recovers
 * when the route's location changes. The apps are rendered with `useRoutes`
 * so they can stay mounted off-screen, and `errorElement` only works in a
 * data router, hence this boundary.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  const { pathname, search } = useLocation();

  return <ErrorBoundaryImpl resetKey={`${pathname}${search}`}>{children}</ErrorBoundaryImpl>;
}
