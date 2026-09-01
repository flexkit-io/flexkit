'use client';

import { useEffect, type JSX } from 'react';
import { getCustomerToolsTickPath, isDevConnectRole } from './dev-connect';

const TICK_INTERVAL_MS = 2000;

let tickInFlight = false;

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
    const path = getCustomerToolsTickPath(projectId);

    async function tick(): Promise<void> {
      if (tickInFlight) {
        return;
      }

      tickInFlight = true;

      try {
        await fetch(path, { credentials: 'same-origin', method: 'POST' });
      } catch {
        // The next interval retries.
      } finally {
        tickInFlight = false;
      }
    }

    void tick();
    const intervalId = window.setInterval(() => {
      if (!cancelled) {
        void tick();
      }
    }, TICK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [projectId, role]);

  return null;
}
