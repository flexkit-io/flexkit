import { useEffect, useRef, useState, type JSX } from 'react';
import { CheckCircle2, CornerDownRightIcon, LoaderCircle, TriangleAlert } from 'lucide-react';
import useSWR from 'swr';
import {
  applyStarter,
  COMMERCE_STARTER_PROMPTS,
  isStarterRunning,
  starterPath,
  type StarterStatus,
} from '../../../core/config/onboarding';
import { revalidateProjectSchema } from '../../../core/config/use-project-schemas';
import { Button } from '../../../ui/primitives/button';
import { fetcher } from '../api';

const POLL_MS = 2000;

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
  onPrompt: (prompt: string) => void;
  projectId: string;
}): JSX.Element | null {
  const { data, mutate } = useSWR<{ starter: StarterStatus | null }>(starterPath(projectId), fetcher, {
    refreshInterval: (latest) => (isStarterRunning(latest?.starter) ? POLL_MS : 0),
    revalidateOnFocus: false,
  });
  const starter = data?.starter ?? null;
  const wasRunning = useRef(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Load the new schema the moment it is deployed, so Desk and the menu show it.
  useEffect(() => {
    if (isStarterRunning(starter)) {
      wasRunning.current = true;
    } else if (wasRunning.current && starter?.state === 'completed') {
      wasRunning.current = false;
      void revalidateProjectSchema(projectId);
    }
  }, [projectId, starter]);

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
        <p className="fk:text-muted-foreground">{retryError ?? starter.error ?? 'Please try again.'}</p>
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

                await mutate({ starter: outcome.starter }, { revalidate: true });
              }
            );
          }}
          size="sm"
          variant="outline"
        >
          {retrying ? <LoaderCircle className="fk:size-4 fk:animate-spin" /> : null}
          Try again
        </Button>
      </div>
    );
  }

  if (isStarterRunning(starter)) {
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
    <div className="fk:mx-auto fk:flex fk:w-full fk:max-w-2xl fk:flex-col fk:items-center fk:gap-3">
      <p className="fk:flex fk:items-center fk:gap-2 fk:text-sm fk:text-muted-foreground">
        <CheckCircle2 className="fk:size-4 fk:text-emerald-600" />
        The Aven Living sample store is ready. Try asking:
      </p>
      <StarterPrompts canSend={canSend} onPrompt={onPrompt} prompts={COMMERCE_STARTER_PROMPTS} />
    </div>
  );
}

export function StarterPrompts({
  canSend,
  onPrompt,
  prompts,
}: {
  canSend: boolean;
  onPrompt: (prompt: string) => void;
  prompts: readonly string[];
}): JSX.Element {
  return (
    <div className="fk:flex fk:flex-wrap fk:justify-center fk:gap-2">
      {prompts.map((prompt) => (
        <button
          className="fk:inline-flex fk:max-w-full fk:items-center fk:gap-1.5 fk:rounded-full fk:border fk:border-border/70 fk:bg-muted/40 fk:px-3 fk:py-1.5 fk:text-left fk:text-sm fk:text-muted-foreground fk:transition-colors fk:hover:border-border fk:hover:bg-muted fk:hover:text-foreground fk:disabled:opacity-60 fk:corner-squircle"
          disabled={!canSend}
          key={prompt}
          onClick={() => {
            onPrompt(prompt);
          }}
          type="button"
        >
          <CornerDownRightIcon className="fk:size-3 fk:shrink-0" />
          <span>{prompt}</span>
        </button>
      ))}
    </div>
  );
}
