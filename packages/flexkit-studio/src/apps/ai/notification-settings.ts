import useSWR, { type KeyedMutator } from 'swr';
import { userApiPaths } from '../../core/api-paths';
import type { ActivityItemKind } from './types';

/** A person's notification choices, shared by every project they open. */
export interface NotificationPreferences {
  /** Email an approval request left unread past the project's delay. */
  approvalEmail: boolean;
  /** Kinds that never raise a desktop notification. */
  desktopMutedKinds: ActivityItemKind[];
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = { approvalEmail: true, desktopMutedKinds: [] };

async function userRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status.toString()}.`);
  }

  return (await response.json()) as T;
}

export function useNotificationPreferences(): {
  mutate: KeyedMutator<{ preferences: NotificationPreferences }>;
  preferences: NotificationPreferences;
} {
  const { data, mutate } = useSWR<{ preferences: NotificationPreferences }>(userApiPaths.notificationPreferences, (url: string) =>
    userRequest<{ preferences: NotificationPreferences }>(url)
  );

  return { mutate, preferences: data?.preferences ?? DEFAULT_NOTIFICATION_PREFERENCES };
}

export function saveNotificationPreferences(preferences: NotificationPreferences): Promise<{ preferences: NotificationPreferences }> {
  return userRequest(userApiPaths.notificationPreferences, { body: JSON.stringify(preferences), method: 'PUT' });
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof Notification !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/** The VAPID public key as the bytes `PushManager.subscribe` expects. */
export function decodeApplicationServerKey(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = `${base64Url}${'='.repeat((4 - (base64Url.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

/**
 * Hosted Studio only: registers the service worker and saves this browser's
 * push subscription for the signed-in user, so Activity items arrive while no
 * Studio tab is open. Needs notification permission; never asks for it.
 * Safe to call on every load: an existing subscription is saved again.
 * Returns false when Web Push is unavailable here.
 */
export async function ensurePushSubscription(): Promise<boolean> {
  if (!isWebPushSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const { publicKey } = await userRequest<{ publicKey: string | null }>(userApiPaths.push);

  if (!publicKey) {
    return false;
  }

  await navigator.serviceWorker.register('/sw.js', { scope: '/' });

  const { pushManager } = await navigator.serviceWorker.ready;
  const applicationServerKey = decodeApplicationServerKey(publicKey);
  let subscription = await pushManager.getSubscription();

  // A subscription made with an older key would never receive again.
  if (subscription && !sameKey(subscription.options.applicationServerKey, applicationServerKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }

  subscription ??= await pushManager.subscribe({ applicationServerKey, userVisibleOnly: true });

  await userRequest(userApiPaths.push, { body: JSON.stringify(subscription.toJSON()), method: 'POST' });

  return true;
}

function sameKey(current: ArrayBuffer | null, expected: Uint8Array): boolean {
  if (!current || current.byteLength !== expected.byteLength) {
    return false;
  }

  const bytes = new Uint8Array(current);

  return bytes.every((byte, index) => byte === expected[index]);
}
