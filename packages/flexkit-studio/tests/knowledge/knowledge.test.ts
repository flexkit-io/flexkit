import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatFileSize,
  formatKnowledgeLocator,
  formatKnowledgeWarning,
  getKnowledgeFileProblem,
  getKnowledgeKindLabel,
  isKnowledgeSourceBusy,
  KNOWLEDGE_ACCEPT,
  KNOWLEDGE_MAX_FILE_BYTES,
  parseKnowledgeUrl,
  summarizeKnowledgeStatus,
  toggleSpaceCode,
  type KnowledgeJob,
  type KnowledgeSource,
  type KnowledgeVersion,
} from '../../src/apps/knowledge/knowledge';

function version(overrides: Partial<KnowledgeVersion> = {}): KnowledgeVersion {
  return {
    createdAt: '2026-10-21T10:00:00Z',
    error: null,
    extractionVersion: 1,
    id: 'v1',
    passageCount: 12,
    publishedAt: '2026-10-21T10:01:00Z',
    sha256: 'abc',
    status: 'published',
    warnings: [],
    ...overrides,
  };
}

function source(overrides: Partial<KnowledgeSource> = {}): KnowledgeSource {
  return {
    agentVisible: true,
    createdAt: '2026-10-21T10:00:00Z',
    createdBy: 'u1',
    currentVersion: version(),
    id: 'src1',
    kind: 'upload',
    mimeType: 'application/pdf',
    originUrl: null,
    path: 'demo/knowledge/uploads/u1/handbook.pdf',
    sha256: 'abc',
    size: 1024,
    spaces: [],
    status: 'ready',
    title: 'Handbook',
    updatedAt: '2026-10-21T10:01:00Z',
    ...overrides,
  };
}

function job(overrides: Partial<KnowledgeJob> = {}): KnowledgeJob {
  return {
    completedAt: null,
    createdAt: '2026-10-21T10:00:00Z',
    error: null,
    id: 'job1',
    progress: null,
    sourceId: 'src1',
    startedAt: null,
    state: 'queued',
    updatedAt: '2026-10-21T10:00:00Z',
    versionId: 'v1',
    ...overrides,
  };
}

describe('getKnowledgeFileProblem', () => {
  it('accepts the document formats the platform indexes, judged by extension', () => {
    assert.equal(getKnowledgeFileProblem({ name: 'Guide.PDF', size: 10 }), null);
    assert.equal(getKnowledgeFileProblem({ name: 'notes.markdown', size: 10 }), null);
    assert.equal(getKnowledgeFileProblem({ name: 'deck.pptx', size: 10 }), null);
    assert.match(getKnowledgeFileProblem({ name: 'data.xlsx', size: 10 }) ?? '', /not a supported document/);
    assert.match(getKnowledgeFileProblem({ name: 'README', size: 10 }) ?? '', /not a supported document/);
    assert.equal(KNOWLEDGE_ACCEPT, '.pdf,.docx,.pptx,.md,.markdown,.txt,.html,.htm');
  });

  it('refuses empty and oversized files before any upload starts', () => {
    assert.match(getKnowledgeFileProblem({ name: 'a.pdf', size: 0 }) ?? '', /empty/);
    assert.match(
      getKnowledgeFileProblem({ name: 'a.pdf', size: KNOWLEDGE_MAX_FILE_BYTES + 1 }) ?? '',
      /larger than 20 MB/
    );
    assert.equal(getKnowledgeFileProblem({ name: 'a.pdf', size: KNOWLEDGE_MAX_FILE_BYTES }), null);
  });
});

describe('formatFileSize', () => {
  it('picks the unit a reader expects', () => {
    assert.equal(formatFileSize(512), '512 B');
    assert.equal(formatFileSize(2_560), '2.5 KB');
    assert.equal(formatFileSize(200 * 1024), '200 KB');
    assert.equal(formatFileSize(1.5 * 1024 * 1024), '1.5 MB');
    assert.equal(formatFileSize(20 * 1024 * 1024), '20 MB');
  });
});

describe('parseKnowledgeUrl', () => {
  it('normalizes a public https address and explains what it refuses', () => {
    assert.deepEqual(parseKnowledgeUrl(' example.com/help#faq '), { url: 'https://example.com/help' });
    assert.deepEqual(parseKnowledgeUrl('https://example.com/doc'), { url: 'https://example.com/doc' });
    assert.match((parseKnowledgeUrl('http://example.com') as { error: string }).error, /HTTPS/);
    assert.match((parseKnowledgeUrl('https://user:pw@example.com') as { error: string }).error, /credentials/);
    assert.match((parseKnowledgeUrl('') as { error: string }).error, /Enter the address/);
    assert.match((parseKnowledgeUrl('https://') as { error: string }).error, /valid address/);
  });
});

describe('getKnowledgeKindLabel', () => {
  it('names the format from the media type, and web pages by their kind', () => {
    assert.equal(getKnowledgeKindLabel({ kind: 'url', mimeType: 'text/html' }), 'Web page');
    assert.equal(getKnowledgeKindLabel({ kind: 'upload', mimeType: 'application/pdf' }), 'PDF');
    assert.equal(
      getKnowledgeKindLabel({
        kind: 'upload',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      'Word'
    );
    assert.equal(getKnowledgeKindLabel({ kind: 'upload', mimeType: 'text/plain' }), 'Text');
  });
});

describe('summarizeKnowledgeStatus', () => {
  it('reports a published document as ready with its passage count', () => {
    assert.deepEqual(summarizeKnowledgeStatus(source()), { detail: '12 passages', label: 'Ready', tone: 'ready' });
    assert.deepEqual(summarizeKnowledgeStatus(source({ currentVersion: version({ passageCount: 1 }) })), {
      detail: '1 passage',
      label: 'Ready',
      tone: 'ready',
    });
  });

  it('describes the running phase, with embedding progress when known', () => {
    const first = source({
      currentVersion: version({ status: 'processing', publishedAt: null }),
      status: 'processing',
    });

    assert.deepEqual(summarizeKnowledgeStatus(first, job({ state: 'extracting' })), {
      detail: 'Reading the document',
      label: 'Indexing',
      tone: 'busy',
    });
    assert.deepEqual(
      summarizeKnowledgeStatus(
        source(),
        job({ state: 'embedding', progress: { phase: 'embedding', passageCount: 40, embeddedCount: 16 } })
      ),
      { detail: 'Indexing passages (16 of 40)', label: 'Re-indexing', tone: 'busy' }
    );
    assert.deepEqual(summarizeKnowledgeStatus(first), {
      detail: 'Waiting to be processed',
      label: 'Indexing',
      tone: 'busy',
    });
  });

  it('keeps a published document ready when a re-index fails, and fails one that never published', () => {
    const failedJob = job({
      state: 'failed',
      error: { code: 'FETCH_FAILED', message: 'The page answered with status 404.' },
    });

    assert.deepEqual(summarizeKnowledgeStatus(source(), failedJob), {
      detail: '12 passages · the last re-index failed: The page answered with status 404.',
      label: 'Ready',
      tone: 'ready',
    });
    assert.deepEqual(
      summarizeKnowledgeStatus(
        source({
          currentVersion: version({ status: 'failed', publishedAt: null, error: 'No text layer' }),
          status: 'failed',
        }),
        failedJob
      ),
      { detail: 'The page answered with status 404.', label: 'Failed', tone: 'error' }
    );
    assert.deepEqual(
      summarizeKnowledgeStatus(source({ currentVersion: version({ warnings: ['TEXT_TRUNCATED: x'] }) })),
      {
        detail: '12 passages · indexed with warnings',
        label: 'Ready',
        tone: 'ready',
      }
    );
  });
});

describe('isKnowledgeSourceBusy', () => {
  it('is true while the source processes or a job is in flight', () => {
    assert.equal(isKnowledgeSourceBusy(source()), false);
    assert.equal(isKnowledgeSourceBusy(source({ status: 'processing' })), true);
    assert.equal(isKnowledgeSourceBusy(source(), job({ state: 'publishing' })), true);
    assert.equal(isKnowledgeSourceBusy(source(), job({ state: 'completed' })), false);
    assert.equal(isKnowledgeSourceBusy(source(), job({ state: 'cancelled' })), false);
  });
});

describe('locator, warning and space helpers', () => {
  it('formats where a passage sits the way a citation reads', () => {
    assert.equal(formatKnowledgeLocator({ charEnd: 1, charStart: 0, page: 3 }), 'p. 3');
    assert.equal(
      formatKnowledgeLocator({ charEnd: 1, charStart: 0, headingPath: ['Returns', 'Window'], slide: 2 }),
      'slide 2 · Returns › Window'
    );
    assert.equal(formatKnowledgeLocator({ charEnd: 1, charStart: 0 }), '');
  });

  it('turns a coded warning into a sentence', () => {
    assert.equal(
      formatKnowledgeWarning('TEXT_TRUNCATED: only the first 2000000 characters were indexed.'),
      'Only the first 2000000 characters were indexed.'
    );
    assert.equal(formatKnowledgeWarning('plain note'), 'Plain note');
  });

  it('toggles a space code in and out of the list', () => {
    assert.deepEqual(toggleSpaceCode([], 'eu'), ['eu']);
    assert.deepEqual(toggleSpaceCode(['eu', 'us'], 'eu'), ['us']);
  });
});
