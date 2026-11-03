import { userApiPaths } from '../api-paths';

/** Starter templates a new project can begin from; the backend owns their schema and sample data. */
export type StarterTemplate = 'commerce';

export type StarterStatus = {
  template: StarterTemplate;
  sampleData: boolean;
  state: 'queued' | 'deploying' | 'seeding' | 'completed' | 'failed';
  progress?: { done: number; total: number };
  error?: string;
  completedAt?: string;
};

/** How the user chose to start a new project, carried to its AI chat in the navigation state. */
export type ProjectStart =
  | { kind: 'starter'; template: StarterTemplate; sampleData: boolean }
  | { kind: 'describe'; description: string }
  | { kind: 'empty' };

/** Navigation state the onboarding hands the AI chat of a new project. */
export type OnboardingNavigationState = { onboardingPrompt?: string };

export function starterPath(projectId: string): string {
  return `/api/flexkit/${projectId}/starter`;
}

type Failure = { ok: false; code: string; message: string };

async function send<T>(url: string, method: 'PATCH' | 'POST', body: unknown): Promise<({ ok: true } & T) | Failure> {
  try {
    const response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as { code?: string; error?: string } & T;

    if (response.ok) {
      return { ok: true, ...json };
    }

    return {
      ok: false,
      code: json.code ?? 'unknown_error',
      message: json.error ?? 'Something went wrong. Please try again.',
    };
  } catch {
    return {
      ok: false,
      code: 'network_error',
      message: 'Flexkit is not reachable. Check your connection and try again.',
    };
  }
}

/** Hosted mode: saves the signed-in user's display name. */
export function saveDisplayName(displayName: string): Promise<{ ok: true } | Failure> {
  return send(userApiPaths.me, 'PATCH', { displayName });
}

/** Applies a starter template to a new, empty project; the schema and sample data arrive in the background. */
export function applyStarter(
  projectId: string,
  starter: { template: StarterTemplate; sampleData: boolean }
): Promise<({ ok: true } & { starter: StarterStatus }) | Failure> {
  return send<{ starter: StarterStatus }>(starterPath(projectId), 'POST', starter);
}

export function isStarterRunning(status: StarterStatus | null | undefined): boolean {
  return status?.state === 'queued' || status?.state === 'deploying' || status?.state === 'seeding';
}

/** The first message of a project whose owner described the business instead of picking a template. */
export function describeBusinessPrompt(description: string): string {
  return [
    `I'm setting up Flexkit for my business: ${description.trim()}`,
    '',
    'Design a schema for it: propose the entities, fields and relationships we need to run it day to day, and market scopes if we sell in more than one market. Keep it practical and complete enough to use from the start. Once the schema is deployed, offer to add a few realistic sample records.',
  ].join('\n');
}

/** Questions the commerce sample store can answer; each one finds a problem planted in the data. */
export const COMMERCE_STARTER_PROMPTS = [
  'Which variants are running low on stock, and what is already on order?',
  'Why are Orb Pendant Lamps being returned? Look at the returns, reviews and support tickets.',
  'Which products are missing prices, titles or SEO copy in the UK or US?',
  'Show last month’s revenue by market and sales channel.',
  'Which open support tickets need attention today?',
] as const;

export const EMPTY_STARTER_PROMPTS = [
  'Design a schema for my business. Ask me what you need to know first.',
  'Set up a product catalog with variants, prices per market and stock per warehouse.',
  'Help me import my products from a spreadsheet.',
] as const;

/** Only what the field can tell; the backend owns the character rules and says what it refuses. */
export function validateProjectName(name: string): string | null {
  const trimmed = name.trim();

  if (!trimmed) {
    return 'Give your project a name.';
  }

  if (trimmed.length > 48) {
    return 'Project names can be up to 48 characters.';
  }

  return null;
}

/** The choice on the last step, as sent to the backend and the AI chat. */
export function toProjectStart(kind: ProjectStart['kind'], sampleData: boolean, description: string): ProjectStart {
  switch (kind) {
    case 'starter':
      return { kind: 'starter', template: 'commerce', sampleData };
    case 'describe':
      return { kind: 'describe', description };
    case 'empty':
      return { kind: 'empty' };
  }
}
