'use client';

import { useState } from 'react';
import { useCompletion } from 'ai/react';
import { ArrowUp } from 'lucide-react';
import { useEditor } from 'novel';
import { addAIHighlight } from 'novel/extensions';
import { useParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import { toast } from 'sonner';
import { Command, CommandInput, CommandList } from '../../../../ui/primitives/command';
import { Button } from '../../../../ui/primitives/button';
import CrazySpinner from '../icons/crazy-spinner';
import Magic from '../icons/magic';
import { ScrollArea } from '../../../../ui/primitives/scroll-area';
import { apiPaths } from '../../../../core/api-paths';
import AICompletionCommands from './ai-completion-command';
import AISelectorCommands from './ai-selector-commands';

interface AISelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISelector({ onOpenChange }: AISelectorProps): JSX.Element | null {
  const { editor } = useEditor();
  const [inputValue, setInputValue] = useState('');
  const { projectId } = useParams();

  const { completion, complete, isLoading } = useCompletion({
    api: apiPaths(projectId).completion,
    onResponse: (response) => {
      if (response.status === 429) {
        toast.error('You have reached your request limit for the day.');

        return;
      }
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const hasCompletion = completion.length > 0;

  if (!editor) return null;

  return (
    <Command className="fk-w-[350px]">
      {hasCompletion && (
        <div className="fk-flex fk-max-h-[400px]">
          <ScrollArea>
            <div className="fk-prose fk-p-2 fk-px-4 fk-prose-sm">
              <Markdown>{completion}</Markdown>
            </div>
          </ScrollArea>
        </div>
      )}

      {isLoading && (
        <div className="fk-flex fk-h-12 fk-w-full fk-items-center fk-px-4 fk-text-sm fk-font-medium fk-text-muted-foreground fk-text-pink-600">
          <Magic className="fk-mr-2 fk-h-4 fk-w-4 fk-shrink-0  " />
          AI is thinking
          <div className="fk-ml-2 fk-mt-1">
            <CrazySpinner />
          </div>
        </div>
      )}
      {!isLoading && (
        <>
          <div className="fk-relative">
            <CommandInput
              value={inputValue}
              onValueChange={setInputValue}
              autoFocus
              placeholder={hasCompletion ? 'Tell AI what to do next' : 'Ask AI to edit or generate...'}
              onFocus={() => addAIHighlight(editor)}
            />
            <Button
              size="icon"
              className="fk-absolute fk-right-2 fk-top-1/2 fk-h-6 w-6 -fk-translate-y-1/2 fk-rounded-full fk-bg-pink-600 hover:fk-bg-pink-800"
              onClick={() => {
                if (completion)
                  return complete(completion, {
                    body: { option: 'zap', command: inputValue },
                  }).then(() => setInputValue(''));

                const slice = editor.state.selection.content();
                const text = editor.storage.markdown.serializer.serialize(slice.content);

                complete(text, {
                  body: { option: 'zap', command: inputValue },
                }).then(() => setInputValue(''));
              }}
            >
              <ArrowUp className="fk-h-4 fk-w-4" />
            </Button>
          </div>
          <CommandList>
            {hasCompletion ? (
              <AICompletionCommands
                onDiscard={() => {
                  editor.chain().unsetHighlight().focus().run();
                  onOpenChange(false);
                }}
                completion={completion}
              />
            ) : (
              <AISelectorCommands onSelect={(value, option) => complete(value, { body: { option } })} />
            )}
          </CommandList>
        </>
      )}
    </Command>
  );
}
