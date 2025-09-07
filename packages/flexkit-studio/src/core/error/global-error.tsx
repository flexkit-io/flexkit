'use client';

import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { DarkModeSwitch } from '../../ui/components/dark-mode-switch';
import { isFlexkitError, getFlexkitErrorCode } from '../../core/error/errors';

export function GlobalError(): JSX.Element {
  const error = useRouteError();
  const copyrightYear = new Date().getFullYear();

  function errorMessage(): JSX.Element | null {
    if (isRouteErrorResponse(error)) {
      if (error.status === 404) {
        return (
          <>
            <h1 className="fk-mb-4 fk-text-7xl fk-text-center fk-font-bold fk-tracking-tight">404</h1>
            <p className="fk-mt-2 fk-mb-2 fk-text-base fk-text-center fk-text-muted-foreground">Page not found</p>
          </>
        );
      }

      return (
        <>
          <h1 className="fk-mb-4 fk-text-4xl fk-text-center fk-font-bold fk-tracking-tight">Oops!</h1>
          <p className="fk-mt-2 fk-mb-2 fk-text-base fk-text-center fk-text-muted-foreground">
            Sorry, an unexpected error has occurred:
          </p>
          <p className="fk-text-base fk-text-center">
            <i>{error.statusText}</i>
          </p>
        </>
      );
    }

    if (isFlexkitError(error)) {
      switch (getFlexkitErrorCode(error)) {
        case 'PROJECT_NOT_FOUND':
          return (
            <>
              <h1 className="fk-mb-4 fk-text-4xl fk-text-center fk-font-bold fk-tracking-tight">Project not found</h1>
              <p className="fk-mt-2 fk-mb-2 fk-text-base fk-text-center fk-text-muted-foreground">
                The requested project ID was not found
              </p>
            </>
          );
        case 'UNKNOWN_ERROR':
        default:
          return (
            <>
              <h1 className="fk-mb-4 fk-text-4xl fk-text-center fk-font-bold fk-tracking-tight">Oops!</h1>
              <p className="fk-mt-2 fk-mb-2 fk-text-base fk-text-center fk-text-muted-foreground">
                Sorry, an unexpected error has occurred. Please try again.
              </p>
            </>
          );
      }
    }

    if (error instanceof Error) {
      return (
        <>
          <h1 className="fk-mb-4 fk-text-4xl fk-text-center fk-font-bold fk-tracking-tight">Oops!</h1>
          <p className="fk-mt-2 fk-mb-2 fk-text-base fk-text-center fk-text-muted-foreground">
            Sorry, an unexpected error has occurred:
          </p>
          <p className="fk-text-base fk-text-center">
            <i>{error.message}</i>
          </p>
        </>
      );
    }

    return null;
  }

  return (
    <>
      <div className="fk-container fk-relative fk-h-[calc(100vh-3rem)] fk-flex fk-items-center fk-justify-center lg:fk-px-0">
        <div className="fk-w-full lg:fk-p-8">
          <div className="fk-mx-auto fk-flex fk-w-full fk-flex-col fk-justify-center sm:fk-w-[350px]">
            {errorMessage()}
          </div>
        </div>
      </div>
      <div className="fk-flex fk-justify-center fk-items-center fk-h-12 fk-text-xs fk-text-muted-foreground fk-border-t fk-border-accent">
        <div className="fk-container fk-flex">
          <div className="fk-flex fk-items-center fk-mr-auto">
            <svg
              className="fk-h-5 fk-w-5 fk-mr-3 fk-text-black dark:fk-text-white"
              fill="none"
              height="48"
              viewBox="0 0 48 48"
              width="48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M7 8H41V40H7V8Z" fill="none" />
              <path
                d="M24 0C42 0 48 6 48 24C48 42 42 48 24 48C6 48 0 42 0 24C0 6 6 0 24 0ZM17.7494 9.52381H8.7619L19.2833 23.8313L8.7619 38.7078H17.7494L21.0499 33.6639V14.2549L17.7494 9.52381ZM38.9577 9.52381H29.9542L26.2857 14.8229V33.0406L29.9542 38.7078H38.9577L28.3908 23.8313L38.9577 9.52381Z"
                fill="currentColor"
              />
            </svg>
            <p className="fk-flex fk-items-center">© {copyrightYear}</p>
          </div>
          <DarkModeSwitch />
        </div>
      </div>
    </>
  );
}
