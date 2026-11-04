import { useEffect, useRef, useState, type JSX } from 'react';
import { CheckCircle2, CornerDownRightIcon, LoaderCircle, TriangleAlert, XIcon } from 'lucide-react';
import useSWR from 'swr';
import {
  applyStarter,
  COMMERCE_STARTER_PROMPTS,
  isStarterRunning,
  starterPath,
  type StarterStatus,
} from '../../../core/config/onboarding';
import { useConfig } from '../../../core/config/config-context';
import { revalidateProjectSchema } from '../../../core/config/use-project-schemas';
import { Button } from '../../../ui/primitives/button';
import { fetcher } from '../api';
import { usePromptSuggestions } from './prompt-suggestions';
import { starterSchemaDeployed, watchStarter } from '../starter-watch';

/** A fallback for when the watch below has given up; the watch itself polls every 2 s. */
const POLL_MS = 10_000;

/** How long after the sample store was added its questions still greet an empty chat. */
const SAMPLE_PROMPTS_DAYS = 14;

const STATE_LABELS: { [state in StarterStatus['state']]: string } = {
  queued: 'Getting your store ready…',
  deploying: 'Creating 22 entities for catalog, inventory, orders, customers and marketing…',
  seeding: 'Adding the Aven Living sample store…',
  completed: 'Your store is ready',
  failed: 'The starter could not be applied',
};

/**
 * Empty chat of a project that began from a starter: its progress while the
 * schema and sample data arrive, then questions the sample store answers.
 * Renders nothing for projects without a starter.
 */
export function StarterPanel({
  canSend,
  onPrompt,
  projectId,
}: {
  canSend: boolean;
  onPrompt: (prompt: string) => Promise<boolean>;
  projectId: string;
}): JSX.Element | null {
  // While shown, the panel polls on its own: the watch below gives up after a while (a starter can sit
  // queued for long), and the screen must still catch up when the starter finally runs.
  const { data, mutate } = useSWR<{ starter: StarterStatus | null }>(starterPath(projectId), fetcher, {
    refreshInterval: (latest) => (isStarterRunning(latest?.starter) ? POLL_MS : 0),
    revalidateOnFocus: false,
  });
  const starter = data?.starter ?? null;
  const running = isStarterRunning(starter);
  const { projectSummaries } = useConfig();
  const summary = projectSummaries.find((project) => project.id === projectId);
  // Applying a starter is for owners; without a hosted summary the backend decides.
  const canRetry = !summary || summary.role === 'owner';
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const seenRunning = useRef(false);

  // The watch outlives this panel, which unmounts as soon as a chat starts. Restart it on every change
  // of a running starter, in case an earlier watch gave up; it runs once per project at a time.
  useEffect(() => {
    if (running) {
      seenRunning.current = true;
      watchStarter({ projectId });
    } else if (seenRunning.current && starter && starterSchemaDeployed(starter)) {
      // This panel saw the deploy finish, possibly after the watch stopped: load the new schema.
      seenRunning.current = false;
      void revalidateProjectSchema(projectId);
    }
  }, [projectId, running, starter]);

  if (!starter) {
    return null;
  }

  if (starter.state === 'failed') {
    return (
      <div className="fk:mx-auto fk:flex fk:w-full fk:max-w-xl fk:flex-col fk:items-center fk:gap-3 fk:rounded-lg fk:border fk:border-border fk:p-4 fk:text-center fk:text-sm">
        <p className="fk:flex fk:items-center fk:gap-2 fk:font-medium">
          <TriangleAlert className="fk:size-4 fk:text-destructive" />
          {STATE_LABELS.failed}
        </p>
        <p className="fk:text-muted-foreground">
          {retryError ?? starter.error ?? 'Please try again.'}
          {canRetry ? null : ' Ask the project owner to try again.'}
        </p>
        {canRetry ? (
          <Button
            disabled={retrying}
            onClick={() => {
              setRetrying(true);
              setRetryError(null);
              void applyStarter(projectId, { template: starter.template, sampleData: starter.sampleData }).then(
                async (outcome) => {
                  setRetrying(false);

                  if (!outcome.ok) {
                    setRetryError(outcome.message);

                    return;
                  }

                  await mutate({ starter: outcome.starter }, { revalidate: false });
                  watchStarter({ projectId });
                }
              );
            }}
            size="sm"
            variant="outline"
          >
            {retrying ? <LoaderCircle className="fk:size-4 fk:animate-spin" /> : null}
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  if (running) {
    const progress = starter.state === 'seeding' && starter.progress ? starter.progress : null;

    return (
      <div
        aria-live="polite"
        className="fk:mx-auto fk:flex fk:w-full fk:max-w-xl fk:flex-col fk:items-center fk:gap-3 fk:text-center fk:text-sm fk:text-muted-foreground"
      >
        <p className="fk:flex fk:items-center fk:gap-2">
          <LoaderCircle className="fk:size-4 fk:animate-spin" />
          {STATE_LABELS[starter.state]}
        </p>
        {progress ? (
          <div className="fk:h-1.5 fk:w-48 fk:overflow-hidden fk:rounded-full fk:bg-muted">
            <div
              className="fk:h-full fk:bg-primary fk:transition-[width]"
              style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100).toString()}%` }}
            />
          </div>
        ) : null}
        <p className="fk:text-xs">This takes about a minute. You can already ask the agent anything.</p>
      </div>
    );
  }

  // Past the first days the store is likely real data, or gone.
  if (!isRecent(starter.completedAt)) {
    return null;
  }

  // Questions only make sense once the sample store exists.
  if (!starter.sampleData) {
    return (
      <p className="fk:mx-auto fk:flex fk:items-center fk:gap-2 fk:text-sm fk:text-muted-foreground">
        <CheckCircle2 className="fk:size-4 fk:text-emerald-600" />
        The commerce starter is ready. Ask the agent to add your products, or to adapt the schema.
      </p>
    );
  }

  return (
    <SampleStorePrompts canSend={canSend} completedAt={starter.completedAt} onPrompt={onPrompt} projectId={projectId} />
  );
}

/** Questions the sample store answers; each disappears once used, and all can be hidden. */
function SampleStorePrompts({
  canSend,
  completedAt,
  onPrompt,
  projectId,
}: {
  canSend: boolean;
  /** The starter run these questions belong to; a re-applied starter offers them again. */
  completedAt: string | undefined;
  onPrompt: (prompt: string) => Promise<boolean>;
  projectId: string;
}): JSX.Element | null {
  const suggestions = usePromptSuggestions(projectId, 'sample-store', COMMERCE_STARTER_PROMPTS, completedAt);

  if (suggestions.visible.length === 0) {
    return null;
  }

  return (
    <div className="fk:mx-auto fk:flex fk:w-full fk:max-w-2xl fk:flex-col fk:items-center fk:gap-3">
      <p className="fk:flex fk:items-center fk:gap-2 fk:text-sm fk:text-muted-foreground">
        <CheckCircle2 className="fk:size-4 fk:text-emerald-600" />
        The Aven Living sample store is ready. Try asking:
      </p>
      <StarterPrompts canSend={canSend} onPrompt={onPrompt} suggestions={suggestions} />
    </div>
  );
}

/** Suggested prompts as chips; a used one disappears, and "Hide suggestions" dismisses the rest. */
export function StarterPrompts({
  canSend,
  onPrompt,
  suggestions,
}: {
  canSend: boolean;
  onPrompt: (prompt: string) => Promise<boolean>;
  suggestions: ReturnType<typeof usePromptSuggestions>;
}): JSX.Element {
  return (
    <div className="fk:flex fk:flex-col fk:items-center fk:gap-2">
      <div className="fk:flex fk:flex-wrap fk:justify-center fk:gap-2">
        {suggestions.visible.map((prompt) => (
          <button
            className="fk:inline-flex fk:max-w-full fk:items-center fk:gap-1.5 fk:rounded-full fk:border fk:border-border/70 fk:bg-muted/40 fk:px-3 fk:py-1.5 fk:text-left fk:text-sm fk:text-muted-foreground fk:transition-colors fk:hover:border-border fk:hover:bg-muted fk:hover:text-foreground fk:disabled:opacity-60 fk:corner-squircle"
            disabled={!canSend}
            key={prompt}
            onClick={() => {
              // Only a prompt that was actually sent stops being offered.
              void onPrompt(prompt).then((sent) => {
                if (sent) suggestions.markUsed(prompt);
              });
            }}
            type="button"
          >
            <CornerDownRightIcon className="fk:size-3 fk:shrink-0" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>
      <button
        className="fk:inline-flex fk:items-center fk:gap-1 fk:text-xs fk:text-muted-foreground fk:transition-colors fk:hover:text-foreground"
        onClick={suggestions.hideAll}
        type="button"
      >
        <XIcon className="fk:size-3" />
        Hide suggestions
      </button>
    </div>
  );
}

function isRecent(completedAt: string | undefined): boolean {
  const time = completedAt ? Date.parse(completedAt) : Number.NaN;

  return Number.isFinite(time) && Date.now() - time < SAMPLE_PROMPTS_DAYS * 24 * 60 * 60 * 1000;
}
