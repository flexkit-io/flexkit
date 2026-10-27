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

/**
 * Whether the layout has settled: the mean move per node since the last
 * sample is a small fraction of the graph's extent (its bounding box
 * diagonal), with a floor so a tiny graph settles too.
 */
export function isSettled(meanDisplacement: number, diagonal: number): boolean {
  return meanDisplacement < Math.max(0.05, diagonal * 0.0015);
}
