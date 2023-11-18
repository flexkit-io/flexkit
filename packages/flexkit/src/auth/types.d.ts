import type { JsonSchema, Scopes } from '../core/types';

export type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

export type ProjectConfig = {
  jsonSchema: JsonSchema;
  scopes: Scopes;
};

export type Credentials = {
  email: string;
  password: string;
};

export type Auth = {
  user: User | undefined;
  projectConfig: ProjectConfig | null;
  logout: () => Promise<void>;
};

export type AuthService = [boolean, Auth];
