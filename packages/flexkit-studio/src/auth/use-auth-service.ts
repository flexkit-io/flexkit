'use client';

import useSWR from 'swr';
import { useHref, useParams } from 'react-router-dom';
import { apiPaths } from '../core/api-paths';
import type { StudioMode } from '../core/config/types';
import { signOutHosted } from './hosted-logout';
import type { AuthService, User } from './types';

export default function useAuthService(mode: StudioMode = 'projects'): AuthService {
  const { projectId } = useParams();
  // Absolute path of the current project under the router basename.
  const projectHref = useHref(`/${projectId ?? ''}`);
  const rootHref = useHref('/');
  // Role and spaces are per project, so there is nothing to ask until a project is open.
  const { data: user, isLoading: isLoadingUser } = useSWR(projectId ? apiPaths(projectId).currentUser : null, (url: string) =>
    fetch(url, { mode: 'cors', credentials: 'include' })
      .then((res) => res.json() as Promise<User>)
      .then((data) => ({ ...data, spaces: data.spaces ?? [] }))
  );
  const isLoading = Boolean(projectId) && isLoadingUser;

  return [
    isLoading,
    {
      user,
      logout: async () => {
        if (mode === 'hosted') {
          await signOutHosted(rootHref);

          return;
        }

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
