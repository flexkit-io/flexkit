'use client';

import { useEffect, useState } from 'react';
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
import { apiPaths, baseApiUrl } from '../core/api-paths';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
});

export default function EmailLogin({
  projectId,
  setIsEmailLogin,
}: {
  projectId: string;
  setIsEmailLogin: Dispatch<SetStateAction<boolean>>;
}): JSX.Element {
  const [hasOtpExpired, setHasOtpExpired] = useState(false);
  const [shouldSendOtp, setShouldSendOtp] = useState(false);
  const { mutate } = useSWRConfig();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });
  const sendOtpUrl = new URL(apiPaths(projectId).loginOtpSend, baseApiUrl);
  const { data, error, isLoading } = useSWR(
    shouldSendOtp ? sendOtpUrl.href : null,
    (url: string) =>
      fetch(url, { method: 'POST', mode: 'cors', body: JSON.stringify({ email: form.getValues('email') }) }).then(
        (res) => res.json() as Promise<{ token: string } | { error: { message: string; code: string } } | undefined>
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

  useEffect(() => {
    if (!hasOtpBeenSent) {
      return;
    }

    let calls = 0;
    const interval = setInterval(() => {
      // Start polling to check for email confirmation
      // if email is confirmed, redirect to dashboard
      if (calls > 100) {
        clearInterval(interval);
        setHasOtpExpired(true);

        return;
      }

      const confirmOtpUrl = new URL(apiPaths(projectId).loginOtpConfirm, baseApiUrl);
      const setTokenUrl = '/api/flexkit/set-token';
      fetch(`${confirmOtpUrl.href}?email=${form.getValues('email')}&token=${token}`)
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
                  .then(() => {
                    window.location.reload();
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
      calls++;
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [form, hasOtpBeenSent, projectId, token]);

  function handleEmailLogin(): void {
    setHasOtpExpired(false);
    setShouldSendOtp(true);
    void mutate(sendOtpUrl.href);
  }

  return (
    <div className="fk-w-full">
      {hasOtpBeenSent ? (
        <Alert variant="success">
          <AlertDescription>
            Keep this window open and in a new tab open the link we just sent to:{' '}
            <strong>{form.getValues('email')}</strong> (
            <Button
              className="fk-p-0 hover:fk-underline dark:fk-text-background"
              onClick={() => {
                window.location.reload();
              }}
              variant="link"
            >
              undo
            </Button>
            )
          </AlertDescription>
        </Alert>
      ) : (
        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(handleEmailLogin)(event)}
            className="fk-w-full fk-space-y-3 fk-mb-10"
          >
            {errorCode === 'not_exists' && (
              <Alert variant="destructive">
                <AlertDescription>
                  There is no Flexkit account associated with this email address.{' '}
                  <a
                    className="fk-text-black/90 dark:fk-text-white/90 fk-underline"
                    href={`https://flexkit.io/signup/email?email=${form.getValues('email')}`}
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
                    className="fk-p-0 hover:fk-underline"
                    onClick={() => {
                      window.location.reload();
                    }}
                    variant="link"
                  >
                    Try again
                  </Button>
                  .{' '}
                </AlertDescription>
              </Alert>
            ) : null}
            {hasOtpExpired ? (
              <Alert variant="destructive">
                <AlertDescription>
                  The email verification link may have expired. Please{' '}
                  <Button
                    className="fk-p-0 hover:fk-underline"
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
            <Button aria-disabled={isLoading} className="fk-w-full" type="submit" disabled={Boolean(isLoading)}>
              {isLoading ? (
                <Loader2 className="fk-h-5 fk-w-5 fk-mr-2 fk-animate-spin" />
              ) : (
                <Mail className="fk-w-5 fk-h-5 fk-mr-2" />
              )}
              Continue with Email
            </Button>
            <Button
              className="fk-w-full fk-text-link"
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
