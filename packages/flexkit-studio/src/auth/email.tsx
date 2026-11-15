'use client';

import { JSX, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/primitives/alert';
import { Button } from '../ui/primitives/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/primitives/form';
import { Input } from '../ui/primitives/input';
import { apiPaths, baseApiUrl, userApiPaths } from '../core/api-paths';
import { getDesktop } from '../core/desktop';

/** How long the emailed link works. The screen checks for the confirmation until then. */
const LOGIN_LINK_LIFETIME_MS = 60 * 60 * 1000;

const formSchema = z.object({
  email: z.email({ error: 'Please enter a valid email address' }),
});

export default function EmailLogin({
  projectId,
  onEmailSentChange,
  redirectTo,
  setIsEmailLogin,
}: {
  /** Tells the login screen that the link was sent, so it can show the matching heading. */
  onEmailSentChange?: (_isSent: boolean) => void;
  /** Omitted in hosted mode: the OTP flow then goes through the Studio's own user-level API route. */
  projectId?: string;
  /** Absolute URL to open once the session cookie is set; defaults to reloading the current page. */
  redirectTo?: string;
  setIsEmailLogin: Dispatch<SetStateAction<boolean>>;
}): JSX.Element {
  const redirectToRef = useRef(redirectTo);
  redirectToRef.current = redirectTo;

  // The picked project may differ from the one in the URL, so land on it explicitly.
  function finishLogin(): void {
    if (redirectToRef.current) {
      window.location.assign(redirectToRef.current);
    } else {
      window.location.reload();
    }
  }

  const [hasOtpExpired, setHasOtpExpired] = useState(false);
  const [shouldSendOtp, setShouldSendOtp] = useState(false);
  const { mutate } = useSWRConfig();
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });
  // Project mode talks to the project API directly (open CORS); hosted mode stays same-origin through the BFF.
  const sendOtpUrl = projectId === undefined ? userApiPaths.otpSend : new URL(apiPaths(projectId).loginOtpSend, baseApiUrl).href;
  const confirmOtpUrl =
    projectId === undefined ? userApiPaths.otpConfirm : new URL(apiPaths(projectId).loginOtpConfirm, baseApiUrl).href;
  const { data, error, isLoading } = useSWR(
    shouldSendOtp ? sendOtpUrl : null,
    (url: string) =>
      fetch(url, {
        method: 'POST',
        mode: 'cors',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.getValues('email') }),
      }).then(
        (res) =>
          res.json() as Promise<
            { confirmationCode?: string; token: string } | { error: { message: string; code: string } } | undefined
          >
      ),
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  );
  const errorCode = data && 'error' in data && data.error.code;
  const hasOtpBeenSent = data && 'token' in data;
  const token = data && 'token' in data ? data.token : '';

  // Before paint, so the old heading never shows above the new text.
  useLayoutEffect(() => {
    onEmailSentChange?.(Boolean(hasOtpBeenSent));

    return () => {
      onEmailSentChange?.(false);
    };
  }, [hasOtpBeenSent, onEmailSentChange]);
  // Shown here and on the page the emailed link opens, so the two can be compared.
  const confirmationCode =
    data && 'token' in data && typeof data.confirmationCode === 'string' && /^\d{6}$/.test(data.confirmationCode)
      ? data.confirmationCode
      : undefined;

  useEffect(() => {
    if (!hasOtpBeenSent) {
      return;
    }

    // A deadline, not a count of checks: a browser slows the timer of a tab in the background.
    const deadline = Date.now() + LOGIN_LINK_LIFETIME_MS;
    const interval = setInterval(() => {
      // Start polling to check for email confirmation
      // if email is confirmed, redirect to dashboard
      if (Date.now() > deadline) {
        clearInterval(interval);
        setHasOtpExpired(true);

        return;
      }

      const setTokenUrl = '/api/flexkit/set-token';
      fetch(
        `${confirmOtpUrl}?email=${encodeURIComponent(form.getValues('email'))}&token=${encodeURIComponent(token)}`,
        { credentials: 'same-origin' }
      )
        .then((res) => {
          if (res.status === 200) {
            // set the token cookie
            res
              .json()
              .then((confirmationResponse: { sid: string }) => {
                fetch(setTokenUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ sid: confirmationResponse.sid }),
                })
                  .then((setTokenResponse) => {
                    // A refusal (wrong origin behind a proxy, a malformed session) must not look like a sign-in.
                    if (setTokenResponse.ok || setTokenResponse.redirected) {
                      finishLogin();
                    } else {
                      // eslint-disable-next-line no-console -- the only trace of a misconfigured API route
                      console.error(`Flexkit: /api/flexkit/set-token answered ${String(setTokenResponse.status)}`);
                    }
                  })
                  .catch(() => {
                    // TODO: inform the user about the error, maybe the /set-token route is not available or properly configured
                  });
              })
              .catch(() => {
                // TODO: handle this error
              });
          }
        })
        .catch(() => {
          // do nothing, the user has not confirmed the email yet
        });
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [confirmOtpUrl, form, hasOtpBeenSent, token]);

  function handleEmailLogin(): void {
    setHasOtpExpired(false);
    setShouldSendOtp(true);
    void mutate(sendOtpUrl);
  }

  return (
    <div className="fk:w-full">
      {hasOtpBeenSent && hasOtpExpired ? (
        <Alert variant="destructive">
          <AlertDescription>
            The sign-in link has expired. Please{' '}
            <Button
              className="fk:p-0 fk:hover:underline"
              onClick={() => {
                window.location.reload();
              }}
              variant="link"
            >
              try again
            </Button>
            .
          </AlertDescription>
        </Alert>
      ) : hasOtpBeenSent ? (
        <div className="fk:flex fk:flex-col fk:items-center" role="status">
          <p className="fk:text-center fk:text-muted-foreground">
            {getDesktop()
              ? 'Keep Flexkit open and, on this computer, open the link we just sent to '
              : 'Keep this window open and in a new tab open the link we just sent to '}
            <strong className="fk:break-words">{form.getValues('email')}</strong> (
            <Button
              aria-label="Undo, use a different email"
              className="fk:h-auto fk:p-0 fk:text-base fk:font-normal fk:text-muted-foreground fk:hover:underline"
              onClick={() => {
                window.location.reload();
              }}
              variant="link"
            >
              undo
            </Button>
            )
          </p>
          {confirmationCode ? (
            <div className="fk:mt-6 fk:flex fk:flex-col fk:items-center">
              <p className="fk:text-center fk:text-sm fk:text-muted-foreground">Confirmation code</p>
              <p className="fk:my-3 fk:font-mono fk:text-4xl fk:font-semibold fk:tracking-[0.2em] fk:text-foreground">
                <span aria-hidden="true">
                  {confirmationCode.slice(0, 3)} {confirmationCode.slice(3)}
                </span>
                {/* Read digit by digit, not as two numbers. */}
                <span className="fk:sr-only">{confirmationCode.split('').join(' ')}</span>
              </p>
              <p className="fk:text-center fk:text-sm fk:text-muted-foreground">
                The page that opens asks you to approve this sign-in and shows this code.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(handleEmailLogin)(event)}
            className="fk:w-full fk:space-y-3 fk:mb-10"
          >
            {errorCode === 'not_exists' && (
              <Alert variant="destructive">
                <AlertDescription>
                  There is no Flexkit account associated with this email address.{' '}
                  <a
                    className="fk:text-black/90 fk:dark:text-white/90 fk:underline"
                    href={`https://flexkit.io/signup/email?email=${encodeURIComponent(form.getValues('email'))}`}
                  >
                    Sign up?
                  </a>
                </AlertDescription>
              </Alert>
            )}
            {errorCode === 'unknown_error' || error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  There was an unknown error, please{' '}
                  <Button
                    className="fk:p-0 fk:hover:underline"
                    onClick={() => {
                      window.location.reload();
                    }}
                    variant="link"
                  >
                    try again
                  </Button>
                  .{' '}
                </AlertDescription>
              </Alert>
            ) : null}
            <FormField
              control={form.control}
              defaultValue=""
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      aria-label="Email Address"
                      autoCapitalize="off"
                      autoComplete="off"
                      autoCorrect="off"
                      className="w-full"
                      placeholder="Email Address"
                      spellCheck={false}
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button aria-disabled={isLoading} className="fk:w-full" type="submit" disabled={Boolean(isLoading)}>
              {isLoading ? (
                <Loader2 className="fk:h-5 fk:w-5 fk:mr-2 fk:animate-spin" />
              ) : (
                <Mail className="fk:w-5 fk:h-5 fk:mr-2" />
              )}
              Continue with Email
            </Button>
            <Button
              className="fk:w-full fk:text-link"
              onClick={() => {
                setIsEmailLogin(false);
              }}
              variant="link"
            >
              ← Other Login options
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
