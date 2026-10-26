import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'tests/ai/resumable-stream.test.ts',
    'tests/ai/model-selection.test.ts',
    'tests/ai/status-label.test.ts',
    'tests/ai/approval-parts.test.ts',
    'tests/ai/chat-history.test.ts',
    'tests/ai/composer-draft.test.ts',
    'tests/ai/follow-ups.test.ts',
    'tests/ai/activity.test.ts',
    'tests/ai/question-parts.test.ts',
    'tests/ai/plugin-connect-state.test.ts',
    'tests/ai/knowledge-parts.test.ts',
    'tests/ai/attachment-state.test.ts',
  ],
  format: ['esm'],
  outDir: 'build/tests/ai',
  removeNodeProtocol: false,
});
