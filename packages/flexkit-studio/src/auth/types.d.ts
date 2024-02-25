export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  role: string;
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
