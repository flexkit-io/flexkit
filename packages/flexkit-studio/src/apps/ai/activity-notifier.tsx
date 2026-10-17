import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import { LOGO_MARK_PATH } from '../../ui/components/logo';
import { fetcher, paths } from './api';
import { planActivityNotifications } from './activity';
import type { ActivitySummary } from './types';

const POLL_INTERVAL_MS = 30_000;
const WATERMARK_STORAGE_KEY = 'flexkit:activity-watermark:';

function readWatermark(projectId: string): string | null {
  try {
    return localStorage.getItem(`${WATERMARK_STORAGE_KEY}${projectId}`);
  } catch {
    return null;
  }
}

function writeWatermark(projectId: string, since: string): void {
  try {
    localStorage.setItem(`${WATERMARK_STORAGE_KEY}${projectId}`, since);
  } catch {
    // Storage can be blocked; the in-memory watermark still prevents repeats in this tab.
  }
}

function canNotify(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

const NOTIFICATION_ICON_SIZE = 192;

let notificationIcon: Promise<string | undefined> | null = null;

/**
 * The Flexkit logo as a PNG data URL for the notification icon. Browsers do not
 * reliably render SVG notification icons, so the mark is drawn on a canvas once.
 */
function getNotificationIcon(): Promise<string | undefined> {
  notificationIcon ??= (async () => {
    try {
      const canvas = document.createElement('canvas');

      canvas.width = NOTIFICATION_ICON_SIZE;
      canvas.height = NOTIFICATION_ICON_SIZE;

      const context = canvas.getContext('2d');

      if (!context) {
        return undefined;
      }

      context.scale(NOTIFICATION_ICON_SIZE / 48, NOTIFICATION_ICON_SIZE / 48);
      context.fillStyle = 'white';
      context.fillRect(7, 8, 34, 32);
      context.fillStyle = '#020817';
      context.fill(new Path2D(LOGO_MARK_PATH));

      return canvas.toDataURL('image/png');
    } catch {
      return undefined;
    }
  })();

  return notificationIcon;
}

/**
 * The person is not looking at Studio: the tab is in the background, or another
 * app has focus. Switching apps leaves a partly visible browser window
 * `visible`, so visibility alone misses the most common case.
 */
function isAway(): boolean {
  return document.visibilityState === 'hidden' || !document.hasFocus();
}

/**
 * Runs `task` in exactly one Studio tab per project at a time (Web Locks), so
 * three open tabs show one notification, not three. Without Web Locks every
 * tab runs it; notification tags still collapse the duplicates.
 */
function runAsLeader(lockName: string, task: (_signal: AbortSignal) => void): () => void {
  const controller = new AbortController();

  if (typeof navigator === 'undefined' || !('locks' in navigator)) {
    task(controller.signal);

    return () => controller.abort();
  }

  navigator.locks
    .request(lockName, { signal: controller.signal }, async () => {
      // An unmount can land between the grant and this callback (React Strict Mode
      // remounts at once). The abort event has then already fired, so waiting for it
      // would hold the lock forever while the remounted notifier queues behind it.
      if (controller.signal.aborted) {
        return;
      }

      task(controller.signal);

      // Hold the lock until this tab's notifier unmounts.
      await new Promise<void>((resolve) => controller.signal.addEventListener('abort', () => resolve(), { once: true }));
    })
    .catch(() => undefined);

  return () => controller.abort();
}

/**
 * Polls the Activity summary while Studio is open and turns new items into
 * desktop notifications when the tab is in the background. It also refreshes
 * the Activity badge. Renders nothing.
 */
export function ActivityNotifier({ projectId }: { projectId: string }): null {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const { mutate } = useSWRConfig();

  navigateRef.current = navigate;

  useEffect(() => {
    if (!projectId) {
      return;
    }

    return runAsLeader(`flexkit-activity-notifier:${projectId}`, (signal) => {
      let since = readWatermark(projectId);

      async function poll(): Promise<void> {
        let summary: ActivitySummary;

        try {
          summary = await fetcher<ActivitySummary>(paths(projectId).activitySummary(since));
        } catch {
          return;
        }

        if (signal.aborted) {
          return;
        }

        const plan = planActivityNotifications({ newItems: summary.newItems, since });

        ({ since } = plan);
        writeWatermark(projectId, plan.since);
        void mutate(paths(projectId).activitySummary(), summary, { revalidate: false });

        if (!isAway() || !canNotify()) {
          return;
        }

        const icon = plan.notifications.length > 0 ? await getNotificationIcon() : undefined;

        for (const notification of plan.notifications) {
          const shown = new Notification(notification.title, { body: notification.body, icon, tag: notification.tag });

          shown.onclick = () => {
            window.focus();
            navigateRef.current(`/${projectId}/ai/${notification.path}`);
            shown.close();
          };
        }
      }

      void poll();

      const interval = setInterval(() => void poll(), POLL_INTERVAL_MS);

      signal.addEventListener('abort', () => clearInterval(interval));
    });
  }, [mutate, projectId]);

  return null;
}
