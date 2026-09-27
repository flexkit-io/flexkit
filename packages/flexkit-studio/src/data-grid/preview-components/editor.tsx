import { useMemo } from 'react';
import { getEditorPreviewText } from './editor-text';
import { CopyableTruncatedText } from './copyable-truncated-text';

/**
 * Renders a preview of the editor content.
 */
export function Editor({ value }: { value: string }) {
  const textValue = useMemo(() => getEditorPreviewText(value), [value]);

  return <CopyableTruncatedText value={textValue} />;
}
