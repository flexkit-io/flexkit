'use client';

import useSWR from 'swr';
import { apiPaths } from '../core/api-paths';
// eslint-disable-next-line -- remove this after removing the temp schema
import type { AuthService, ProjectConfig, User } from './types';
// import { schema } from './temp-schema'; // TODO: delete this once finished testing the new schema

export default function useAuthService(): AuthService {
  const { data: user, isLoading: isLoadingUser } = useSWR(apiPaths.currentUser, (url: string) =>
    fetch(url, { mode: 'cors' }).then((res) => res.json() as Promise<User>)
  );
  // const { data: schema, isLoading: isLoadingSchema } = useSWR(
  //   () => (user ? apiPaths.schema : null),
  //   (url: string) => fetch(url, { mode: 'cors' }).then((res) => res.json() as Promise<ProjectConfig>)
  // );
  const isLoadingSchema = false; // TODO: delete this once finished testing the new schema
  const isLoading = isLoadingUser || isLoadingSchema;

  return [
    isLoading,
    {
      user,
      projectConfig: {
        jsonSchema: [], // schema?.jsonSchema || [],
        scopes: {}, // schema?.scopes || {},
      },
      logout: async () => {
        await fetch(apiPaths.logout, { method: 'POST', mode: 'cors' });

        // TODO: delete auth cookie
      },
    },
  ];
}
