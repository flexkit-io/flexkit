'use client';

import { useEffect, type JSX } from 'react';
import { getCustomerToolsTickPath, isDevConnectRole } from './dev-connect';

const MIN_TICK_INTERVAL_MS = 2000;
const MAX_TICK_INTERVAL_MS = 10_000;

let tickInFlight = false;

async function requestTick(path: string): Promise<boolean> {
  try {
    const response = await fetch(path, { credentials: 'same-origin', method: 'POST' });

    if (response.status !== 200) {
      return false;
    }

    const payload = (await response.json()) as { job?: unknown };

    return typeof payload.job === 'string' && payload.job.length > 0;
  } catch {
    return false;
  }
}

export function ToolsDevConnectTick({
  projectId,
  role,
}: {
  projectId: string;
  role: string;
}): JSX.Element | null {
  useEffect(() => {
    if (!isDevConnectRole(role)) {
      return;
    }

    if (!projectId) {
      return;
    }

    let cancelled = false;
    let nextIntervalMs = MIN_TICK_INTERVAL_MS;
    let timeoutId: number | undefined;
    const path = getCustomerToolsTickPath(projectId);

    function scheduleTick(delayMs: number): void {
      if (cancelled || document.hidden) {
        return;
      }

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        void tick();
      }, delayMs);
    }

    async function tick(): Promise<void> {
      if (cancelled || document.hidden) {
        return;
      }

      if (tickInFlight) {
        scheduleTick(nextIntervalMs);

        return;
      }

      tickInFlight = true;
      const hadJob = await requestTick(path);
      tickInFlight = false;

      if (hadJob) {
        nextIntervalMs = MIN_TICK_INTERVAL_MS;
      } else {
        nextIntervalMs = Math.min(nextIntervalMs * 2, MAX_TICK_INTERVAL_MS);
      }

      scheduleTick(nextIntervalMs);
    }

    function handleVisibilityChange(): void {
      if (document.hidden) {
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
          timeoutId = undefined;
        }

        return;
      }

      nextIntervalMs = MIN_TICK_INTERVAL_MS;
      void tick();
    }

    void tick();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [projectId, role]);

  return null;
}
