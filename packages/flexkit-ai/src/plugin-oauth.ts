import type { ApiClient } from './api';
import type { PluginScope } from './plugin-types';

/** Must be called directly from the click handler so browsers allow the popup. */
export async function connectPluginPopup(api: ApiClient, pluginIds: string[], scope: PluginScope): Promise<void> {
  const popup = window.open('about:blank', `flexkit-plugin-${crypto.randomUUID()}`, 'popup,width=560,height=720');

  if (!popup) {
    throw new Error('Allow popups for Studio, then connect again.');
  }

  let transaction: Awaited<ReturnType<ApiClient['connectPlugins']>>;

  try {
    transaction = await api.connectPlugins({ pluginIds, scope, studioOrigin: window.location.origin });
  } catch (error) {
    popup.close();
    throw error;
  }

  const expectedOrigin = new URL(transaction.completionOrigin).origin;

  await new Promise<void>((resolve, reject) => {
    let polling = false;
    let finished = false;
    const finish = (error?: Error) => {
      if (finished) {
        return;
      }

      finished = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      popup.close();

      if (error) {
        reject(error);

        return;
      }

      resolve();
    };
    const poll = async () => {
      if (polling || finished) {
        return;
      }

      polling = true;
      let status: Awaited<ReturnType<ApiClient['pluginOAuthStatus']>>;

      try {
        status = await api.pluginOAuthStatus(transaction.transactionId);
      } catch {
        polling = false;

        return;
      }

      polling = false;

      if (status.status === 'complete') {
        finish();

        return;
      }

      if (popup.closed && status.status === 'pending') {
        finish(new Error('Connection window was closed.'));

        return;
      }

      if (status.status === 'failed' || new Date(status.expires_at).getTime() < Date.now()) {
        finish(new Error('Connection was not completed. Please try again.'));
      }
    };
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== expectedOrigin || event.source !== popup || !event.data || typeof event.data !== 'object') {
        return;
      }

      const payload = event.data as { type?: string; transactionId?: string };

      if (payload.type === 'flexkit:plugin-oauth-ready' && payload.transactionId === transaction.transactionId) {
        popup.postMessage(
          {
            type: 'flexkit:plugin-oauth-start',
            transactionId: transaction.transactionId,
            ticket: transaction.launchTicket,
          },
          expectedOrigin
        );

        return;
      }

      if (payload.type === 'flexkit:plugin-oauth' && payload.transactionId === transaction.transactionId) {
        void poll();
      }
    };
    const interval = window.setInterval(() => {
      void poll();
    }, 2000);
    const timeout = window.setTimeout(() => finish(new Error('Connection timed out. Please try again.')), 600_000);
    window.addEventListener('message', onMessage);
    popup.location.href = transaction.authorizeUrl;
  });
}
