export type User = {
  id: string;
  email: string;
  display_name: string;
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
