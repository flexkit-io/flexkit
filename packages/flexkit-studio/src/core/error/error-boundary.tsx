import { Component } from 'react';
import type { ErrorInfo, JSX, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '../../ui/primitives/alert';

function ErrorAlert({ error }: { error: unknown }): JSX.Element {
  const errorText =
    error instanceof Error ? error.message : 'An unexpected error has occurred. Please try refreshing the page.';

  return (
    <Alert variant="destructive">
      <AlertCircle className="fk:h-4 fk:w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{errorText}</AlertDescription>
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
  }

  componentDidUpdate(prevProps: BoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null, hasError: false });
    }
  }

  render(): ReactNode {
    return this.state.hasError ? <ErrorAlert error={this.state.error} /> : this.props.children;
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
