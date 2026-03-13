import type { EditorInstance } from 'novel';

type HeadingLevel = 1 | 2 | 3;
type EditorRange = {
  from: number;
  to: number;
};

type SocialEmbedOptions = {
  src: string;
};

export type NovelEditorInput = EditorInstance | null | undefined;

export interface NovelEditorChain {
  focus: () => NovelEditorChain;
  clearNodes: () => NovelEditorChain;
  deleteRange: (range: EditorRange) => NovelEditorChain;
  toggleNode: (typeOrName: string, toggleTypeOrName: string) => NovelEditorChain;
  setNode: (typeOrName: string, attributes?: { level?: HeadingLevel }) => NovelEditorChain;
  toggleBold: () => NovelEditorChain;
  toggleItalic: () => NovelEditorChain;
  toggleUnderline: () => NovelEditorChain;
  toggleStrike: () => NovelEditorChain;
  toggleCode: () => NovelEditorChain;
  toggleHeading: (attributes: { level: HeadingLevel }) => NovelEditorChain;
  toggleTaskList: () => NovelEditorChain;
  toggleBulletList: () => NovelEditorChain;
  toggleOrderedList: () => NovelEditorChain;
  toggleBlockquote: () => NovelEditorChain;
  toggleCodeBlock: () => NovelEditorChain;
  setYoutubeVideo: (attributes: SocialEmbedOptions) => NovelEditorChain;
  setTweet: (attributes: SocialEmbedOptions) => NovelEditorChain;
  run: () => boolean;
}

export type NovelEditorWithRichCommands = Omit<EditorInstance, 'chain'> & {
  chain: () => NovelEditorChain;
};

export function asNovelEditorWithRichCommands(editor: NovelEditorInput): NovelEditorWithRichCommands | null {
  if (editor == null) {
    return null;
  }

  return editor as unknown as NovelEditorWithRichCommands;
}
