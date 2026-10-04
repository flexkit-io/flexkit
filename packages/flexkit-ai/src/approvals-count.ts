import { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { useConfig } from '@flexkit/studio';
import { paths } from './api';
import type { AutomationApprovals } from './types';

/**
 * The sidebar badge polls the approvals count only every 30 seconds. Pages
 * that learn earlier that the count changed (a run pausing for approval, a
 * decision, the inbox loading) call this so the badge updates at once.
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
    },
    [currentProjectId, mutate]
  );
}
