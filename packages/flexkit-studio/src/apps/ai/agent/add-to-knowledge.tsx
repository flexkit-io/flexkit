import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { CheckIcon, LibraryIcon, LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../../../core/config/config-context';
import { useCanMutate } from '../../../core/permissions';
import { toast, Tooltip, TooltipContent, TooltipTrigger } from '../../../ui';
import { createKnowledgeApi } from '../../knowledge/api';
import { getKnowledgeFileProblem, getKnowledgeSourcePath } from '../../knowledge/knowledge';
import { announceRegistered, describeApiError, invalidateKnowledgeLists } from '../../knowledge/shared';
import type { AgentChatAttachment } from '../types';

type AddState = { kind: 'idle' } | { kind: 'adding' } | { kind: 'added'; sourceId: string | null };

/** What the chip starts as: the platform says which attachments are already documents the reader may see. */
export function getInitialAddState(attachment: Pick<AgentChatAttachment, 'knowledgeSourceId'>): AddState {
  return attachment.knowledgeSourceId ? { kind: 'added', sourceId: attachment.knowledgeSourceId } : { kind: 'idle' };
}

/**
 * Promotes a document the user attached to a chat into Knowledge, where the
 * agent can search and cite it in every later conversation. Shown only for
 * files the platform can index and only to members who may add documents.
 * Once the file is a document, the chip opens it instead.
 */
export function AddToKnowledgeButton({ attachment }: { attachment: AgentChatAttachment }): JSX.Element | null {
  const { currentProjectId } = useConfig();
  const canMutate = useCanMutate();
  const navigate = useNavigate();
  const api = useMemo(() => (currentProjectId ? createKnowledgeApi(currentProjectId) : null), [currentProjectId]);
  const [state, setState] = useState<AddState>(() => getInitialAddState(attachment));
  const supported = getKnowledgeFileProblem({ name: attachment.filename, size: attachment.sizeBytes }) === null;

  if (!api || !currentProjectId || !canMutate || !supported) {
    return null;
  }

  const knowledgeApi = api;
  const projectId = currentProjectId;

  async function add(): Promise<void> {
    setState({ kind: 'adding' });

    try {
      const result = await knowledgeApi.addChatAttachment({ filename: attachment.filename, url: attachment.url });

      announceRegistered(result, attachment.filename);
      // An open Knowledge list stays mounted behind this app; it must learn about the new document.
      void invalidateKnowledgeLists();
      setState({ kind: 'added', sourceId: result.source.id });
    } catch (error) {
      toast.error(describeApiError(error, `${attachment.filename} could not be added to Knowledge.`));
      setState({ kind: 'idle' });
    }
  }

  const sourceId = state.kind === 'added' ? state.sourceId : null;
  let label = 'Add to Knowledge';
  let icon = <LibraryIcon className="fk:size-3" />;

  if (state.kind === 'adding') {
    icon = <LoaderCircle className="fk:size-3 fk:animate-spin" />;
  } else if (state.kind === 'added') {
    label = sourceId ? 'Open in Knowledge' : 'In Knowledge';
    icon = <CheckIcon className="fk:size-3" />;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Not `disabled`: a disabled button swallows pointer events and the tooltip could never explain the check. */}
        <button
          aria-disabled={state.kind === 'adding' || (state.kind === 'added' && !sourceId)}
          aria-label={`${label}: ${attachment.filename}`}
          className="fk:absolute fk:top-1 fk:right-1 fk:z-10 fk:flex fk:size-5 fk:items-center fk:justify-center fk:rounded-full fk:border fk:border-border fk:bg-background fk:text-foreground fk:shadow-sm fk:transition-colors fk:hover:bg-accent fk:focus-visible:outline-none fk:focus-visible:ring-2 fk:focus-visible:ring-ring fk:aria-disabled:cursor-default fk:aria-disabled:hover:bg-background fk:corner-squircle"
          data-knowledge-state={state.kind}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();

            if (state.kind === 'idle') {
              void add();
            } else if (sourceId) {
              void navigate(getKnowledgeSourcePath(projectId, sourceId));
            }
          }}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
