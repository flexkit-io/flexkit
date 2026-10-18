import type { JSX } from 'react';
import { useState } from 'react';
import { CheckIcon, LoaderCircle } from 'lucide-react';
import { Badge, Button, Input } from '../../ui';
import {
  createQuestionDrafts,
  formatQuestionAnswer,
  getQuestionAnswers,
  setQuestionOther,
  toggleQuestionOption,
  type QuestionDraft,
  type UserQuestionData,
  type UserQuestionItem,
} from './question-parts';
import type { AgentChatQuestion, AgentChatQuestionResponse } from './types';

const SETTLED_LABELS: { [status in Exclude<UserQuestionData['status'], 'answered'>]: string } = {
  // A pending card that cannot be answered here (outside the live turn) waits like a stopped one.
  pending: 'Waiting for an answer.',
  cancelled: 'The turn was stopped before you answered.',
  dismissed: 'You skipped these questions.',
  expired: 'Nobody answered in time.',
};

export type AnswerQuestion = (_questionId: string, _response: AgentChatQuestionResponse) => Promise<AgentChatQuestion | null>;

function OptionButton({
  description,
  label,
  multiSelect,
  onClick,
  selected,
}: {
  description: string;
  label: string;
  multiSelect: boolean;
  onClick: () => void;
  selected: boolean;
}): JSX.Element {
  return (
    <button
      aria-checked={selected}
      className={`fk:flex fk:w-full fk:items-start fk:gap-2.5 fk:rounded-lg fk:border fk:px-3 fk:py-2 fk:text-left fk:transition-colors fk:corner-squircle ${
        selected ? 'fk:border-primary fk:bg-primary/5' : 'fk:border-border fk:hover:bg-muted/60'
      }`}
      onClick={onClick}
      role={multiSelect ? 'checkbox' : 'radio'}
      type="button"
    >
      <span
        className={`fk:mt-0.5 fk:flex fk:size-4 fk:shrink-0 fk:items-center fk:justify-center fk:border ${
          multiSelect ? 'fk:rounded-sm' : 'fk:rounded-full'
        } ${selected ? 'fk:border-primary fk:bg-primary fk:text-primary-foreground' : 'fk:border-muted-foreground/50'}`}
      >
        {selected ? <CheckIcon className="fk:size-3" /> : null}
      </span>
      <span className="fk:min-w-0">
        <span className="fk:block fk:text-sm fk:font-medium">{label}</span>
        {description ? <span className="fk:block fk:text-xs fk:text-muted-foreground">{description}</span> : null}
      </span>
    </button>
  );
}

function QuestionInput({
  disabled,
  draft,
  onChange,
  question,
}: {
  disabled: boolean;
  draft: QuestionDraft;
  onChange: (_draft: QuestionDraft) => void;
  question: UserQuestionItem;
}): JSX.Element {
  return (
    <fieldset className="fk:space-y-2" disabled={disabled}>
      <legend className="fk:mb-2 fk:flex fk:flex-wrap fk:items-center fk:gap-2">
        <Badge variant="outline">{question.header}</Badge>
        <span className="fk:text-sm fk:font-medium">{question.question}</span>
        {question.multiSelect ? <span className="fk:text-xs fk:text-muted-foreground">Pick any</span> : null}
      </legend>
      <div className="fk:space-y-1.5" role={question.multiSelect ? 'group' : 'radiogroup'}>
        {question.options.map((option) => (
          <OptionButton
            description={option.description}
            key={option.label}
            label={option.label}
            multiSelect={question.multiSelect}
            onClick={() => onChange(toggleQuestionOption(question, draft, option.label))}
            selected={draft.selected.includes(option.label)}
          />
        ))}
        <Input
          aria-label={`Your own answer to: ${question.question}`}
          className="fk:h-9"
          maxLength={4000}
          onChange={(event) => onChange(setQuestionOther(question, draft, event.target.value))}
          placeholder="Other — type your own answer"
          value={draft.other}
        />
      </div>
    </fieldset>
  );
}

function SettledQuestion({ data }: { data: UserQuestionData }): JSX.Element {
  if (data.status === 'answered' && data.message !== undefined) {
    return (
      <div className="fk:space-y-1">
        <p className="fk:text-xs fk:text-muted-foreground">{data.questions.map((question) => question.question).join(' · ')}</p>
        <p className="fk:text-sm">
          You replied: <span className="fk:whitespace-pre-wrap">“{data.message}”</span>
        </p>
      </div>
    );
  }

  if (data.status !== 'answered') {
    return (
      <div className="fk:space-y-1">
        <p className="fk:text-xs fk:text-muted-foreground">{data.questions.map((question) => question.question).join(' · ')}</p>
        <p className="fk:text-sm fk:text-muted-foreground">{SETTLED_LABELS[data.status]}</p>
      </div>
    );
  }

  return (
    <dl className="fk:space-y-1.5">
      {data.questions.map((question, index) => (
        <div className="fk:flex fk:flex-wrap fk:items-baseline fk:gap-x-2" key={index}>
          <dt className="fk:text-xs fk:text-muted-foreground">{question.question}</dt>
          <dd className="fk:text-sm fk:font-medium">{formatQuestionAnswer(data.answers?.[index])}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The questions the chat agent asked. Pending ones take answers (options,
 * own words, or a skip); settled ones show what happened. `answer` is absent
 * outside a live chat turn, where nothing can be answered.
 */
export function QuestionCard({ answer, data }: { answer?: AnswerQuestion; data: UserQuestionData }): JSX.Element {
  const [drafts, setDrafts] = useState<QuestionDraft[]>(() => createQuestionDrafts(data.questions));
  const [settled, setSettled] = useState<UserQuestionData | null>(null);
  const [submitting, setSubmitting] = useState<'answer' | 'dismiss' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  // The stream catches up after the workflow wakes; until then the card shows what this client sent.
  const shown = data.status === 'pending' && settled ? settled : data;

  if (shown.status !== 'pending' || !answer) {
    return <SettledQuestion data={shown} />;
  }

  const answers = getQuestionAnswers(drafts);

  async function submit(response: AgentChatQuestionResponse): Promise<void> {
    if (!answer) {
      return;
    }

    setSubmitting(response.action);
    setErrorMessage('');

    try {
      const question = await answer(data.questionId, response);

      if (question) {
        setSettled({
          ...(question.answers ? { answers: question.answers } : {}),
          ...(question.message !== null ? { message: question.message } : {}),
          questionId: question.id,
          questions: question.questions,
          status: question.status,
        });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not send the answer.');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <form
      className="fk:space-y-5"
      onSubmit={(event) => {
        event.preventDefault();

        if (answers) {
          void submit({ action: 'answer', answers });
        }
      }}
    >
      {data.questions.map((question, index) => (
        <QuestionInput
          disabled={submitting !== null}
          draft={drafts[index] ?? { other: '', selected: [] }}
          key={index}
          onChange={(draft) => setDrafts((current) => current.map((item, itemIndex) => (itemIndex === index ? draft : item)))}
          question={question}
        />
      ))}
      {errorMessage ? <p className="fk:text-xs fk:text-destructive">{errorMessage}</p> : null}
      <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-2">
        <Button disabled={!answers || submitting !== null} size="sm" type="submit">
          {submitting === 'answer' ? <LoaderCircle className="fk:size-3.5 fk:animate-spin" /> : null}
          Submit
        </Button>
        <Button
          disabled={submitting !== null}
          onClick={() => void submit({ action: 'dismiss' })}
          size="sm"
          type="button"
          variant="ghost"
        >
          {submitting === 'dismiss' ? <LoaderCircle className="fk:size-3.5 fk:animate-spin" /> : null}
          Skip
        </Button>
        <span className="fk:text-xs fk:text-muted-foreground">or reply in the chat</span>
      </div>
    </form>
  );
}
