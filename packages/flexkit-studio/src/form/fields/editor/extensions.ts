import {
  AIHighlight,
  CharacterCount,
  CodeBlockLowlight,
  Color,
  CustomKeymap,
  GlobalDragHandle,
  HighlightExtension,
  HorizontalRule,
  Placeholder,
  StarterKit,
  TaskItem,
  TaskList,
  TextStyle,
  TiptapImage,
  TiptapLink,
  TiptapUnderline,
  Twitter,
  Youtube,
  Mathematics,
  UploadImagesPlugin,
} from 'novel';
import { Extensions } from '@tiptap/core';
import { Markdown } from 'tiptap-markdown';
import { cx } from 'class-variance-authority';
import { common, createLowlight } from 'lowlight';

//TODO I am using cx here to get tailwind autocomplete working, idk if someone else can write a regex to just capture the class key in objects
const aiHighlight = AIHighlight;
//You can overwrite the placeholder with your own configuration
const placeholder = Placeholder;
const tiptapLink = TiptapLink.configure({
  HTMLAttributes: {
    'class': cx(
      'fk-text-muted-foreground fk-underline fk-underline-offset-[3px] hover:fk-text-primary fk-transition-colors fk-cursor-pointer'
    ),
  },
});

const markdownExtension = Markdown.configure({
  html: true,
  tightLists: true,
  tightListClass: 'tight',
  bulletListMarker: '-',
  linkify: false,
  breaks: false,
  transformPastedText: false,
  transformCopiedText: false,
});

const tiptapImage = TiptapImage.extend({
  addProseMirrorPlugins() {
    return [
      UploadImagesPlugin({
        imageClass: cx('fk-opacity-40 fk-rounded-lg fk-border fk-border-stone-200'),
      }),
    ];
  },
}).configure({
  allowBase64: true,
  HTMLAttributes: {
    class: cx('fk-rounded-lg fk-border fk-border-muted'),
  },
});

const taskList = TaskList.configure({
  HTMLAttributes: {
    class: cx('fk-not-prose fk-pl-2 '),
  },
});
const taskItem = TaskItem.configure({
  HTMLAttributes: {
    'class': cx('fk-flex gap-2 fk-items-start fk-my-2'),
  },
  nested: true,
});

const horizontalRule = HorizontalRule.configure({
  HTMLAttributes: {
    'class': cx('mt-4 mb-6 border-t border-muted-foreground'),
  },
});

const starterKit = StarterKit.configure({
  bulletList: {
    HTMLAttributes: {
      'class': cx('fk-list-disc fk-list-outside fk-leading-3 -fk-mt-2'),
    },
  },
  orderedList: {
    HTMLAttributes: {
      'class': cx('fk-list-decimal fk-list-outside fk-leading-3 -fk-mt-2'),
    },
  },
  listItem: {
    HTMLAttributes: {
      'class': cx('fk-leading-normal -fk-mb-2'),
    },
  },
  blockquote: {
    HTMLAttributes: {
      'class': cx('fk-border-l-4 fk-border-primary'),
    },
  },
  codeBlock: false,
  code: {
    HTMLAttributes: {
      'class': cx('fk-rounded-md fk-bg-muted fk-px-1.5 fk-py-1 fk-font-mono fk-font-medium'),
      spellcheck: 'false',
    },
  },
  horizontalRule: false,
  dropcursor: {
    color: '#DBEAFE',
    width: 4,
  },
  gapcursor: false,
});

const codeBlockLowlight = CodeBlockLowlight.configure({
  // configure lowlight: common /  all / use highlightJS in case there is a need to specify certain language grammars only
  // common: covers 37 language grammars which should be good enough in most cases
  lowlight: createLowlight(common),
});

const youtube = Youtube.configure({
  HTMLAttributes: {
    'class': cx('fk-rounded-lg fk-border fk-border-muted'),
  },
  inline: false,
});

const twitter = Twitter.configure({
  HTMLAttributes: {
    'class': cx('fk-not-prose'),
  },
  inline: false,
});

const mathematics = Mathematics.configure({
  HTMLAttributes: {
    'class': cx('fk-text-foreground fk-rounded fk-p-1 hover:fk-bg-muted fk-cursor-pointer'),
  },
  katexOptions: {
    throwOnError: false,
  },
});

const characterCount = CharacterCount.configure();

export const defaultExtensions: Extensions = [
  starterKit,
  placeholder,
  tiptapLink,
  tiptapImage,
  taskList,
  taskItem,
  horizontalRule,
  aiHighlight,
  codeBlockLowlight,
  youtube,
  twitter,
  mathematics,
  characterCount,
  TiptapUnderline,
  markdownExtension,
  HighlightExtension,
  TextStyle,
  Color,
  CustomKeymap,
  GlobalDragHandle,
];
