import { generateText } from '@tiptap/core';
import { defaultExtensions } from '../../form/fields/editor/extensions';

const MAX_LENGTH = 100;

/**
 * Renders a preview of the editor content.
 */
export function Editor({ value }: { value: string }) {
  let textValue;

  try {
    textValue = generateText(JSON.parse(value), defaultExtensions).substring(0, MAX_LENGTH);
  } catch (e) {
    textValue = value.substring(0, MAX_LENGTH);
  }

  return <div className="fk-truncate">{textValue}</div>;
}
