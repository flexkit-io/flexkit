/**
 * Pure layout rules of the canvas: how long the force layout may run, when
 * it counts as settled, and when a graph is too dense for labels everywhere.
 */

/** Above this many nodes, labels show only around the pointer and the selection unless zoomed in. */
export const DENSE_NODES = 300;

/** Camera ratio below which a dense graph shows labels again (1 = the whole graph in view). */
export const ZOOMED_IN_RATIO = 0.45;

/** The longest the force layout runs after a change: 2 s for a few nodes, 20 s at the cap. */
export function layoutBudget(order: number): number {
  return Math.min(20000, 2000 + order * 9);
}

/** How much the free nodes moved since the last sample, and the graph's extent. */
export interface LayoutMovement {
  /** Mean move of the nodes the layout may move. */
  mean: number;
  /** Largest move of any of them: a few new nodes still flying in keep the layout going. */
  max: number;
  /** Bounding-box diagonal of the whole graph. */
  diagonal: number;
}

/**
 * Whether the layout has settled: the mean move per free node is a sliver
 * of the graph's extent and no node is still travelling, with a floor so a
 * tiny graph settles too.
 */
export function isSettled({ mean, max, diagonal }: LayoutMovement): boolean {
  const threshold = Math.max(0.05, diagonal * 0.0015);

  return mean < threshold && max < threshold * 20;
}
