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
  const configuredDomain = (globalThis as GlobalWithProcessEnv).process?.env?.FLEXKIT_DOMAIN?.trim();

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
