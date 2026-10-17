import { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { useConfig } from '../../core/config/config-context';
import { paths } from './api';
import type { AutomationApprovals } from './types';

/**
 * The sidebar badges (Approvals and Activity) poll only every 30 seconds.
 * Pages that learn earlier that the counts changed (a run pausing for
 * approval, a decision, the inbox loading) call this so they update at once.
 */
export function useRevalidateApprovalsCount(): (_known?: AutomationApprovals) => void {
  const { currentProjectId } = useConfig();
  const { mutate } = useSWRConfig();

  return useCallback(
    (known?: AutomationApprovals) => {
      if (!currentProjectId) {
        return;
      }

      const key = paths(currentProjectId).approvalsCount;

      // A fresh inbox response carries the count already; show it before the refetch lands.
      void (known ? mutate(key, known, { revalidate: true }) : mutate(key));
      void mutate(paths(currentProjectId).activitySummary());
    },
    [currentProjectId, mutate]
  );
}
