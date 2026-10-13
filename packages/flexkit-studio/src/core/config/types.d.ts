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

export interface FlexkitStudioProps {
  /** Ids of the projects this Studio can open. The first one is the default. */
  projectIds: string[];
  /** Path the host mounts the Studio under, e.g. `/studio`. Defaults to `/`. */
  basename?: string;
}
