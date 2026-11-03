import { useId, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { createHostedProject, newProjectPath, ownedTeams } from '../../core/config/create-project';
import type { HostedTeam } from '../../core/config/types';
import { refreshHostedSession } from '../../core/config/use-hosted-session';
import { Alert, AlertDescription } from '../primitives/alert';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input';
import { Label } from '../primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';

const NAME_PATTERN = /^[\p{L}\p{N}\s_'-]+$/u;

function validateName(name: string): string | null {
  const trimmed = name.trim();

  if (!trimmed) {
    return 'Give your project a name.';
  }

  if (trimmed.length > 48) {
    return 'Project names can be up to 48 characters.';
  }

  if (!NAME_PATTERN.test(trimmed)) {
    return 'Use letters, numbers, spaces, apostrophes, underscores or dashes.';
  }

  return null;
}

/**
 * Hosted mode: name a project and create it. The backend puts it on the Free
 * plan with the user as owner (a user who owns no team gets a personal one),
 * then the Studio opens the new project's AI chat.
 */
export function CreateProjectForm({
  autoFocus = false,
  isFirstProject = false,
  onCancel,
  onCreated,
  submitLabel = 'Create project',
  teams,
}: {
  autoFocus?: boolean;
  /**
   * The user has no project yet, so the Studio shows this form at `/`. Navigate
   * before refreshing the session: once `/api/me` lists the project, `/` would
   * redirect to the project root instead of its AI chat.
   */
  isFirstProject?: boolean;
  onCancel?: () => void;
  /** Called with the new project's id right before the Studio opens it. */
  onCreated?: (projectId: string) => void;
  submitLabel?: string;
  teams: HostedTeam[];
}): JSX.Element {
  const navigate = useNavigate();
  const nameId = useId();
  const teamId = useId();
  const owned = ownedTeams(teams);
  const [name, setName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState(owned[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(): Promise<void> {
    const invalid = validateName(name);

    if (invalid) {
      setError(invalid);

      return;
    }

    setError(null);
    setIsSubmitting(true);

    // No owned team yet: let the backend create the personal team.
    const outcome = await createHostedProject({
      name: name.trim(),
      ...(selectedTeamId ? { teamId: selectedTeamId } : {}),
    });

    if (!outcome.ok) {
      setError(outcome.message);
      setIsSubmitting(false);

      return;
    }

    onCreated?.(outcome.projectId);

    // Inside a project the Studio only opens ids `/api/me` listed, so refresh first there.
    if (isFirstProject) {
      navigate(newProjectPath(outcome.projectId));
      await refreshHostedSession();
    } else {
      await refreshHostedSession();
      navigate(newProjectPath(outcome.projectId));
    }
  }

  return (
    <form
      className="fk:flex fk:w-full fk:flex-col fk:gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="fk:flex fk:flex-col fk:gap-2">
        <Label htmlFor={nameId}>Project name</Label>
        <Input
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={isSubmitting}
          id={nameId}
          maxLength={48}
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder="e.g. Aven Living"
          value={name}
        />
        <p className="fk:text-xs fk:text-muted-foreground">
          Usually your store or company name. You can change it later.
        </p>
      </div>
      {owned.length > 1 ? (
        <div className="fk:flex fk:flex-col fk:gap-2">
          <Label htmlFor={teamId}>Team</Label>
          <Select disabled={isSubmitting} onValueChange={setSelectedTeamId} value={selectedTeamId}>
            <SelectTrigger id={teamId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {owned.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="fk:flex fk:justify-end fk:gap-2">
        {onCancel ? (
          <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="outline">
            Cancel
          </Button>
        ) : null}
        <Button className={onCancel ? undefined : 'fk:w-full'} disabled={isSubmitting} type="submit">
          {isSubmitting ? <Loader2 className="fk:h-4 fk:w-4 fk:animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
