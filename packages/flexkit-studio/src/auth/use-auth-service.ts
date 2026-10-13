'use client';

import useSWR from 'swr';
import { useHref, useParams } from 'react-router-dom';
import { apiPaths } from '../core/api-paths';
import type { AuthService, User } from './types';

export default function useAuthService(): AuthService {
  const { projectId } = useParams();
  // Absolute path of the current project under the router basename.
  const projectHref = useHref(`/${projectId ?? ''}`);
  const { data: user, isLoading: isLoadingUser } = useSWR(apiPaths(projectId ?? '').currentUser, (url: string) =>
    fetch(url, { mode: 'cors', credentials: 'include' })
      .then((res) => res.json() as Promise<User>)
      .then((data) => ({ ...data, spaces: data.spaces ?? [] }))
  );
  const isLoading = isLoadingUser;

  return [
    isLoading,
    {
      user,
      logout: async () => {
        // wipe remote session
        await fetch(apiPaths(projectId ?? '').logout(projectHref), {
          method: 'POST',
          mode: 'cors',
          credentials: 'include',
        });

        // delete first-party auth cookie
        await fetch('/api/flexkit/logout', { method: 'GET', credentials: 'include' });

        window.location.reload();
      },
    },
  ];
}
