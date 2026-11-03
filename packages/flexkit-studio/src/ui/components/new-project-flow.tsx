import { useId, useState, type JSX, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageSquareText, ShoppingBag, Sparkles, type LucideIcon } from 'lucide-react';
import { createHostedProject, newProjectPath, ownedTeams } from '../../core/config/create-project';
import {
  applyStarter,
  describeBusinessPrompt,
  saveDisplayName,
  toProjectStart,
  validateProjectName,
  type OnboardingNavigationState,
  type ProjectStart,
} from '../../core/config/onboarding';
import type { HostedTeam } from '../../core/config/types';
import { rememberCreatedProject, rememberDisplayName } from '../../core/config/use-hosted-session';
import { cn } from '../lib/utils';
import { Alert, AlertDescription } from '../primitives/alert';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input';
import { Label } from '../primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';
import { Switch } from '../primitives/switch';
import { Textarea } from '../primitives/textarea';

type Step = 'you' | 'project' | 'start';
type StartKind = ProjectStart['kind'];

/**
 * Hosted mode: create a project in at most three short steps. Your name (only
 * when the account has none, e.g. an email sign-up), the project name, and how
 * to start: the commerce starter (schema plus an optional sample store), a
 * description the agent turns into a schema, or an empty project. The project
 * then opens in its AI chat.
 */
export function NewProjectFlow({
  askForName = false,
  isFirstProject = false,
  onCancel,
  onCreated,
  teams,
}: {
  /** Ask for the user's own name first. */
  askForName?: boolean;
  /**
   * The user has no project yet, so the Studio shows this at `/`. Leave `/`
   * before the session lists the project: there, `/` redirects to the project
   * root instead of its AI chat.
   */
  isFirstProject?: boolean;
  onCancel?: () => void;
  /** Called with the new project's id once the Studio opened it. */
  onCreated?: (projectId: string) => void;
  teams: HostedTeam[];
}): JSX.Element {
  const navigate = useNavigate();
  const ids = { you: useId(), name: useId(), team: useId(), description: useId(), sample: useId() };
  const owned = ownedTeams(teams);
  const [step, setStep] = useState<Step>(askForName ? 'you' : 'project');
  const [displayName, setDisplayName] = useState('');
  const [name, setName] = useState('');
  const [pickedTeamId, setPickedTeamId] = useState<string | null>(null);
  // Follow the teams prop: a pick that is no longer owned falls back to the first owned team.
  const selectedTeamId = owned.some((team) => team.id === pickedTeamId) ? (pickedTeamId ?? '') : (owned[0]?.id ?? '');
  const [startKind, setStartKind] = useState<StartKind>('starter');
  const [sampleData, setSampleData] = useState(true);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitName(): Promise<void> {
    const trimmed = displayName.trim();

    if (!trimmed) {
      setError('Tell us your name.');

      return;
    }

    setError(null);
    setIsSubmitting(true);

    const outcome = await saveDisplayName(trimmed);

    setIsSubmitting(false);

    if (!outcome.ok) {
      setError(outcome.message);

      return;
    }

    await rememberDisplayName(trimmed);
    setStep('project');
  }

  function submitProjectName(): void {
    const invalid = validateProjectName(name);

    setError(invalid);

    if (!invalid) {
      setStep('start');
    }
  }

  async function createProject(): Promise<void> {
    if (startKind === 'describe' && !description.trim()) {
      setError('Describe your business in a sentence or two, or pick another way to start.');

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

      if (outcome.code === 'invalid_name') {
        setStep('project');
      }

      return;
    }

    const projectId = outcome.project.id;
    const start = toProjectStart(startKind, sampleData, description);
    let state: OnboardingNavigationState = {};

    if (start.kind === 'starter') {
      // The project exists either way; the chat shows the starter's progress, or its failure with a retry.
      await applyStarter(projectId, { template: start.template, sampleData: start.sampleData });
    } else if (start.kind === 'describe') {
      state = { onboardingPrompt: describeBusinessPrompt(start.description) };
    }

    const path = newProjectPath(projectId);

    // Inside a project the Studio only opens ids the session lists, so add it first there.
    if (isFirstProject) {
      navigate(path, { state });
      await rememberCreatedProject(outcome);
    } else {
      await rememberCreatedProject(outcome);
      navigate(path, { state });
    }

    onCreated?.(projectId);
  }

  const errorAlert = error ? (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;

  if (step === 'you') {
    return (
      <StepForm onSubmit={() => void submitName()}>
        <div className="fk:flex fk:flex-col fk:gap-2">
          <Label htmlFor={ids.you}>Your name</Label>
          <Input
            autoComplete="name"
            autoFocus
            disabled={isSubmitting}
            id={ids.you}
            maxLength={80}
            onChange={(event) => {
              setDisplayName(event.target.value);
            }}
            placeholder="e.g. Ann Meyer"
            value={displayName}
          />
          <p className="fk:text-xs fk:text-muted-foreground">Your teammates see it on changes and comments.</p>
        </div>
        {errorAlert}
        <StepActions isSubmitting={isSubmitting} submitLabel="Continue" />
      </StepForm>
    );
  }

  if (step === 'project') {
    return (
      <StepForm onSubmit={submitProjectName}>
        <div className="fk:flex fk:flex-col fk:gap-2">
          <Label htmlFor={ids.name}>Project name</Label>
          <Input
            aria-invalid={error ? true : undefined}
            autoComplete="off"
            autoFocus
            id={ids.name}
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
            <Label htmlFor={ids.team}>Team</Label>
            <Select onValueChange={setPickedTeamId} value={selectedTeamId}>
              <SelectTrigger id={ids.team}>
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
        {errorAlert}
        <StepActions onCancel={onCancel} submitLabel="Continue" />
      </StepForm>
    );
  }

  return (
    <StepForm onSubmit={() => void createProject()}>
      <div className="fk:flex fk:flex-col fk:gap-2">
        <p className="fk:text-sm fk:font-medium" id={`${ids.name}-start`}>
          How do you want to start?
        </p>
        <div aria-labelledby={`${ids.name}-start`} className="fk:flex fk:flex-col fk:gap-2" role="radiogroup">
          <StartOption
            checked={startKind === 'starter'}
            description="22 ready-made entities for catalog, inventory, orders, customers and marketing, with EU, UK and US markets."
            disabled={isSubmitting}
            icon={ShoppingBag}
            onSelect={() => {
              setStartKind('starter');
            }}
            recommended
            title="Commerce starter"
          >
            <div className="fk:flex fk:items-center fk:justify-between fk:gap-3 fk:pt-1">
              <Label className="fk:text-xs fk:font-normal fk:text-muted-foreground" htmlFor={ids.sample}>
                Add a sample store (Aven Living) to try things out
              </Label>
              <Switch checked={sampleData} disabled={isSubmitting} id={ids.sample} onCheckedChange={setSampleData} />
            </div>
          </StartOption>
          <StartOption
            checked={startKind === 'describe'}
            description="Tell the agent what you sell and how you work; it proposes a schema for you to review."
            disabled={isSubmitting}
            icon={MessageSquareText}
            onSelect={() => {
              setStartKind('describe');
            }}
            title="Describe your business"
          >
            <Textarea
              aria-label="Your business"
              autoFocus
              disabled={isSubmitting}
              id={ids.description}
              maxLength={2000}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
              placeholder="e.g. We sell handmade ceramics online and to 40 shops in Europe, with seasonal collections."
              rows={3}
              value={description}
            />
          </StartOption>
          <StartOption
            checked={startKind === 'empty'}
            description="Start with an empty project and build the schema in the chat."
            disabled={isSubmitting}
            icon={Sparkles}
            onSelect={() => {
              setStartKind('empty');
            }}
            title="Start from scratch"
          />
        </div>
      </div>
      {errorAlert}
      <StepActions
        isSubmitting={isSubmitting}
        onBack={() => {
          setError(null);
          setStep('project');
        }}
        submitLabel="Create project"
      />
    </StepForm>
  );
}

function StepForm({ children, onSubmit }: { children: ReactNode; onSubmit: () => void }): JSX.Element {
  return (
    <form
      className="fk:flex fk:w-full fk:flex-col fk:gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}

function StepActions({
  isSubmitting = false,
  onBack,
  onCancel,
  submitLabel,
}: {
  isSubmitting?: boolean;
  onBack?: () => void;
  onCancel?: () => void;
  submitLabel: string;
}): JSX.Element {
  const secondary = onBack ?? onCancel;

  return (
    <div className="fk:flex fk:justify-end fk:gap-2">
      {secondary ? (
        <Button disabled={isSubmitting} onClick={secondary} type="button" variant="outline">
          {onBack ? 'Back' : 'Cancel'}
        </Button>
      ) : null}
      <Button className={secondary ? undefined : 'fk:w-full'} disabled={isSubmitting} type="submit">
        {isSubmitting ? <Loader2 className="fk:h-4 fk:w-4 fk:animate-spin" /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}

function StartOption({
  checked,
  children,
  description,
  disabled,
  icon: Icon,
  onSelect,
  recommended = false,
  title,
}: {
  checked: boolean;
  children?: ReactNode;
  description: string;
  disabled: boolean;
  icon: LucideIcon;
  onSelect: () => void;
  recommended?: boolean;
  title: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        'fk:rounded-lg fk:border fk:p-3 fk:transition-colors',
        checked
          ? 'fk:border-foreground/70 fk:bg-muted/50 fk:ring-1 fk:ring-foreground/20'
          : 'fk:border-border fk:hover:bg-muted/30'
      )}
    >
      <button
        aria-checked={checked}
        className="fk:flex fk:w-full fk:items-start fk:gap-3 fk:text-left fk:disabled:opacity-60"
        disabled={disabled}
        onClick={onSelect}
        role="radio"
        type="button"
      >
        <Icon className="fk:mt-0.5 fk:h-4 fk:w-4 fk:shrink-0 fk:text-muted-foreground" />
        <span className="fk:flex fk:flex-col fk:gap-0.5">
          <span className="fk:flex fk:items-center fk:gap-2 fk:text-sm fk:font-medium">
            {title}
            {recommended ? (
              <span className="fk:rounded-full fk:bg-primary/10 fk:px-2 fk:py-0.5 fk:text-[11px] fk:font-medium fk:text-primary">
                Recommended
              </span>
            ) : null}
          </span>
          <span className="fk:text-xs fk:text-muted-foreground">{description}</span>
        </span>
      </button>
      {checked && children ? <div className="fk:mt-2 fk:pl-7">{children}</div> : null}
    </div>
  );
}
