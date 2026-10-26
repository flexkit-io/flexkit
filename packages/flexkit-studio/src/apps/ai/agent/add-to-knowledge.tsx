import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { CheckIcon, LibraryIcon, LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import { useConfig } from '../../../core/config/config-context';
import { useCanMutate } from '../../../core/permissions';
import { toast, Tooltip, TooltipContent, TooltipTrigger } from '../../../ui';
import { createKnowledgeApi } from '../../knowledge/api';
import { getKnowledgeFileProblem, getKnowledgeSourcePath } from '../../knowledge/knowledge';
import { announceRegistered, describeApiError, invalidateKnowledgeLists } from '../../knowledge/shared';
import { resolveAddToKnowledgeState, type AddToKnowledgeState } from '../attachment-state';
import type { AgentChatAttachment } from '../types';

/** Chat detail keys: after an add, every loaded chat learns the document for that content. */
function isAgentChatDetailKey(key: unknown): boolean {
  return typeof key === 'string' && key.includes('/agent/chats/');
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
  const { mutate } = useSWRConfig();
  const api = useMemo(() => (currentProjectId ? createKnowledgeApi(currentProjectId) : null), [currentProjectId]);
  const [localState, setLocalState] = useState<AddToKnowledgeState>({ kind: 'idle' });
  const state = resolveAddToKnowledgeState(localState, attachment);
  const supported = getKnowledgeFileProblem({ name: attachment.filename, size: attachment.sizeBytes }) === null;

  if (!api || !currentProjectId || !canMutate || !supported) {
    return null;
  }

  const knowledgeApi = api;
  const projectId = currentProjectId;

  async function add(): Promise<void> {
    setLocalState({ kind: 'adding' });

    try {
      const result = await knowledgeApi.addChatAttachment({ filename: attachment.filename, url: attachment.url });

      announceRegistered(result, attachment.filename);
      setLocalState({ kind: 'added', sourceId: result.source.id });
      // An open Knowledge list stays mounted behind this app, and other chips
      // for the same file (another message, another chat) read the chat detail.
      void invalidateKnowledgeLists();
      void mutate(isAgentChatDetailKey);
    } catch (error) {
      toast.error(describeApiError(error, `${attachment.filename} could not be added to Knowledge.`));
      setLocalState({ kind: 'idle' });
    }
  }

  let label = 'Add to Knowledge';
  let icon = <LibraryIcon className="fk:size-3" />;

  if (state.kind === 'adding') {
    icon = <LoaderCircle className="fk:size-3 fk:animate-spin" />;
  } else if (state.kind === 'added') {
    label = 'Open in Knowledge';
    icon = <CheckIcon className="fk:size-3" />;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Not `disabled`: a disabled button swallows pointer events and the tooltip could never explain the spinner. */}
        <button
          aria-disabled={state.kind === 'adding'}
          aria-label={`${label}: ${attachment.filename}`}
          className="fk:absolute fk:top-1 fk:right-1 fk:z-10 fk:flex fk:size-5 fk:items-center fk:justify-center fk:rounded-full fk:border fk:border-border fk:bg-background fk:text-foreground fk:shadow-sm fk:transition-colors fk:hover:bg-accent fk:focus-visible:outline-none fk:focus-visible:ring-2 fk:focus-visible:ring-ring fk:aria-disabled:cursor-default fk:aria-disabled:hover:bg-background fk:corner-squircle"
          data-knowledge-state={state.kind}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();

            if (state.kind === 'idle') {
              void add();
            } else if (state.kind === 'added') {
              void navigate(getKnowledgeSourcePath(projectId, state.sourceId));
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
