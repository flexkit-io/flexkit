'use client';

import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { DarkModeSwitch } from '../ui/components/dark-mode-switch';

export function GlobalError(): JSX.Element {
  const error = useRouteError();
  const copyrightYear = new Date().getFullYear();

  function errorMessage(): JSX.Element | null {
    if (isRouteErrorResponse(error)) {
      if (error.status === 404) {
        return (
          <>
            <h1 className="mb-4 text-7xl text-center font-bold tracking-tight">404</h1>
            <p className="mt-2 mb-2 text-base text-center text-muted-foreground">Page not found</p>
          </>
        );
      }

      return (
        <>
          <h1 className="mb-4 text-4xl text-center font-bold tracking-tight">Oops!</h1>
          <p className="mt-2 mb-2 text-base text-center text-muted-foreground">
            Sorry, an unexpected error has occurred:
          </p>
          <p className="text-base text-center">
            <i>{error.statusText}</i>
          </p>
        </>
      );
    }

    if (error instanceof Error) {
      return (
        <>
          <h1 className="mb-4 text-4xl text-center font-bold tracking-tight">Oops!</h1>
          <p className="mt-2 mb-2 text-base text-center text-muted-foreground">
            Sorry, an unexpected error has occurred:
          </p>
          <p className="text-base text-center">
            <i>{error.message}</i>
          </p>
        </>
      );
    }

    return null;
  }

  return (
    <>
      <div className="container relative h-[calc(100vh-3rem)] flex items-center justify-center lg:px-0">
        <div className="w-full lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center sm:w-[350px]">{errorMessage()}</div>
        </div>
      </div>
      <div className="flex justify-center items-center h-12 text-xs text-muted-foreground border-t border-accent">
        <div className="container flex">
          <div className="flex items-center mr-auto">
            <svg
              className="h-5 w-5 mr-3 text-black dark:text-white"
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
            <p className="flex items-center">© {copyrightYear}</p>
          </div>
          <DarkModeSwitch />
        </div>
      </div>
    </>
  );
}
