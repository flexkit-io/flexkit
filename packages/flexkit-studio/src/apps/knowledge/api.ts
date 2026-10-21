import { put } from '@vercel/blob/client';
import type {
  KnowledgeJob,
  KnowledgeSource,
  KnowledgeSourcePatch,
  KnowledgeSourceStatus,
  RegisterKnowledgeSourceResult,
} from './knowledge';

/** The platform refused a knowledge request; `code` lets the UI tailor the message. */
export class KnowledgeApiError extends Error {
  code: string | null;
  status: number;

  constructor(status: number, message: string, code: string | null = null) {
    super(message);
    this.name = 'KnowledgeApiError';
    this.code = code;
    this.status = status;
  }
}

export interface ProjectSpace {
  code: string;
  id: string;
  label: string;
}

export interface KnowledgeApi {
  /** Uploads a document to the file store, then registers it; resolves once indexing is queued or the file was already there. */
  addFile: (_file: File, _options?: { signal?: AbortSignal }) => Promise<RegisterKnowledgeSourceResult>;
  addUrl: (_input: { title?: string; url: string }) => Promise<RegisterKnowledgeSourceResult>;
  /** Promotes a file the caller attached to a chat: the platform copies it into the knowledge folder. */
  addChatAttachment: (_input: { filename: string; url: string }) => Promise<RegisterKnowledgeSourceResult>;
  deleteSource: (_sourceId: string) => Promise<{ deleted: true }>;
  reingestSource: (_sourceId: string) => Promise<{ job: KnowledgeJob }>;
  updateSource: (_sourceId: string, _patch: KnowledgeSourcePatch) => Promise<{ source: KnowledgeSource }>;
}

export class FetcherError extends Error {
  status: number;

  constructor(status: number, message = 'Request failed') {
    super(message);
    this.name = 'FetcherError';
    this.status = status;
  }
}

export const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: 'include' });

  if (!response.ok) {
    throw new FetcherError(response.status);
  }

  return (await response.json()) as T;
};

export function knowledgePaths(projectId: string): {
  job: (_jobId: string) => string;
  passages: (_sourceId: string, _options: { from: number; to: number }) => string;
  source: (_sourceId: string) => string;
  sources: (_options?: { limit?: number; offset?: number; search?: string; status?: KnowledgeSourceStatus }) => string;
  spaces: string;
} {
  const basePath = `/api/flexkit/${projectId}/knowledge`;

  return {
    job: (jobId) => `${basePath}/jobs/${encodeURIComponent(jobId)}`,
    passages: (sourceId, { from, to }) =>
      `${basePath}/sources/${encodeURIComponent(sourceId)}/passages?from=${String(from)}&to=${String(to)}`,
    source: (sourceId) => `${basePath}/sources/${encodeURIComponent(sourceId)}`,
    sources: (options = {}) => {
      const { limit = 25, offset = 0, search, status } = options;
      const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
      const trimmedSearch = search?.trim();

      if (trimmedSearch) {
        params.set('q', trimmedSearch);
      }

      if (status) {
        params.set('status', status);
      }

      return `${basePath}/sources?${params.toString()}`;
    },
    spaces: `/api/flexkit/${projectId}/spaces`,
  };
}

/** Whether an SWR key is a page of the document list, whatever its filters. */
export function isKnowledgeListKey(key: unknown): boolean {
  return typeof key === 'string' && key.includes('/knowledge/sources?');
}

async function readError(response: Response, fallback: string): Promise<KnowledgeApiError> {
  let data: { code?: string; error?: string } = {};

  try {
    data = (await response.json()) as { code?: string; error?: string };
  } catch {
    // Non-JSON error bodies keep the fallback message.
  }

  return new KnowledgeApiError(response.status, data.error ? String(data.error) : fallback, data.code ?? null);
}

export function createKnowledgeApi(projectId: string): KnowledgeApi {
  const basePath = `/api/flexkit/${projectId}/knowledge`;

  async function request<T>(url: string, init: RequestInit & { fallback: string }): Promise<T> {
    const { fallback, ...requestInit } = init;
    const response = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(requestInit.headers ?? {}) },
      ...requestInit,
    });

    if (!response.ok) {
      throw await readError(response, fallback);
    }

    return (await response.json()) as T;
  }

  function register(body: Record<string, unknown>): Promise<RegisterKnowledgeSourceResult> {
    return request<RegisterKnowledgeSourceResult>(`${basePath}/sources`, {
      body: JSON.stringify(body),
      fallback: 'The document could not be added.',
      method: 'POST',
    });
  }

  return {
    addFile: async (file, options) => {
      // The platform issues a token pinned to one pathname, type and size; the
      // browser writes the bytes to the store itself, so a 20 MB document never
      // crosses the API function body limit. Registration then hashes the blob.
      const tokenResponse = await fetch(`${basePath}/uploads`, {
        body: JSON.stringify({ filename: file.name, mediaType: file.type || null, sizeBytes: file.size }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        signal: options?.signal,
      });

      if (!tokenResponse.ok) {
        throw await readError(tokenResponse, 'The file could not be uploaded.');
      }

      const tokenData = (await tokenResponse.json()) as { mediaType?: string; pathname?: string; token?: string };

      if (!tokenData.pathname || !tokenData.token || !tokenData.mediaType) {
        throw new KnowledgeApiError(tokenResponse.status, 'The file could not be uploaded.');
      }

      await put(tokenData.pathname, file, {
        abortSignal: options?.signal,
        access: 'public',
        contentType: tokenData.mediaType,
        token: tokenData.token,
      });

      return register({ kind: 'upload', pathname: tokenData.pathname });
    },
    addUrl: ({ title, url }) => register({ kind: 'url', url, ...(title ? { title } : {}) }),
    addChatAttachment: ({ filename, url }) => register({ filename, kind: 'chat-attachment', url }),
    deleteSource: (sourceId) =>
      request<{ deleted: true }>(`${basePath}/sources/${encodeURIComponent(sourceId)}`, {
        fallback: 'The document could not be removed.',
        method: 'DELETE',
      }),
    reingestSource: (sourceId) =>
      request<{ job: KnowledgeJob }>(`${basePath}/sources/${encodeURIComponent(sourceId)}/reingest`, {
        fallback: 'The document could not be re-indexed.',
        method: 'POST',
      }),
    updateSource: (sourceId, patch) =>
      request<{ source: KnowledgeSource }>(`${basePath}/sources/${encodeURIComponent(sourceId)}`, {
        body: JSON.stringify(patch),
        fallback: 'The document could not be updated.',
        method: 'PATCH',
      }),
  };
}
