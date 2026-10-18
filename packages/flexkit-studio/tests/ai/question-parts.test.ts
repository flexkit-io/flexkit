import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ReplayMessagePart } from '../../src/apps/ai/replay';
import {
  createQuestionDrafts,
  formatQuestionAnswer,
  getQuestionAnswers,
  messageHasPendingUserQuestion,
  setQuestionOther,
  toggleQuestionOption,
  type UserQuestionItem,
} from '../../src/apps/ai/question-parts';

const format: UserQuestionItem = {
  header: 'Format',
  multiSelect: false,
  options: [
    { description: '', label: 'CSV' },
    { description: '', label: 'JSON' },
  ],
  question: 'Which format?',
};
const fields: UserQuestionItem = { ...format, header: 'Fields', multiSelect: true, question: 'Which fields?' };

describe('question drafts', () => {
  it('keeps one option or own words for a single-select question', () => {
    let draft = toggleQuestionOption(format, { other: '', selected: [] }, 'CSV');

    draft = toggleQuestionOption(format, draft, 'JSON');
    assert.deepEqual(draft, { other: '', selected: ['JSON'] });

    draft = setQuestionOther(format, draft, 'XML');
    assert.deepEqual(draft, { other: 'XML', selected: [] });

    assert.deepEqual(toggleQuestionOption(format, draft, 'CSV'), { other: '', selected: ['CSV'] });
  });

  it('toggles options and adds own words for a multi-select question', () => {
    let draft = toggleQuestionOption(fields, { other: '', selected: [] }, 'CSV');

    draft = toggleQuestionOption(fields, draft, 'JSON');
    draft = toggleQuestionOption(fields, draft, 'CSV');
    draft = setQuestionOther(fields, draft, 'and SKU');
    assert.deepEqual(draft, { other: 'and SKU', selected: ['JSON'] });
  });

  it('builds answers only once every question has one', () => {
    const drafts = createQuestionDrafts([format, fields]);

    assert.equal(getQuestionAnswers(drafts), null);
    assert.deepEqual(
      getQuestionAnswers([
        { other: '', selected: ['CSV'] },
        { other: '  and SKU ', selected: [] },
      ]),
      [{ selected: ['CSV'] }, { other: 'and SKU', selected: [] }]
    );
  });

  it('formats an answer for the settled card', () => {
    assert.equal(formatQuestionAnswer({ other: 'and SKU', selected: ['Price'] }), 'Price, “and SKU”');
    assert.equal(formatQuestionAnswer(undefined), '—');
  });

  it('finds a pending question in a message', () => {
    const part = (status: string) => ({ data: { questionId: 'q', questions: [], status }, type: 'data-user-question' }) as ReplayMessagePart;

    assert.equal(messageHasPendingUserQuestion({ id: 'm', parts: [part('pending')], role: 'assistant' }), true);
    assert.equal(messageHasPendingUserQuestion({ id: 'm', parts: [part('answered')], role: 'assistant' }), false);
  });
});
