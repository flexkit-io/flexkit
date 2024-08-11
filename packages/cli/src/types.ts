export interface AuthConfig {
  '// Note'?: string;
  '// Docs'?: string;
  token?: string;
  skipWrite?: boolean;
}

export interface GlobalConfig {
  '// Note'?: string;
  '// Docs'?: string;
  currentTeam?: string;
  collectMetrics?: boolean;
  api?: string;
}

export const fileNameSymbol = Symbol('fileName');

export interface FlexkitConfig {
  [fileNameSymbol]?: string;
  name?: string;
  meta?: string[];
  version?: number;
  public?: boolean;
  env?: Dictionary<string>;
  build?: {
    env?: Dictionary<string>;
  };
  builds?: Builder[];
  routes?: Route[];
  files?: string[];
  cleanUrls?: boolean;
  rewrites?: Rewrite[];
  redirects?: Redirect[];
  headers?: Header[];
  trailingSlash?: boolean;
  functions?: BuilderFunctions;
  github?: DeploymentGithubData;
  scope?: string;
  alias?: string | string[];
  regions?: string[];
  projectSettings?: ProjectSettings;
  buildCommand?: string | null;
  ignoreCommand?: string | null;
  devCommand?: string | null;
  installCommand?: string | null;
  framework?: string | null;
  outputDirectory?: string | null;
  images?: Images;
  crons?: Cron[];
}
