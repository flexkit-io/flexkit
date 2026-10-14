import type { JSX } from 'react';
import { useHref } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import { signOutHosted } from '../../auth/hosted-logout';
import { flexkitDomain } from '../../core/domains';
import type { HostedUser } from '../../core/config/types';
import { Button } from '../primitives/button';

/** Hosted mode: the signed-in user is not a member of any project yet. */
export function NoProjects({ user }: { user: HostedUser }): JSX.Element {
  const rootHref = useHref('/');

  return (
    <div className="fk:flex fk:h-full fk:min-h-screen fk:items-center fk:justify-center fk:p-8 fk:bg-background">
      <div className="fk:flex fk:max-w-md fk:flex-col fk:items-center fk:gap-4 fk:text-center">
        <FolderOpen className="fk:h-10 fk:w-10 fk:text-muted-foreground" />
        <h1 className="fk:text-xl fk:font-medium">No projects yet</h1>
        <p className="fk:text-sm fk:text-muted-foreground">
          {user.email} is not a member of any Flexkit project. Create one in the Dashboard, or ask a project owner to
          invite you, then come back here.
        </p>
        <div className="fk:flex fk:gap-3">
          <Button asChild>
            <a href={`https://${flexkitDomain}/dashboard`}>Open Dashboard</a>
          </Button>
          <Button
            onClick={() => {
              void signOutHosted(rootHref);
            }}
            variant="outline"
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
