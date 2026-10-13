import type { JSX } from 'react';
import { useEffect, useRef } from 'react';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
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
import { lightTheme, darkTheme } from './markdown-editor-themes';

export interface MarkdownEditorProps {
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
  onBlur?: () => void;
  onChange?: (_value: string) => void;
  onSave?: () => void;
  placeholder?: string;
  readOnly?: boolean;
  value: string;
}

function isDarkTheme(): boolean {
  const root = document.documentElement;

  return (
    root.getAttribute('data-theme') === 'dark' || root.classList.contains('dark') || root.style.colorScheme === 'dark'
  );
}

const editorChrome = EditorView.theme({
  '&': {
    fontSize: '13px',
    height: '100%',
    maxHeight: '100%',
    maxWidth: '100%',
    minHeight: '0',
    minWidth: '0',
    width: '100%',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    height: '100%',
    lineHeight: '1.6',
    minHeight: '0',
    minWidth: '0',
    overflow: 'auto',
    width: '100%',
  },
  '.cm-content': {
    fontSize: '13px',
    fontStyle: 'normal',
    fontWeight: '400',
    minWidth: '0 !important',
    padding: '12px 0',
  },
  '.cm-line, .cm-line span': {
    fontSize: 'inherit',
    fontStyle: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
  },
  '.cm-gutters': {
    borderRight: '1px solid transparent',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
    border: 'none',
  },
});

function themeExtensions(dark: boolean) {
  return [dark ? darkTheme : lightTheme, editorChrome];
}

function readOnlyExtensions(readOnly: boolean) {
  return [EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)];
}

function contentAttributes(options: {
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  readOnly?: boolean;
}): { [name: string]: string } {
  const attributes: { [name: string]: string } = {
    'aria-multiline': 'true',
    role: 'textbox',
  };

  if (options.ariaLabel) {
    attributes['aria-label'] = options.ariaLabel;
  }

  if (options.ariaLabelledBy) {
    attributes['aria-labelledby'] = options.ariaLabelledBy;
  }

  if (options.ariaDescribedBy) {
    attributes['aria-describedby'] = options.ariaDescribedBy;
  }

  if (options.ariaInvalid) {
    attributes['aria-invalid'] = 'true';
  }

  if (options.readOnly) {
    attributes['aria-readonly'] = 'true';
  }

  return attributes;
}

export function MarkdownEditor({
  ariaDescribedBy,
  ariaInvalid,
  ariaLabel,
  ariaLabelledBy,
  className,
  onBlur,
  onChange,
  onSave,
  placeholder,
  readOnly = false,
  value,
}: MarkdownEditorProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartmentRef = useRef(new Compartment());
  const readOnlyCompartmentRef = useRef(new Compartment());
  const a11yCompartmentRef = useRef(new Compartment());
  const onBlurRef = useRef(onBlur);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const valueRef = useRef(value);

  onBlurRef.current = onBlur;
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;
  valueRef.current = value;

  useEffect(() => {
    const parent = parentRef.current;

    if (!parent) {
      return;
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
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          EditorView.lineWrapping,
          markdown({ codeLanguages: languages }),
          keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...foldKeymap, indentWithTab]),
          Prec.highest(
            keymap.of([
              {
                key: 'Mod-s',
                run: () => {
                  onSaveRef.current?.();

                  return true;
                },
              },
            ])
          ),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current?.(update.state.doc.toString());
            }

            if (update.focusChanged && !update.view.hasFocus) {
              onBlurRef.current?.();
            }
          }),
          themeCompartmentRef.current.of(themeExtensions(isDarkTheme())),
          readOnlyCompartmentRef.current.of(readOnlyExtensions(readOnly)),
          a11yCompartmentRef.current.of(
            EditorView.contentAttributes.of(
              contentAttributes({
                ariaDescribedBy,
                ariaInvalid,
                ariaLabel,
                ariaLabelledBy,
                readOnly,
              })
            )
          ),
          ...(placeholder ? [placeholderExtension(placeholder)] : []),
        ],
      }),
    });

    viewRef.current = view;

    const resizeObserver = new ResizeObserver(() => {
      view.requestMeasure();
    });

    resizeObserver.observe(parent);

    const themeObserver = new MutationObserver(() => {
      view.dispatch({
        effects: themeCompartmentRef.current.reconfigure(themeExtensions(isDarkTheme())),
      });
    });

    themeObserver.observe(document.documentElement, {
      attributeFilter: ['class', 'data-theme', 'style'],
      attributes: true,
    });

    return () => {
      resizeObserver.disconnect();
      themeObserver.disconnect();
      view.destroy();
      viewRef.current = null;
    };
    // Mount once; later prop changes are applied through compartments / document transactions.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editor view is created once
  }, []);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(themeExtensions(isDarkTheme())),
    });
    // Imported palettes live at module scope; this re-applies them after tsup/HMR.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- theme extensions change on hot reload
  }, [lightTheme, darkTheme]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    const current = view.state.doc.toString();

    if (current === value) {
      return;
    }

    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    view.dispatch({
      effects: [
        readOnlyCompartmentRef.current.reconfigure(readOnlyExtensions(readOnly)),
        a11yCompartmentRef.current.reconfigure(
          EditorView.contentAttributes.of(
            contentAttributes({
              ariaDescribedBy,
              ariaInvalid,
              ariaLabel,
              ariaLabelledBy,
              readOnly,
            })
          )
        ),
      ],
    });
  }, [ariaDescribedBy, ariaInvalid, ariaLabel, ariaLabelledBy, readOnly]);

  return (
    <div className={className ?? 'fk:h-full fk:min-h-0 fk:min-w-0 fk:w-full fk:overflow-hidden'} ref={parentRef} />
  );
}
