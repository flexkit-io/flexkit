export type User = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  role: string;
  /** Space codes the user belongs to (owners receive every project space). */
  spaces: string[];
  /**
   * What the role may do in this project. Absent on older backends; read it
   * through `resolveCapabilities` (or the `useCan…` hooks), which fall back to the role.
   */
  capabilities?: {
    canCreatePersonalAutomations?: boolean;
    canDeleteRecords?: boolean;
    canImportRecords?: boolean;
    canManageKnowledge?: boolean;
    canRunBulkChanges?: boolean;
  };
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
