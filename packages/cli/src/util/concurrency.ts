/**
 * Runs the worker over every item with a fixed concurrency limit, preserving
 * input order in the results. Errors are captured per item instead of
 * aborting the whole batch.
 */
export async function runWithConcurrency<TItem, TResult>(
  items: TItem[],
  limit: number,
  worker: (item: TItem, index: number) => Promise<TResult>
): Promise<{ item: TItem; result?: TResult; error?: Error }[]> {
  const results: { item: TItem; result?: TResult; error?: Error }[] = new Array(items.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];

      try {
        results[index] = { item, result: await worker(item, index) };
      } catch (error) {
        results[index] = { item, error: error instanceof Error ? error : new Error(String(error)) };
      }
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));

  await Promise.all(Array.from({ length: workerCount }, () => runNext()));

  return results;
}
