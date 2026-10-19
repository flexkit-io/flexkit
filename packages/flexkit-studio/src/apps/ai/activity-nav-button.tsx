import { useEffect } from 'react';
import type { JSX } from 'react';
import { BellIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { Button } from '../../ui/primitives/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/primitives/tooltip';
import { getDesktop } from '../../core/desktop';
import { fetcher, paths } from './api';
import type { ActivitySummary } from './types';

/**
 * The project's Activity badge counts. `ActivityNotifier` refreshes the same
 * SWR key on every poll, so every reader stays in sync with one request.
 */
export function useActivitySummary(projectId: string | undefined): ActivitySummary | undefined {
  const { data } = useSWR<ActivitySummary>(projectId ? paths(projectId).activitySummary() : null, fetcher, {
    refreshInterval: 30_000,
  });

  return data;
}

function formatCount(count: number): string {
  return count > 99 ? '99+' : count.toString();
}

/** Navbar shortcut to Activity, so pending items are visible from every app. */
export function ActivityNavButton({ projectId }: { projectId: string }): JSX.Element {
  const summary = useActivitySummary(projectId);
  const needsAction = summary?.needsActionCount ?? 0;
  const unread = summary?.unreadCount ?? 0;
  // The desktop app shows what waits for you on its dock or taskbar icon.
  useEffect(() => {
    getDesktop()?.setBadgeCount(needsAction);
  }, [needsAction]);

  const label =
    needsAction > 0
      ? `Activity: ${formatCount(needsAction)} waiting for you`
      : unread > 0
        ? `Activity: ${formatCount(unread)} unread`
        : 'Activity';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild aria-label={label} className="fk:relative fk:h-8 fk:w-8 fk:rounded-full" size="icon" variant="ghost">
            <Link to={`/${projectId}/ai/activity`}>
              <BellIcon className="fk:size-4" />
              {needsAction > 0 ? (
                <span className="fk:absolute fk:-right-1 fk:-top-1 fk:flex fk:h-4 fk:min-w-4 fk:items-center fk:justify-center fk:rounded-full fk:bg-amber-500 fk:px-1 fk:text-[0.625rem] fk:font-semibold fk:leading-none fk:text-white">
                  {formatCount(needsAction)}
                </span>
              ) : unread > 0 ? (
                <span className="fk:absolute fk:right-1 fk:top-1 fk:size-2 fk:rounded-full fk:bg-success" />
              ) : null}
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
