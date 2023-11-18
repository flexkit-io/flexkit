'use client';

import useSWR from 'swr';
import { apiPaths } from '../core/api-paths';
// import FlexkitLogo from '../ui/assets/flexkit.svg';

type Provider = {
  name: string;
  title: string;
  url: string;
  button: {
    variant: 'text' | 'outlined' | 'contained';
    color: string;
    colorHover: string;
    backgroundColor: string;
    backgroundColorHover: string;
    iconUrl?: string;
  };
};

export default function Login(): JSX.Element {
  const projectId = process.env.NEXT_PUBLIC_FLEXKIT_PROJECT_ID ?? '';
  const { data, error, isLoading } = useSWR(apiPaths.authProviders, (url: string) =>
    fetch(url, { mode: 'cors' }).then((res) => res.json() as Promise<{ providers: Provider[] }>)
  );

  if (isLoading || !data) {
    // TODO: use loading component
    return <div>Loading...</div>;
  }

  if (error) throw error;

  // const buttons = data.providers.map((provider: Provider) =>
  //   styled(Button)<ButtonProps>(() => ({
  //     color: provider.button.color,
  //     backgroundColor: provider.button.backgroundColor,
  //     fontWeight: provider.button.variant === 'text' ? 400 : 500,
  //     '&:hover': {
  //       color: provider.button.colorHover,
  //       backgroundColor: provider.button.backgroundColorHover,
  //     },
  //     marginBottom: '0.75rem !important',
  //   }))
  // );

  return (
    <div className="flex flex-col justify-center w-full max-w-[360px] mt-[50px] mx-auto">
      {/* <FlexkitLogo className="svg-responsive-height md: hidden mb-12 h-[26px]" /> */}
      <h1 className="mb-10 text-center md:text-left">Log in to Flexkit</h1>
      {/* {buttons.map((LoginButton, index: number) => (
        <LoginButton
          className="w-full"
          href={composeLoginHref({ url: data.providers[index].url, projectId, basePath: '/api/auth/get-token' })}
          key={data.providers[index].title}
          size="large"
          startIcon={
            Boolean(data.providers[index].button.iconUrl) && (
              <img
                alt={data.providers[index].title}
                className="w-[22px] h-[22px]"
                src={data.providers[index].button.iconUrl}
              />
            )
          }
          variant={data.providers[index].button.variant}
        >
          {data.providers[index].title}
        </LoginButton>
      ))} */}
    </div>
  );
}

interface CreateHrefForProviderOptions {
  projectId: string;
  url: string;
  basePath: string;
}

function composeLoginHref({ projectId, url, basePath }: CreateHrefForProviderOptions): string {
  const params = new URLSearchParams();
  params.set('origin', `${location.origin}${basePath}`);
  params.set('projectId', projectId);

  return `${url}?${params.toString()}`;
}
