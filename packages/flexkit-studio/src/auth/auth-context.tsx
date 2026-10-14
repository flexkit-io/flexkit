'use client';

import { createContext, JSX, useContext } from 'react';
import useAuthService from './use-auth-service';
import type { Auth, AuthService, User } from './types';
import type { StudioMode } from '../core/config/types';

const AuthContext = createContext([
  true,
  {
    user: null as User | null,
    logout: () => Promise.resolve(),
  } as Auth,
]);

export function AuthProvider({
  children,
  mode = 'projects',
}: {
  children: React.ReactNode;
  mode?: StudioMode;
}): JSX.Element {
  const [isLoading, auth] = useAuthService(mode);

  return <AuthContext.Provider value={[isLoading, auth]}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthService {
  return useContext(AuthContext) as AuthService;
}
