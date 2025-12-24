'use client';

import { useState } from 'react';
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  EditorRoot,
  handleCommandNavigation,
  handleImageDrop,
  handleImagePaste,
  ImageResizer,
  type EditorInstance,
  type JSONContent,
  type SuggestionItem,
} from 'novel';
import { useDebouncedCallback } from 'use-debounce';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../../ui/primitives/form';
import { Separator } from '../../../ui/primitives/separator';
import type { FormFieldValue } from '../../../graphql-client/types';
import type { FormFieldParams } from '../../types';
import { DefaultValueSwitch } from '../default-value-switch';
import { defaultExtensions } from './extensions';
import { slashCommand, suggestionItems } from './slash-command';
import { ColorSelector } from './selectors/color-selector';
import { LinkSelector } from './selectors/link-selector';
import { NodeSelector } from './selectors/node-selector';
import { MathSelector } from './selectors/math-selector';
import { TextButtons } from './selectors/text-buttons';
import GenerativeMenuSwitch from './generative/generative-menu-switch';

const extensions = [...defaultExtensions, slashCommand];

export default function Editor({
  control,
  defaultValue,
  fieldSchema,
  setValue,
}: FormFieldParams<'editor'>): JSX.Element {
  const { name, label, isEditable, options } = fieldSchema;
  let initialValue;

  try {
    initialValue = defaultValue?.value ? JSON.parse(defaultValue.value as string) : undefined;
  } catch {
    initialValue = undefined;
  }

  const [content, setContent] = useState<JSONContent | undefined>(initialValue);
  const [openAI, setOpenAI] = useState(false);
  const [openNode, setOpenNode] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openColor, setOpenColor] = useState(false);

  const debouncedUpdates = useDebouncedCallback((editor: EditorInstance, previousValue: FormFieldValue | undefined) => {
    const json = editor.getJSON();

    setContent(json);
    setValue(name, {
      ...previousValue,
      value: JSON.stringify(json),
    });
  }, 300);

  function handleCheckbox(checked: boolean, value: FormFieldValue | undefined): void {
    setValue(name, {
      ...value,
      disabled: checked,
    });
  }

  // TODO: replace this with a real upload function.
  // See: https://github.com/steven-tey/novel/blob/ecdb5d2ff5d3e6ab5f5af95b5a81de3ab4e8a0e9/apps/web/components/tailwind/image-upload.ts
  const uploadFn = (file: File) => {
    // eslint-disable-next-line no-console
    console.log('Image uploader not yet implemented', file);

    return Promise.resolve('https://via.placeholder.com/150');
  };

  return (
    <FormField
      control={control}
      defaultValue={defaultValue}
      name={name}
      render={({ field }: { field: { value?: FormFieldValue } }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          {options?.comment ? <FormDescription>{options.comment}</FormDescription> : null}
          <FormControl>
            <EditorRoot>
              <EditorContent
                className="fk-relative fk-w-full fk-max-w-screen-lg fk-rounded-md fk-border fk-border-input fk-ring-offset-background focus-within:fk-outline-none focus-within:fk-ring-2 focus-within:fk-ring-ring focus-within:fk-ring-offset-2"
                editable={isEditable !== false && !field.value?.disabled}
                editorProps={{
                  handleDOMEvents: {
                    keydown: (_view, event) => handleCommandNavigation(event),
                  },
                  handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
                  handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
                  attributes: {
                    class:
                      'fk-prose prose-lg dark:fk-prose-invert prose-headings:fk-font-title fk-min-h-[150px] fk-font-default fk-rounded-md ' +
                      'focus:fk-outline-none fk-max-w-full fk-bg-background ',
                  },
                }}
                extensions={extensions}
                initialContent={content}
                immediatelyRender={true}
                onUpdate={({ editor }) => {
                  debouncedUpdates(editor, field.value);
                }}
                slotAfter={<ImageResizer />}
              >
                <EditorCommand className="fk-z-50 fk-h-auto fk-max-h-[330px] fk-overflow-y-auto fk-rounded-md fk-border fk-border-muted fk-bg-background fk-px-1 fk-py-2 fk-shadow-md fk-transition-all fk-pointer-events-auto">
                  <EditorCommandEmpty className="fk-px-2 fk-text-muted-foreground">No results</EditorCommandEmpty>
                  <EditorCommandList>
                    {suggestionItems.map((item: SuggestionItem) => (
                      <EditorCommandItem
                        value={item.title}
                        onCommand={(val) => item.command?.(val)}
                        className="fk-flex fk-w-full fk-items-center fk-space-x-2 fk-rounded-md fk-px-2 fk-py-1 fk-text-left fk-text-sm hover:fk-bg-muted aria-selected:fk-bg-muted"
                        key={item.title}
                      >
                        <div className="fk-flex fk-h-10 fk-w-10 fk-items-center fk-justify-center fk-rounded-md fk-border fk-border-muted fk-bg-background">
                          {item.icon}
                        </div>
                        <div>
                          <p className="fk-font-medium">{item.title}</p>
                          <p className="fk-text-xs fk-text-muted-foreground">{item.description}</p>
                        </div>
                      </EditorCommandItem>
                    ))}
                  </EditorCommandList>
                </EditorCommand>
                <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
                  <Separator orientation="vertical" />
                  <NodeSelector open={openNode} onOpenChange={setOpenNode} />
                  <Separator orientation="vertical" />
                  <LinkSelector open={openLink} onOpenChange={setOpenLink} />
                  <Separator orientation="vertical" />
                  <MathSelector />
                  <Separator orientation="vertical" />
                  <TextButtons />
                  <Separator orientation="vertical" />
                  <ColorSelector open={openColor} onOpenChange={setOpenColor} />
                </GenerativeMenuSwitch>
              </EditorContent>
            </EditorRoot>
          </FormControl>
          <DefaultValueSwitch
            checked={field.value?.disabled ?? false}
            onChange={(checked) => {
              handleCheckbox(checked, field.value);
            }}
            scope={field.value?.scope}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
