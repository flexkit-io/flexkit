'use client';

import useSWR from 'swr';
import { useParams } from 'react-router-dom';
import { apiPaths } from '../core/api-paths';
// eslint-disable-next-line -- remove this after removing the temp schema
import type { AuthService, ProjectConfig, User } from './types';
// import { schema } from './temp-schema'; // TODO: delete this once finished testing the new schema

export default function useAuthService(): AuthService {
  const { projectId } = useParams();
  const { data: user, isLoading: isLoadingUser } = useSWR(apiPaths(projectId ?? '').currentUser, (url: string) =>
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
        // wipe remote session
        await fetch(apiPaths(projectId ?? '').logout('/studio'), { method: 'POST', mode: 'cors' });

        // delete first-party auth cookie
        await fetch('/api/flexkit/logout', { method: 'GET' });

        window.location.reload();
      },
    },
  ];
}
