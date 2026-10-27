'use client';

import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { Compartment, EditorState, Prec } from '@codemirror/state';
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  placeholder as placeholderExtension,
} from '@codemirror/view';
import { graphql, updateSchema } from 'cm6-graphql';
import type { GraphQLSchema } from 'graphql';
import { darkTheme, lightTheme } from '../ai/markdown-editor-themes';

export interface QueryEditorProps {
  ariaLabel: string;
  /** The project's schema, for completion and validation; null until introspected. */
  schema: GraphQLSchema | null;
  theme: 'light' | 'dark';
  value: string;
  onChange: (value: string) => void;
  /** Mod+Enter. */
  onRun: () => void;
}

const editorChrome = EditorView.theme({
  '&': { fontSize: '13px', height: '100%', minHeight: '0' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { height: '100%', lineHeight: '1.6', minHeight: '0', overflow: 'auto' },
  '.cm-content': { fontSize: '13px', padding: '12px 0' },
  '.cm-gutters': { borderRight: '1px solid transparent' },
});

/** A GraphQL editor: syntax, completion and linting against the project schema. */
export function QueryEditor({ ariaLabel, schema, theme, value, onChange, onRun }: QueryEditorProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartmentRef = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const valueRef = useRef(value);
  onChangeRef.current = onChange;
  onRunRef.current = onRun;
  valueRef.current = value;

  useEffect(() => {
    const parent = parentRef.current;

    if (!parent) {
      return undefined;
    }

    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: valueRef.current,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          foldGutter(),
          drawSelection(),
          dropCursor(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          highlightActiveLine(),
          Prec.highest(
            keymap.of([
              {
                key: 'Mod-Enter',
                run: () => {
                  onRunRef.current();

                  return true;
                },
              },
            ])
          ),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
          graphql(undefined, { showErrorOnInvalidSchema: false }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          EditorView.contentAttributes.of({ 'aria-label': ariaLabel, 'aria-multiline': 'true', role: 'textbox' }),
          placeholderExtension('query {\n  …\n}'),
          themeCompartmentRef.current.of([theme === 'dark' ? darkTheme : lightTheme, editorChrome]),
        ],
      }),
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Mounted once; the theme, schema and value are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, []);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeCompartmentRef.current.reconfigure([theme === 'dark' ? darkTheme : lightTheme, editorChrome]),
    });
  }, [theme]);

  useEffect(() => {
    if (viewRef.current) {
      updateSchema(viewRef.current, schema ?? undefined);
    }
  }, [schema]);

  // A value set from outside (an example, the remembered query) replaces the document.
  useEffect(() => {
    const view = viewRef.current;

    if (!view || view.state.doc.toString() === value) {
      return;
    }

    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  return <div className="fk:h-full fk:min-h-0 fk:w-full" data-testid="graph-query-editor" ref={parentRef} />;
}
