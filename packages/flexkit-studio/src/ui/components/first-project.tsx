import type { JSX } from 'react';
import { useHref } from 'react-router-dom';
import { signOutHosted } from '../../auth/hosted-logout';
import type { HostedTeam, HostedUser } from '../../core/config/types';
import { Button } from '../primitives/button';
import { NewProjectFlow } from './new-project-flow';

/**
 * Hosted mode: the signed-in user has no project yet. New users create their
 * first one here; invited teammates see their project as soon as an owner
 * adds them, so the screen also says which email to be invited with.
 */
export function FirstProject({ teams, user }: { teams: HostedTeam[]; user: HostedUser }): JSX.Element {
  const rootHref = useHref('/');
  const firstName = user.displayName?.trim().split(/\s+/)[0];

  return (
    <div className="fk:flex fk:h-full fk:min-h-screen fk:items-center fk:justify-center fk:p-8 fk:bg-background">
      <div className="fk:flex fk:w-full fk:max-w-md fk:flex-col fk:gap-8">
        <div className="fk:flex fk:flex-col fk:gap-2 fk:text-center">
          <h1 className="fk:text-2xl fk:font-semibold">
            {firstName ? `Welcome to Flexkit, ${firstName}` : 'Welcome to Flexkit'}
          </h1>
          <p className="fk:text-sm fk:text-muted-foreground">
            Create a project for your store. It holds your data, your team and the AI agent that works on both.
          </p>
        </div>
        <NewProjectFlow askForName={!user.displayName?.trim()} isFirstProject teams={teams} />
        <div className="fk:flex fk:flex-col fk:items-center fk:gap-1 fk:border-t fk:border-border fk:pt-6 fk:text-center fk:text-sm fk:text-muted-foreground">
          <p>
            Joining a teammate? Ask them to invite <strong className="fk:text-foreground">{user.email}</strong>. Their
            project appears here once they do.
          </p>
          <Button
            className="fk:h-auto fk:p-0"
            onClick={() => {
              void signOutHosted(rootHref);
            }}
            variant="link"
          >
            Use a different account
          </Button>
        </div>
      </div>
    </div>
  );
}
