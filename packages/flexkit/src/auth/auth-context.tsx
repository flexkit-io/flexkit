'use client';

import { createContext, useContext } from 'react';
import { Loading } from '../ui/components/loading';
import useAuthService from './use-auth-service';
import type { Auth, AuthService, User, ProjectConfig } from './types';
import Login from './login';

const AuthContext = createContext([
  true,
  {
    user: null as User | null,
    projectConfig: null as ProjectConfig | null,
    logout: () => Promise.resolve(),
  } as Auth,
]);

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [isLoading, auth] = useAuthService();

  if (isLoading) {
    return <Loading />;
  }

  return <AuthContext.Provider value={[isLoading, auth]}>{auth.user?.id ? children : <Login />}</AuthContext.Provider>;
}

export function useAuth(): AuthService {
  return useContext(AuthContext) as AuthService;
}
