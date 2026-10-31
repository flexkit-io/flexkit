export interface DiffLine {
  kind: 'added' | 'removed' | 'same';
  text: string;
}

/** Above this many line pairs the diff is not computed; callers show both versions instead. */
const MAX_DIFF_CELLS = 2_500_000;

/**
 * A line diff of two texts (longest common subsequence), for showing what a
 * proposed change does to a document. Null when the texts are too long to
 * compare quickly.
 */
export function diffLines(before: string, after: string): DiffLine[] | null {
  const left = before.split('\n');
  const right = after.split('\n');

  if (left.length * right.length > MAX_DIFF_CELLS) {
    return null;
  }

  // lengths[i][j]: the longest common subsequence of left[i:] and right[j:].
  const width = right.length + 1;
  const lengths = new Uint32Array((left.length + 1) * width);

  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      lengths[i * width + j] =
        left[i] === right[j]
          ? lengths[(i + 1) * width + j + 1]! + 1
          : Math.max(lengths[(i + 1) * width + j]!, lengths[i * width + j + 1]!);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      lines.push({ kind: 'same', text: left[i]! });
      i++;
      j++;
    } else if (lengths[(i + 1) * width + j]! >= lengths[i * width + j + 1]!) {
      lines.push({ kind: 'removed', text: left[i]! });
      i++;
    } else {
      lines.push({ kind: 'added', text: right[j]! });
      j++;
    }
  }

  for (; i < left.length; i++) lines.push({ kind: 'removed', text: left[i]! });
  for (; j < right.length; j++) lines.push({ kind: 'added', text: right[j]! });

  return lines;
}
