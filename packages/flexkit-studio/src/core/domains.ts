import { getDesktop } from './desktop';

const defaultFlexkitDomain = 'flexkit.io';

const allowedFlexkitDomains: { [domain: string]: true } = {
  'flexkit.io': true,
  'flexkit.test': true,
};

type GlobalWithProcessEnv = typeof globalThis & {
  process?: {
    env?: {
      [key: string]: string | undefined;
    };
  };
};

function getConfiguredFlexkitDomain(): string {
  // The desktop app says which backend it was built for; a `process.env`
  // inside its renderer is a polyfill that any dependency may replace.
  const configuredDomain = (getDesktop()?.domain ?? (globalThis as GlobalWithProcessEnv).process?.env?.FLEXKIT_DOMAIN)?.trim();

  if (!configuredDomain) {
    return defaultFlexkitDomain;
  }

  if (allowedFlexkitDomains[configuredDomain]) {
    return configuredDomain;
  }

  return defaultFlexkitDomain;
}

export const flexkitDomain = getConfiguredFlexkitDomain();
export const flexkitApiDomain = `api.${flexkitDomain}`;
