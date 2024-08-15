import { AuthConfig, GlobalConfig } from '../../types';

export const defaultGlobalConfig: GlobalConfig = {
  '// Note': 'This is your Flexkit config file. For more information see the global configuration documentation.',
  '// Docs': 'https://flexkit.io/docs/projects/project-configuration/global-configuration#config.json',
  collectMetrics: true,
};

export const defaultAuthConfig: AuthConfig = {
  '// Note': 'This is your Flexkit credentials file. DO NOT SHARE!',
  '// Docs': 'https://flexkit.io/docs/projects/project-configuration/global-configuration#auth.json',
};
