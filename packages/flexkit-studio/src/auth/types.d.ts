export type User = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  role: string;
  /** Space codes the user belongs to (owners receive every project space). */
  spaces: string[];
};

export type Credentials = {
  email: string;
  password: string;
};

export type Auth = {
  user: User | undefined;
  logout: (projectId: string) => Promise<void>;
};

export type AuthService = [boolean, Auth];
