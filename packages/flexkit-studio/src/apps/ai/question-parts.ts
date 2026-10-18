import type { ReplayDataParts, ReplayMessage } from './replay';
import { getPartData } from './status-label';
import type { AgentChatQuestionAnswer } from './types';

export type UserQuestionData = ReplayDataParts['user-question'];
export type UserQuestionItem = UserQuestionData['questions'][number];

/** What the user has picked so far for one question; `other` is their own words. */
export interface QuestionDraft {
  other: string;
  selected: string[];
}

export function messageHasPendingUserQuestion(message: ReplayMessage | undefined): boolean {
  return Boolean(
    message?.parts.some(
      (part) => part.type === 'data-user-question' && getPartData<UserQuestionData>(part).status === 'pending'
    )
  );
}

export function createQuestionDrafts(questions: UserQuestionItem[]): QuestionDraft[] {
  return questions.map(() => ({ other: '', selected: [] }));
}

/**
 * Picking an option: a single-select question keeps only that option and
 * drops typed text (both are one answer); a multi-select one toggles it.
 */
export function toggleQuestionOption(question: UserQuestionItem, draft: QuestionDraft, label: string): QuestionDraft {
  if (!question.multiSelect) {
    return { other: '', selected: [label] };
  }

  return {
    ...draft,
    selected: draft.selected.includes(label) ? draft.selected.filter((item) => item !== label) : [...draft.selected, label],
  };
}

/** Typing an own answer: for a single-select question it replaces the picked option. */
export function setQuestionOther(question: UserQuestionItem, draft: QuestionDraft, other: string): QuestionDraft {
  return question.multiSelect ? { ...draft, other } : { other, selected: other.trim() ? [] : draft.selected };
}

/** The answers to send, or null while a question has neither an option nor own words. */
export function getQuestionAnswers(drafts: QuestionDraft[]): AgentChatQuestionAnswer[] | null {
  const answers: AgentChatQuestionAnswer[] = [];

  for (const draft of drafts) {
    const other = draft.other.trim();

    if (draft.selected.length === 0 && !other) {
      return null;
    }

    answers.push(other ? { other, selected: draft.selected } : { selected: draft.selected });
  }

  return answers;
}

/** One line per answered question, e.g. "CSV, with headers". */
export function formatQuestionAnswer(answer: AgentChatQuestionAnswer | undefined): string {
  if (!answer) {
    return '—';
  }

  return [...answer.selected, ...(answer.other ? [`“${answer.other}”`] : [])].join(', ') || '—';
}
