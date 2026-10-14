import type { JSX, ReactNode } from 'react';
import type { ProjectSchemaResponse } from '@flexkit/schema';

/** A built-in Studio app (Desk, Asset Manager, Explorer, AI). */
export interface AppOptions {
  name: string;
  title: string;
  icon?: JSX.Element;
  component: ReactNode;
  routes?: AppRoute[];
}

export interface AppRoute {
  path: string;
  component: ReactNode;
  children?: AppRoute[];
}

/**
 * A project as the Studio renders it: the deployed schema fetched from
 * `GET /<projectId>/api/schema`, plus the reserved asset and tag entities the
 * Studio appends itself.
 */
export type ProjectUiConfig = ProjectSchemaResponse;

/** Why a project's schema could not be loaded. */
export type ProjectSchemaError = {
  /** HTTP status, or 0 when the request itself failed. */
  status: number;
  message: string;
};

/** How the Studio learned which projects it can open. */
export type StudioMode = 'hosted' | 'projects';

/** A project as listed for the signed-in user, before its schema is loaded (hosted mode). */
export interface ProjectSummary {
  avatarUrl: string | null;
  id: string;
  name: string;
  readOnly: boolean;
  /** Project role, or `owner` for team owners without a seat. Display only; permissions come from `/users/me`. */
  role: string;
  suspended: boolean;
  team: { id: string; name: string };
}

export interface HostedUser {
  avatarUrl: string | null;
  displayName: string | null;
  email: string;
  id: string;
}

export interface FlexkitStudioProps {
  /**
   * Ids of the projects this Studio can open; the first one is the default.
   * Omit it to run in hosted mode: the Studio signs the user in once and
   * lists every project they can access.
   */
  projectIds?: string[];
  /** Path the host mounts the Studio under, e.g. `/studio`. Defaults to `/`. */
  basename?: string;
}
