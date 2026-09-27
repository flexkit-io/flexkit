import { getSchema, getText, getTextSerializersFromSchema } from '@tiptap/core';
import type { Extensions } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { defaultExtensions } from '../../form/fields/editor/extensions';

// generateText builds this schema for every call. Grid cells share the same
// extensions, so compile once, on the first rich-text preview that needs it.
let serializer: ReturnType<typeof createSerializer> | undefined;

function createSerializer() {
  const schema = getSchema(defaultExtensions as Extensions);

  return { schema, textSerializers: getTextSerializersFromSchema(schema) };
}

export function getEditorPreviewText(value: string | undefined, maxLength = 100): string {
  if (!value) {
    return '';
  }

  try {
    const document = JSON.parse(value);
    serializer ??= createSerializer();

    return getText(Node.fromJSON(serializer.schema, document), {
      textSerializers: serializer.textSerializers,
    }).substring(0, maxLength);
  } catch {
    return value.substring(0, maxLength);
  }
}
