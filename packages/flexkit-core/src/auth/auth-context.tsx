'use client';

import { createContext, useContext } from 'react';
import useAuthService from './use-auth-service';
import type { Auth, AuthService, User } from './types';

const AuthContext = createContext([
  true,
  {
    user: null as User | null,
    logout: () => Promise.resolve(),
  } as Auth,
]);

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [isLoading, auth] = useAuthService();

  return <AuthContext.Provider value={[isLoading, auth]}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthService {
  return useContext(AuthContext) as AuthService;
}
