import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { createApiClient, fetcher, paths } from '../api';

/** A set of suggested prompts shown in an empty chat. */
export type SuggestionSet = 'sample-store' | 'empty-schema';

/** What the backend remembers about one set for the signed-in user. */
export type SuggestionState = { hidden: boolean; used: string[] };

/** `GET /agent/profile`: the greeting name and the suggestion state, loaded together by the empty chat. */
export type AgentProfile = {
  preferredName: string | null;
  promptSuggestions?: { [setKey: string]: SuggestionState };
};

const EMPTY_STATE: SuggestionState = { hidden: false, used: [] };

/** A set in the saved state; the sample-store set also names the starter run it belongs to. */
export function suggestionSetKey(set: SuggestionSet, version?: string): string {
  return version ? `${set}:${version}` : set;
}

/** The prompts still to offer: none once the set is hidden, and never one already used. */
export function visibleSuggestions(prompts: readonly string[], state: SuggestionState): string[] {
  return state.hidden ? [] : prompts.filter((prompt) => !state.used.includes(prompt));
}

export function withUsedSuggestion(state: SuggestionState, prompt: string): SuggestionState {
  return state.used.includes(prompt) ? state : { ...state, used: [...state.used, prompt] };
}

/**
 * Suggested prompts of an empty chat that the user can use up or dismiss,
 * saved per user and project. The state comes with the agent profile the
 * empty chat already loads (no extra request); a change shows at once and is
 * saved in the background. Nothing is offered until the profile has loaded,
 * so a dismissed set never flashes.
 */
export function usePromptSuggestions(
  projectId: string,
  set: SuggestionSet,
  prompts: readonly string[],
  /** Starts the set over when it changes, e.g. the starter run the questions belong to. */
  version?: string
): { visible: string[]; markUsed: (prompt: string) => void; hideAll: () => void } {
  const key = suggestionSetKey(set, version);
  const api = useMemo(() => createApiClient(projectId), [projectId]);
  const { data, mutate } = useSWR<AgentProfile>(paths(projectId).agentProfile(), fetcher);
  const state = data?.promptSuggestions?.[key] ?? EMPTY_STATE;

  // Shown at once; only the change is sent, and the server merges it, so tabs and apps never overwrite each other.
  const save = useCallback(
    (change: { used: string } | { hide: true }) => {
      void mutate(
        async (current) => {
          const { promptSuggestions } = await api.savePromptSuggestion({ set: key, ...change });

          return { preferredName: current?.preferredName ?? null, promptSuggestions };
        },
        {
          optimisticData: (current) => {
            const previous = current?.promptSuggestions?.[key] ?? EMPTY_STATE;
            const next = 'used' in change ? withUsedSuggestion(previous, change.used) : { ...previous, hidden: true };

            return {
              preferredName: current?.preferredName ?? null,
              promptSuggestions: { ...current?.promptSuggestions, [key]: next },
            };
          },
          // Not saved: show the saved state again.
          rollbackOnError: true,
          revalidate: false,
        }
      ).catch(() => undefined);
    },
    [api, key, mutate]
  );
  const markUsed = useCallback((prompt: string) => save({ used: prompt }), [save]);
  const hideAll = useCallback(() => save({ hide: true }), [save]);
  const visible = useMemo(() => (data ? visibleSuggestions(prompts, state) : []), [data, prompts, state]);

  return { visible, markUsed, hideAll };
}
