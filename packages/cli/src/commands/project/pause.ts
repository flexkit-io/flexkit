/** Pure helpers for `flexkit project pause|unpause`, unit-tested in tests/project-pause.test.ts. */

/** `GET /pause` on the project host. */
export interface PauseState {
  /** Where a hibernated Free project is; absent from older servers. */
  hibernationState?: 'hibernating' | 'hibernated' | 'waking' | null;
  pausedBy: 'hibernation' | 'manual' | 'spend' | null;
  projectName: string;
  readOnlySince: string | null;
  suspendedSince: string | null;
}

/** `POST /pause` and `POST /unpause`. */
export interface PauseResult {
  status: 'paused' | 'unpaused' | 'already_paused' | 'not_paused';
  success: true;
}

/** One line for the current state, shown before asking to confirm. */
export function describePauseState(state: PauseState): string {
  if (state.pausedBy === 'hibernation') {
    if (state.hibernationState === 'waking') {
      return `"${state.projectName}" is waking up from hibernation.`;
    }

    if (state.hibernationState === 'hibernating') {
      return `"${state.projectName}" is going into hibernation after a week without activity.`;
    }

    return `"${state.projectName}" is hibernated after a week without activity. Its data is kept; wake it up from the project page in the dashboard.`;
  }

  if (state.pausedBy === 'manual') {
    return `"${state.projectName}" is paused.`;
  }

  if (state.pausedBy === 'spend') {
    return `"${state.projectName}" is paused by on-demand usage limits.`;
  }

  if (state.readOnlySince) {
    return `"${state.projectName}" is read-only.`;
  }

  return `"${state.projectName}" is online.`;
}

/** The confirmation is the project's exact name, as in the dashboard. */
export function isConfirmedName(typed: string, projectName: string): boolean {
  return typed.trim() === projectName;
}

export function describePauseResult(result: PauseResult, projectName: string): string {
  switch (result.status) {
    case 'paused':
      return `Paused "${projectName}". GraphQL, automations and agent chat stay off until you run \`flexkit project unpause\`.`;
    case 'already_paused':
      return `"${projectName}" was already paused.`;
    case 'unpaused':
      return `Unpaused "${projectName}". It is back online.`;
    case 'not_paused':
      return `"${projectName}" was not paused; nothing changed.`;
  }
}
