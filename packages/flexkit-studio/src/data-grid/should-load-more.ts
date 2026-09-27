/** Fill short viewports immediately; prefetch ahead only once the user scrolls. */
export function shouldLoadMore({
  scrollHeight,
  scrollTop,
  clientHeight,
}: {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
}): boolean {
  if (clientHeight <= 0) {
    return false;
  }

  // Applying the scrolling threshold at the top requests a second page on
  // mount even when the first page already fills the viewport.
  const threshold = scrollTop > 0 ? Math.max(600, clientHeight) : 1;

  return scrollHeight - scrollTop - clientHeight < threshold;
}
