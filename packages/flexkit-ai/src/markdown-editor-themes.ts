import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { createTheme } from '@uiw/codemirror-themes';

const EDITOR_FONT = 'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const DARK_THEME_BACKGROUND = '#212121';
const LIGHT_THEME_BACKGROUND = '#fafafa';

function withEditorSurface(theme: Extension, background: string, gutterBackground: string): Extension {
  return [
    theme,
    EditorView.theme({
      '&': {
        backgroundColor: background,
      },
      '.cm-scroller': {
        backgroundColor: background,
      },
      '.cm-gutters': {
        backgroundColor: gutterBackground,
      },
    }),
  ];
}

export const darkTheme: Extension = withEditorSurface(
  createTheme({
    settings: {
      background: DARK_THEME_BACKGROUND,
      caret: '#f8f8f0',
      fontFamily: EDITOR_FONT,
      foreground: '#f8f8f2',
      gutterBackground: DARK_THEME_BACKGROUND,
      gutterBorder: 'transparent',
      gutterForeground: '#6d8a88',
      lineHighlight: 'rgba(255, 255, 255, 0.1)',
      selection: 'rgba(255, 255, 255, 0.1)',
      selectionMatch: 'rgba(255, 255, 255, 0.2)',
    },
    styles: [
      { color: '#6272a4', tag: [t.comment, t.quote, t.strikethrough] },
      { color: '#6272a4', tag: [t.meta, t.processingInstruction] },
      { color: '#f1fa8c', tag: t.string },
      { color: '#f91f6f', tag: [t.atom, t.bool, t.number, t.heading] },
      { color: '#ff79c6', tag: [t.keyword, t.operator, t.tagName] },
      { color: '#8be9fd', tag: [t.typeName, t.link, t.url] },
      { color: '#009fb8', tag: [t.className, t.attributeName, t.monospace] },
      { color: '#66d9ef', tag: [t.propertyName, t.function(t.propertyName)] },
      {
        color: '#009fb8',
        tag: [t.definition(t.variableName), t.function(t.variableName)],
      },
      { color: '#0072f5', tag: [t.strong, t.emphasis] },
      { color: '#ff5555', tag: t.invalid },
    ],
    theme: 'dark',
  }),
  DARK_THEME_BACKGROUND,
  DARK_THEME_BACKGROUND
);

export const lightTheme: Extension = withEditorSurface(
  createTheme({
    settings: {
      background: LIGHT_THEME_BACKGROUND,
      caret: '#526fff',
      fontFamily: EDITOR_FONT,
      foreground: '#383a42',
      gutterBackground: LIGHT_THEME_BACKGROUND,
      gutterBorder: 'transparent',
      gutterForeground: '#9d9d9f',
      lineHighlight: '#383a420c',
      selection: '#e5e5e6',
      selectionMatch: '#e5e5e6',
    },
    styles: [
      { color: '#a0a1a7', tag: [t.comment, t.quote, t.strikethrough] },
      { color: '#a0a1a7', tag: [t.meta, t.processingInstruction] },
      { color: '#50a14f', tag: t.string },
      { color: '#986801', tag: [t.attributeName] },
      { color: '#a626a4', tag: t.keyword },
      { color: '#0072f5', tag: [t.operator, t.strong, t.emphasis] },
      { color: '#f91f6f', tag: [t.atom, t.bool, t.number, t.heading] },
      { color: '#c18401', tag: [t.typeName, t.className] },
      { color: '#009fb8', tag: [t.tagName, t.propertyName, t.monospace] },
      { color: '#4078f2', tag: [t.link, t.url, t.function(t.variableName), t.definition(t.variableName)] },
      { color: '#f91f6f', tag: t.invalid },
    ],
    theme: 'light',
  }),
  LIGHT_THEME_BACKGROUND,
  LIGHT_THEME_BACKGROUND
);
