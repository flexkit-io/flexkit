import { useId, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { createHostedProject, newProjectPath, ownedTeams } from '../../core/config/create-project';
import type { HostedTeam } from '../../core/config/types';
import { rememberCreatedProject } from '../../core/config/use-hosted-session';
import { Alert, AlertDescription } from '../primitives/alert';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input';
import { Label } from '../primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';

/** Only what the field can tell; the backend owns the character rules and says what it refuses. */
function validateName(name: string): string | null {
  const trimmed = name.trim();

  if (!trimmed) {
    return 'Give your project a name.';
  }

  if (trimmed.length > 48) {
    return 'Project names can be up to 48 characters.';
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
   * The user has no project yet, so the Studio shows this form at `/`. Leave
   * `/` before the session lists the project: there, `/` redirects to the
   * project root instead of its AI chat.
   */
  isFirstProject?: boolean;
  onCancel?: () => void;
  /** Called with the new project's id once the Studio opened it. */
  onCreated?: (projectId: string) => void;
  submitLabel?: string;
  teams: HostedTeam[];
}): JSX.Element {
  const navigate = useNavigate();
  const nameId = useId();
  const teamId = useId();
  const owned = ownedTeams(teams);
  const [name, setName] = useState('');
  const [pickedTeamId, setPickedTeamId] = useState<string | null>(null);
  // Follow the teams prop: a pick that is no longer owned falls back to the first owned team.
  const selectedTeamId = owned.some((team) => team.id === pickedTeamId) ? (pickedTeamId ?? '') : (owned[0]?.id ?? '');
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

    const path = newProjectPath(outcome.project.id);

    // Inside a project the Studio only opens ids the session lists, so add it first there.
    if (isFirstProject) {
      navigate(path);
      await rememberCreatedProject(outcome);
    } else {
      await rememberCreatedProject(outcome);
      navigate(path);
    }

    onCreated?.(outcome.project.id);
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
          <Select disabled={isSubmitting} onValueChange={setPickedTeamId} value={selectedTeamId}>
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
