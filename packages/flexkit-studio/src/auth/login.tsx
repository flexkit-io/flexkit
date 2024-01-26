'use client';

import { Fragment, useState } from 'react';
import useSWR from 'swr';
import { Navigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/primitives/button';
import { DarkModeSwitch } from '../ui/components/dark-mode-switch';
import { Loading } from '../ui/components/loading';
import { Label } from '../ui/primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/primitives/select';
import { apiPaths } from '../core/api-paths';
import { useConfig } from '../core/config/config-context';
import { useAuth } from './auth-context';

type Provider = {
  name: string;
  title: string;
  url: string;
  button: {
    variant: 'link' | 'default' | 'outline' | 'destructive' | 'ghost' | 'secondary';
    color: string;
    colorHover: string;
    backgroundColor: string;
    backgroundColorHover: string;
    iconUrl?: string;
  };
};

export function Login({ projectId }: { projectId: string }): JSX.Element {
  const { projects } = useConfig();
  const [selectedProject, setSelectedProject] = useState(projects[0]);
  const { data, error, isLoading } = useSWR(apiPaths(projectId).authProviders, (url: string) =>
    fetch(url, { mode: 'cors' }).then((res) => res.json() as Promise<{ providers: Provider[] }>)
  );
  const [isAuthLoading, auth] = useAuth();
  const copyrightYear = new Date().getFullYear();
  const currentRouterLocation = useLocation();
  const referal: string =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- generic "any" typing comes from react-router-dom
    currentRouterLocation.state?.from?.pathname ?? currentRouterLocation.pathname;

  const fromPath = referal.includes(selectedProject.projectId)
    ? `${location.origin}${referal}`
    : `${location.origin}${selectedProject.basePath}/${selectedProject.projectId}`;

  if (isLoading || isAuthLoading || !data) {
    return <Loading />;
  }

  if (auth.user?.id) {
    return <Navigate replace state={{ from: currentRouterLocation }} to={`${selectedProject.basePath}`} />;
  }

  if (error) throw error;

  return (
    <>
      <div className="fk-container fk-relative fk-h-[calc(100vh-3rem)] fk-flex fk-items-center fk-justify-center lg:fk-px-0">
        <div className="fk-w-full lg:fk-p-8">
          <div className="fk-mx-auto fk-flex fk-w-full fk-flex-col fk-justify-center sm:fk-w-[350px]">
            <h1 className="fk-mb-4 fk-text-2xl fk-text-center fk-font-medium fk-tracking-tight">
              Login to Flexkit Studio
            </h1>
            {projects.length > 1 ? (
              <div className="fk-flex-col fk-space-y-2 fk-mb-3">
                <Label className="fk-text-sm fk-font-normal fk-text-left fk-text-muted-foreground" htmlFor="project">
                  Select project
                </Label>
                <Select
                  defaultValue={selectedProject.projectId}
                  onValueChange={(id) => {
                    setSelectedProject(projects.find((project) => project.projectId === id) ?? projects[0]);
                  }}
                >
                  <SelectTrigger className="fk-mb-4 fk-w-full fk-h-9 fk-py-1" id="project">
                    <SelectValue aria-label={selectedProject.title}>{selectedProject.title}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.projectId} value={project.projectId}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <p className="fk-mt-2 fk-mb-2 fk-text-sm fk-text-left fk-text-muted-foreground">Choose login provider</p>
            <div className="fk-flex fk-flex-col fk-space-y-6">
              {data.providers.map((provider: Provider) => (
                <Fragment key={provider.name}>
                  {provider.button.variant === 'link' ? (
                    <a
                      className="fk-text-sm fk-text-center"
                      href={composeLoginHref({
                        url: provider.url,
                        projectId: selectedProject.projectId,
                        basePath: '/api/flexkit/get-token',
                        fromPath,
                      })}
                    >
                      {provider.title}
                    </a>
                  ) : (
                    <Button
                      asChild
                      className={`${provider.button.color} ${provider.button.backgroundColor} hover:${provider.button.colorHover} hover:${provider.button.backgroundColorHover}`}
                      key={provider.name}
                      type="button"
                      variant={provider.button.variant}
                    >
                      <a
                        href={composeLoginHref({
                          url: provider.url,
                          projectId: selectedProject.projectId,
                          basePath: '/api/flexkit/get-token',
                          fromPath,
                        })}
                      >
                        {provider.button.iconUrl ? (
                          <img
                            alt={provider.title}
                            className="fk-w-[20px] fk-h-[20px] fk-mr-2"
                            src={provider.button.iconUrl}
                          />
                        ) : null}
                        {provider.title}
                      </a>
                    </Button>
                  )}
                </Fragment>
              ))}
            </div>
            <div className="fk-flex fk-flex-col fk-items-center fk-pt-8">
              <svg className="fk-w-[7rem]" fill="none" viewBox="0 0 191 42" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M59.2923 38.5263H52.7518V19.433H49.5653V12.9332H52.7518V11.7145C52.7518 10.1373 53.0471 8.65569 53.638 7.26967C54.245 5.88368 55.0677 4.68089 56.1058 3.66131C57.16 2.62579 58.3817 1.81331 59.7713 1.22386C61.1609 0.618477 62.6464 0.315788 64.2276 0.315788H69.1388V6.81564H64.2276C63.5247 6.81564 62.8698 6.9431 62.2628 7.19798C61.6719 7.43696 61.1528 7.77948 60.7057 8.22554C60.2746 8.65569 59.9311 9.17344 59.6756 9.77882C59.4201 10.3683 59.2923 11.0135 59.2923 11.7145V12.9332H67.3182V19.433H59.2923V38.5263Z"
                  fill="currentColor"
                />
                <path d="M78.6099 38.5263H71.9802V0.315788H78.6099V38.5263Z" fill="currentColor" />
                <path
                  d="M93.8922 32.3923C94.146 32.4723 94.3998 32.5283 94.6536 32.5604C94.9074 32.5765 95.1615 32.5842 95.4153 32.5842C96.0497 32.5842 96.6606 32.4964 97.2476 32.3203C97.8346 32.1445 98.3817 31.8966 98.8896 31.5768C99.4131 31.2409 99.8732 30.841 100.27 30.3772C100.682 29.8973 101.015 29.3695 101.269 28.7937L106.029 33.616C105.426 34.4797 104.728 35.2553 103.934 35.9432C103.157 36.6308 102.308 37.2145 101.388 37.6944C100.484 38.1743 99.5241 38.534 98.5089 38.7741C97.5094 39.03 96.4782 39.1579 95.4153 39.1579C93.6225 39.1579 91.933 38.822 90.3465 38.1502C88.7759 37.4784 87.3957 36.5427 86.2058 35.3434C85.0319 34.1438 84.1038 32.7202 83.4218 31.0729C82.7395 29.4095 82.3983 27.5862 82.3983 25.6029C82.3983 23.5717 82.7395 21.7164 83.4218 20.037C84.1038 18.3576 85.0319 16.9262 86.2058 15.7426C87.3957 14.5591 88.7759 13.6394 90.3465 12.9836C91.933 12.3279 93.6225 12 95.4153 12C96.4782 12 97.5173 12.128 98.5325 12.3839C99.548 12.6398 100.508 13.0076 101.412 13.4875C102.332 13.9673 103.189 14.5591 103.982 15.2628C104.775 15.9505 105.473 16.7263 106.076 17.5899L93.8922 32.3923ZM97.2237 18.8854C96.9224 18.7735 96.6208 18.7015 96.3195 18.6695C96.0338 18.6375 95.7325 18.6215 95.4153 18.6215C94.5267 18.6215 93.6859 18.7895 92.8927 19.1253C92.1154 19.4452 91.4334 19.9091 90.8461 20.5168C90.2751 21.1246 89.823 21.8603 89.4898 22.724C89.1566 23.5717 88.9902 24.5313 88.9902 25.6029C88.9902 25.8428 88.9981 26.1147 89.0138 26.4186C89.0457 26.7225 89.0852 27.0344 89.133 27.3543C89.1965 27.6582 89.2679 27.9541 89.347 28.2419C89.4263 28.5298 89.5296 28.7858 89.6565 29.0097L97.2237 18.8854Z"
                  fill="currentColor"
                />
                <path
                  d="M132.911 38.5263H124.926L119.833 30.6401L114.693 38.5263H106.707L116.055 25.3265L106.707 12.6316H114.693L119.833 20.0129L124.926 12.6316H132.911L123.539 25.3265L132.911 38.5263Z"
                  fill="currentColor"
                />
                <path
                  d="M143.002 38.5263H136.383V0.315788H143.002V24.0898L151.557 12.9976H159.114L150.57 23.6485L159.114 38.5263H151.557L146.335 29.2367L143.002 34.0243V38.5263Z"
                  fill="currentColor"
                />
                <path
                  d="M169.848 5.93416C169.848 6.54038 169.727 7.10672 169.486 7.63317C169.262 8.15962 168.949 8.62224 168.547 9.02108C168.146 9.40396 167.672 9.71505 167.126 9.95433C166.596 10.1777 166.026 10.2893 165.416 10.2893C164.806 10.2893 164.228 10.1777 163.682 9.95433C163.152 9.71505 162.686 9.40396 162.285 9.02108C161.9 8.62224 161.586 8.15962 161.346 7.63317C161.121 7.10672 161.008 6.54038 161.008 5.93416C161.008 5.34388 161.121 4.78553 161.346 4.25908C161.586 3.71666 161.9 3.25403 162.285 2.87115C162.686 2.47232 163.152 2.16124 163.682 1.93789C164.228 1.6986 164.806 1.57895 165.416 1.57895C166.026 1.57895 166.596 1.6986 167.126 1.93789C167.672 2.16124 168.146 2.47232 168.547 2.87115C168.949 3.25403 169.262 3.71666 169.486 4.25908C169.727 4.78553 169.848 5.34388 169.848 5.93416ZM168.716 38.5263H162.092V12.8977H168.716V38.5263Z"
                  fill="currentColor"
                />
                <path
                  d="M186.938 38.5263C185.368 38.5263 183.892 38.2319 182.512 37.6429C181.131 37.0378 179.918 36.2178 178.871 35.183C177.839 34.1323 177.022 32.9145 176.419 31.5294C175.832 30.1442 175.539 28.6635 175.539 27.0874V19.4932H172.374V12.9976H175.539V0.315788H182.012V12.9976H189.106V19.4932H182.012V27.0874C182.012 27.772 182.139 28.4168 182.393 29.0218C182.646 29.6108 182.996 30.1282 183.44 30.574C183.884 31.0198 184.408 31.378 185.01 31.6487C185.613 31.9034 186.256 32.0308 186.938 32.0308H189.106V38.5263H186.938Z"
                  fill="currentColor"
                />
                <path
                  d="M19.8893 2.21053C34.8062 2.21053 39.7785 7.18421 39.7785 22.1053C39.7785 37.0263 34.8062 42 19.8893 42C4.97231 42 0 37.0263 0 22.1053C0 7.18421 4.97231 2.21053 19.8893 2.21053ZM14.7093 10.1053H7.26116L15.9804 21.9654L7.26116 34.2973H14.7093L17.4445 30.1161V14.0271L14.7093 10.1053ZM32.285 10.1053H24.8237L21.7835 14.4979V29.5995L24.8237 34.2973H32.285L23.528 21.9654L32.285 10.1053Z"
                  fill="currentColor"
                />
              </svg>
              <ul className="fk-flex fk-w-full fk-mt-4 fk-justify-center fk-text-xs fk-text-muted-foreground">
                <li className="fk-pr-6 after:fk-content-['|'] after:fk-pl-6">
                  <a className="fk-underline-offset-4 hover:fk-text-primary" href="https://www.flexkit.io">
                    flexkit.io
                  </a>
                </li>
                <li className="fk-pr-6 after:fk-content-['|'] after:fk-pl-6">
                  <a className="fk-underline-offset-4 hover:fk-text-primary" href="https://www.flexkit.io/docs">
                    Docs
                  </a>
                </li>
                <li className="">
                  <a
                    className="fk-underline-offset-4 hover:fk-text-primary"
                    href="https://www.flexkit.io/privacy-policy"
                  >
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        {/* workaround to allow Tailwind generate the classes for the login buttons, whose classes are added dynamically */}
        <div className="fk-hidden !fk-text-white !fk-bg-bitbucket hover:!fk-bg-bitbucket-hover" />
        <div className="fk-hidden !fk-bg-github hover:!fk-bg-github-hover" />
        <div className="fk-hidden !fk-text-muted-foreground !fk-bg-white hover:!fk-bg-accent" />
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

interface CreateHrefForProviderOptions {
  projectId: string;
  url: string;
  basePath: string;
  fromPath: string;
}

function composeLoginHref({ projectId, url, basePath, fromPath }: CreateHrefForProviderOptions): string {
  const params = new URLSearchParams();
  params.set('origin', `${location.origin}${basePath}`);
  params.set('projectId', projectId);
  params.set('redirect', fromPath);

  return `${url}?${params.toString()}`;
}
