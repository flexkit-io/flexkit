'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX, MutableRefObject } from 'react';
import Graph from 'graphology';
import type { Attributes } from 'graphology-types';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import FA2LayoutSupervisor from 'graphology-layout-forceatlas2/worker';
import Sigma, { DEFAULT_STYLES } from 'sigma';
import { DENSE_NODES, isSettled, layoutBudget, ZOOMED_IN_RATIO, type LayoutMovement } from './layout';
import type { SceneState } from './scene';

type NodeAttributes = {
  entity: string;
  label: string;
  color: string;
  size: number;
  x: number;
  y: number;
  fixed?: boolean;
};
type EdgeAttributes = { size: number };
/** A neighbour of the hovered node. */
type NodeState = { isNeighbour: boolean };
/** An edge of the hovered node; an edge of the selected node. */
type EdgeState = { isNear: boolean; isSelected: boolean };
/** Too many nodes for labels everywhere; zoomed in far enough to show them anyway. */
type GraphState = { isDense: boolean; isZoomedIn: boolean };
type Renderer = Sigma<NodeAttributes, EdgeAttributes, Attributes, NodeState, EdgeState, GraphState>;

export interface GraphCanvasApi {
  /** Brings the whole graph into view. */
  fit: () => void;
}

export interface GraphCanvasProps {
  scene: SceneState;
  colors: { [entity: string]: string };
  theme: 'light' | 'dark';
  apiRef: MutableRefObject<GraphCanvasApi | null>;
  onSelect: (key: string | null) => void;
  onContextMenu: (key: string, position: { x: number; y: number }) => void;
  onExpand: (key: string) => void;
  onPin: (key: string) => void;
  onLayoutChange: (running: boolean) => void;
}

/** Spread of new nodes around the node they came from, in graph units. */
const PLACEMENT_RADIUS = 40;
/** How often the layout is checked for movement. */
const SETTLE_INTERVAL_MS = 400;
/** The layout runs at least this long before it may be called settled. */
const SETTLE_MIN_MS = 1200;
/** Two quiet samples in a row, after the worker first moved something, end the layout. */
const SETTLE_QUIET_SAMPLES = 2;

function nodeSize(degree: number): number {
  return 5 + Math.min(10, Math.sqrt(degree) * 2);
}

type Point = { x: number; y: number };

/** The ring new nodes start on: wider the more of them share an anchor, so they do not explode apart. */
function ringRadius(count: number): number {
  return PLACEMENT_RADIUS * (0.8 + Math.sqrt(count) * 0.6);
}

/** Evenly spaced positions on a ring, with a little jitter so no two coincide. */
function ringPositions(center: Point, count: number, radius: number): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + Math.random() * 0.3;
    const distance = radius * (0.9 + Math.random() * 0.2);

    return { x: center.x + Math.cos(angle) * distance, y: center.y + Math.sin(angle) * distance };
  });
}

function isPositioned(graph: Graph<NodeAttributes, EdgeAttributes>, key: string): boolean {
  return !Number.isNaN(graph.getNodeAttribute(key, 'x'));
}

/** Centre and reach of the nodes already placed, to put unanchored newcomers beyond them. */
function placedExtent(
  graph: Graph<NodeAttributes, EdgeAttributes>,
  placed: string[]
): { center: Point; reach: number } {
  if (placed.length === 0) {
    return { center: { x: 0, y: 0 }, reach: 0 };
  }

  const center = placed.reduce(
    (sum, key) => ({ x: sum.x + graph.getNodeAttribute(key, 'x'), y: sum.y + graph.getNodeAttribute(key, 'y') }),
    { x: 0, y: 0 }
  );
  center.x /= placed.length;
  center.y /= placed.length;
  const reach = placed.reduce(
    (max, key) =>
      Math.max(
        max,
        Math.hypot(graph.getNodeAttribute(key, 'x') - center.x, graph.getNodeAttribute(key, 'y') - center.y)
      ),
    0
  );

  return { center, reach };
}

/**
 * Places new nodes: those sharing an anchor already on the canvas go on a
 * ring around it, the rest on a ring beyond everything placed so far.
 */
function placeNewNodes(graph: Graph<NodeAttributes, EdgeAttributes>, added: string[]): void {
  const placed = graph.nodes().filter((key) => !added.includes(key) && isPositioned(graph, key));
  const groups = new Map<string | null, string[]>();
  added.forEach((key) => {
    const anchor =
      graph.neighbors(key).find((neighbour) => !added.includes(neighbour) && isPositioned(graph, neighbour)) ?? null;
    groups.set(anchor, [...(groups.get(anchor) ?? []), key]);
  });
  groups.forEach((keys, anchor) => {
    const center = anchor ? { x: graph.getNodeAttribute(anchor, 'x'), y: graph.getNodeAttribute(anchor, 'y') } : null;
    const positions = center
      ? ringPositions(center, keys.length, ringRadius(keys.length))
      : (() => {
          const extent = placedExtent(graph, placed);

          return ringPositions(extent.center, keys.length, extent.reach + ringRadius(keys.length));
        })();
    positions.forEach((position, index) => graph.mergeNodeAttributes(keys[index]!, position));
  });
}

/**
 * Positions of every node, kept in one typed array the layout's movement is
 * measured against: one pass per sample, no allocation.
 */
class PositionTracker {
  private positions: Float64Array;

  constructor(private readonly graph: Graph<NodeAttributes, EdgeAttributes>) {
    this.positions = new Float64Array(graph.order * 2);
    this.graph.forEachNode((_key, attributes) => {
      this.positions[this.cursor] = attributes.x;
      this.positions[this.cursor + 1] = attributes.y;
      this.cursor += 2;
    });
  }

  private cursor = 0;

  /** Movement since the last call, then remembers the current positions. */
  measure(): LayoutMovement {
    const { graph, positions } = this;
    let total = 0;
    let max = 0;
    let free = 0;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let index = 0;
    graph.forEachNode((_key, attributes) => {
      const { x, y } = attributes;

      if (index + 1 < positions.length && !attributes.fixed) {
        const moved = Math.hypot(x - positions[index]!, y - positions[index + 1]!);
        total += moved;
        max = Math.max(max, moved);
        free += 1;
      }

      positions[index] = x;
      positions[index + 1] = y;
      index += 2;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    return {
      mean: free > 0 ? total / free : 0,
      max,
      diagonal: graph.order > 0 ? Math.hypot(maxX - minX, maxY - minY) : 0,
    };
  }
}

/**
 * Adds the scene's new nodes and edges to the graph, drops the removed ones
 * and places new nodes around what is already on the canvas. Reports what
 * was added and whether anything was placed before.
 */
function syncGraph(
  graph: Graph<NodeAttributes, EdgeAttributes>,
  scene: SceneState,
  colors: { [entity: string]: string }
): { changed: boolean; added: string[]; hadNodes: boolean } {
  let changed = false;
  const added: string[] = [];
  const hadNodes = graph.order > 0;

  graph.forEachNode((key) => {
    if (!scene.nodes[key]) {
      graph.dropNode(key);
      changed = true;
    }
  });
  Object.values(scene.nodes).forEach((node) => {
    if (graph.hasNode(node.key)) {
      return;
    }

    graph.addNode(node.key, {
      entity: node.entity,
      label: node.label,
      color: colors[node.entity] ?? '#71717a',
      size: 5,
      x: Number.NaN,
      y: Number.NaN,
    });
    added.push(node.key);
    changed = true;
  });
  graph.forEachEdge((key) => {
    if (!scene.edges[key]) {
      graph.dropEdge(key);
      changed = true;
    }
  });
  // A multigraph: two relationships between the same records are two edges.
  Object.values(scene.edges).forEach((edge) => {
    if (!graph.hasEdge(edge.key)) {
      graph.addEdgeWithKey(edge.key, edge.source, edge.target, { size: 1 });
      changed = true;
    }
  });

  placeNewNodes(graph, added);

  if (changed) {
    graph.forEachNode((key) => {
      graph.setNodeAttribute(key, 'size', nodeSize(graph.degree(key)));
    });
  }

  return { changed, added, hadNodes };
}

/**
 * The WebGL canvas: a graphology graph that lives as long as the component,
 * rendered by sigma and laid out by ForceAtlas2 in a web worker until it
 * settles after every change. Selection, hover, entity visibility and pins
 * are sigma states and node attributes; the scene stays the source of truth.
 */
export function GraphCanvas({
  scene,
  colors,
  theme,
  apiRef,
  onSelect,
  onContextMenu,
  onExpand,
  onPin,
  onLayoutChange,
}: GraphCanvasProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph<NodeAttributes, EdgeAttributes> | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const layoutRef = useRef<FA2LayoutSupervisor | null>(null);
  const layoutTimerRef = useRef<number | null>(null);
  /** The node under the pointer while one is dragged, with the pointer's graph position. */
  const dragRef = useRef<{ node: string; x: number; y: number } | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const layoutDeadlineRef = useRef<number | null>(null);
  /** Nodes held still for the running layout so only newcomers move. */
  const heldRef = useRef<Set<string>>(new Set());
  const pinnedRef = useRef<SceneState['pinned']>(scene.pinned);
  pinnedRef.current = scene.pinned;
  /** The hovered node and the nodes and edges marked around it. */
  const hoverRef = useRef<{ key: string | null; nodes: string[]; edges: string[] }>({
    key: null,
    nodes: [],
    edges: [],
  });
  const callbacksRef = useRef({ onSelect, onContextMenu, onExpand, onPin, onLayoutChange });
  const [mountAttempt, setMountAttempt] = useState(0);
  callbacksRef.current = { onSelect, onContextMenu, onExpand, onPin, onLayoutChange };

  if (!graphRef.current) {
    graphRef.current = new Graph<NodeAttributes, EdgeAttributes>({ type: 'undirected', multi: true });
  }

  const stopLayout = useCallback((): void => {
    if (layoutTimerRef.current !== null) {
      window.clearTimeout(layoutTimerRef.current);
      layoutTimerRef.current = null;
    }

    if (settleTimerRef.current !== null) {
      window.clearInterval(settleTimerRef.current);
      settleTimerRef.current = null;
    }

    if (layoutRef.current) {
      layoutRef.current.kill();
      layoutRef.current = null;
      layoutDeadlineRef.current = null;
      callbacksRef.current.onLayoutChange(false);
    }

    const graph = graphRef.current;
    heldRef.current.forEach((key) => {
      if (graph?.hasNode(key)) {
        graph.setNodeAttribute(key, 'fixed', pinnedRef.current[key] === true);
      }
    });
    heldRef.current = new Set();
  }, []);

  // The worker reads `fixed` only when it (re)builds its matrices, so a new
  // supervisor is needed whenever pins change while a layout runs. The
  // layout stops once the nodes stop moving, or at the budget. Nodes in
  // `hold` stay where they are, so adding to a settled canvas moves only
  // the newcomers instead of shaking everything.
  const startLayout = useCallback(
    (budgetMs: number, hold: string[] = []): void => {
      const graph = graphRef.current;
      stopLayout();

      if (!graph || graph.order === 0) {
        return;
      }

      heldRef.current = new Set(hold.filter((key) => graph.hasNode(key)));
      heldRef.current.forEach((key) => graph.setNodeAttribute(key, 'fixed', true));

      // Nothing free to move (say, a dragged node without neighbours): a run would never settle.
      if (!graph.someNode((_key, attributes) => !attributes.fixed)) {
        stopLayout();

        return;
      }

      const inferred = forceAtlas2.inferSettings(graph);
      const layout = new FA2LayoutSupervisor(graph, {
        // Gentle gravity keeps loose parts near the rest; the extra slowdown keeps the motion calm.
        settings: { ...inferred, adjustSizes: true, gravity: 0.2, slowDown: (inferred.slowDown ?? 1) * 2 },
        // A dragged node stays under the pointer: the worker's positions are
        // overridden for it, and with a reducer set the supervisor reads the
        // graph's positions back into the worker, so the neighbours follow.
        outputReducer: (key: string, attributes: NodeAttributes): NodeAttributes => {
          const drag = dragRef.current;

          if (drag && drag.node === key) {
            attributes.x = drag.x;
            attributes.y = drag.y;
          }

          return attributes;
        },
      });
      const startedAt = performance.now();
      const tracker = new PositionTracker(graph);
      let hasMoved = false;
      let quietSamples = 0;
      layoutRef.current = layout;
      layoutDeadlineRef.current = startedAt + budgetMs;
      layout.start();
      callbacksRef.current.onLayoutChange(true);
      // While a node is dragged the layout runs on: the budget is extended and settling does not stop it.
      const onBudget = (): void => {
        if (dragRef.current) {
          layoutDeadlineRef.current = performance.now() + budgetMs;
          layoutTimerRef.current = window.setTimeout(onBudget, budgetMs);
        } else {
          stopLayout();
        }
      };
      layoutTimerRef.current = window.setTimeout(onBudget, budgetMs);
      settleTimerRef.current = window.setInterval(() => {
        const movement = tracker.measure();

        if (dragRef.current) {
          quietSamples = 0;

          return;
        }

        // The worker needs a moment to spawn; quiet samples before its first
        // positions arrive say nothing about the layout.
        hasMoved = hasMoved || movement.max > 0;
        quietSamples = hasMoved && isSettled(movement) ? quietSamples + 1 : 0;

        if (quietSamples >= SETTLE_QUIET_SAMPLES && performance.now() - startedAt >= SETTLE_MIN_MS) {
          stopLayout();
        }
      }, SETTLE_INTERVAL_MS);
    },
    [stopLayout]
  );

  /**
   * Marks the hovered node's neighbours and edges, clearing the previous
   * marks first. Re-run after the graph changes so nodes added under the
   * pointer are marked too, and marks of dropped nodes go away.
   */
  const applyHover = useCallback((key: string | null): void => {
    const graph = graphRef.current;
    const renderer = rendererRef.current;

    if (!graph || !renderer) {
      return;
    }

    const previous = hoverRef.current;
    renderer.setNodesState(
      previous.nodes.filter((node) => graph.hasNode(node)),
      { isNeighbour: false }
    );
    renderer.setEdgesState(
      previous.edges.filter((edge) => graph.hasEdge(edge)),
      { isNear: false }
    );

    if (key && graph.hasNode(key)) {
      const nodes = graph.neighbors(key);
      const edges = graph.edges(key);
      renderer.setNodesState(nodes, { isNeighbour: true });
      renderer.setEdgesState(edges, { isNear: true });
      hoverRef.current = { key, nodes, edges };
    } else {
      hoverRef.current = { key: null, nodes: [], edges: [] };
    }

    renderer.refresh({ skipIndexation: true });
  }, []);

  // The renderer: created per theme (styles are fixed at construction) over
  // the persistent graph.
  useEffect(() => {
    const container = containerRef.current;
    const graph = graphRef.current;

    if (!container || !graph) {
      return undefined;
    }

    // Sigma throws when the container has no size yet (first paint of a lazy
    // route, hidden app); wait for the box to get one before mounting.
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      const observer = new ResizeObserver(() => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          observer.disconnect();
          setMountAttempt((attempt) => attempt + 1);
        }
      });
      observer.observe(container);

      return () => observer.disconnect();
    }

    const isDark = theme === 'dark';
    const renderer: Renderer = new Sigma<NodeAttributes, EdgeAttributes, Attributes, NodeState, EdgeState, GraphState>(
      graph,
      container,
      {
        customNodeState: { isNeighbour: false },
        customEdgeState: { isNear: false, isSelected: false },
        customGraphState: { isDense: graph.order > DENSE_NODES, isZoomedIn: false },
        settings: {
          itemSizesReference: 'screen',
          enableNodeDrag: true,
          renderEdgeLabels: false,
          labelRenderedSizeThreshold: 7,
          labelDensity: 0.1,
          labelGridCellSize: 80,
        },
        styles: {
          nodes: [
            {
              ...DEFAULT_STYLES.nodes,
              size: {
                whenState: 'isHighlighted',
                then: (attributes: NodeAttributes) => attributes.size + 5,
                else: {
                  whenState: 'isHovered',
                  then: (attributes: NodeAttributes) => attributes.size + 2,
                  else: { attribute: 'size' },
                },
              },
              cursor: 'pointer',
              // Hovering a node fades everything but it, its neighbours and the selection.
              opacity: (_attributes, state, graphState) =>
                graphState.hasHovered && !state.isHovered && !state.isNeighbour && !state.isHighlighted ? 0.25 : 1,
              labelColor: isDark ? '#e4e4e7' : '#18181b',
              labelSize: 12,
              labelFont: 'ui-sans-serif, system-ui, sans-serif',
              // Dense graphs label only the pointer's surroundings and the
              // selection until zoomed in; a hub's many neighbours still go
              // through the label grid so they cannot pile up.
              labelVisibility: (_attributes, state, graphState) => {
                if (state.isHovered || state.isHighlighted) {
                  return 'visible';
                }

                const dense = graphState.isDense && !graphState.isZoomedIn;

                if (state.isNeighbour) {
                  return dense ? 'auto' : 'visible';
                }

                return dense ? 'hidden' : 'auto';
              },
              backdropColor: isDark ? '#27272a' : '#ffffff',
              backdropShadowColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.25)',
            },
          ],
          edges: [
            {
              ...DEFAULT_STYLES.edges,
              color: isDark ? '#3f3f46' : '#d4d4d8',
              size: 1,
              opacity: (_attributes, state, graphState) =>
                graphState.hasHovered && !state.isNear && !state.isSelected ? 0.15 : 1,
            },
          ],
        },
      }
    );
    rendererRef.current = renderer;

    renderer.on('clickNode', ({ node }) => {
      callbacksRef.current.onSelect(node);
    });
    renderer.on('clickStage', () => {
      callbacksRef.current.onSelect(null);
    });
    renderer.on('doubleClickNode', ({ node, event }) => {
      event.preventSigmaDefault();
      callbacksRef.current.onExpand(node);
    });
    renderer.on('rightClickNode', ({ node, event }) => {
      event.preventSigmaDefault();
      const original = event.original as MouseEvent;
      original.preventDefault();
      callbacksRef.current.onSelect(node);
      callbacksRef.current.onContextMenu(node, { x: original.clientX, y: original.clientY });
    });
    renderer.on('enterNode', ({ node }) => applyHover(node));
    renderer.on('leaveNode', () => applyHover(null));
    // Dragging a node pulls its neighbours along: the layout runs while the
    // drag lasts with the node held under the pointer, so a cluster can be
    // pulled apart. Everything else is held, so the rest of the canvas
    // stays still, and a canvas without relationships has nothing to pull on.
    const holdAllBut = (node: string): string[] => {
      const free = new Set([node, ...graph.neighbors(node)]);

      return graph.nodes().filter((key) => key === node || !free.has(key));
    };
    renderer.on('nodeDragStart', ({ node }) => {
      dragRef.current = { node, x: graph.getNodeAttribute(node, 'x'), y: graph.getNodeAttribute(node, 'y') };

      if (graph.size > 0) {
        startLayout(layoutBudget(graph.order), holdAllBut(node));
      } else {
        stopLayout();
        graph.setNodeAttribute(node, 'fixed', true);
      }
    });
    renderer.on('nodeDrag', ({ node }) => {
      if (dragRef.current?.node === node) {
        dragRef.current.x = graph.getNodeAttribute(node, 'x');
        dragRef.current.y = graph.getNodeAttribute(node, 'y');
      }
    });
    renderer.on('nodeDragEnd', ({ node }) => {
      const wasRunning = dragRef.current !== null && layoutRef.current !== null;
      dragRef.current = null;
      callbacksRef.current.onPin(node);

      // The node stays where it was dropped while its neighbours settle around it.
      if (wasRunning) {
        startLayout(layoutBudget(graph.order), holdAllBut(node));
      }
    });

    const camera = renderer.getCamera();
    const handleCameraUpdate = ({ ratio }: { ratio: number }): void => {
      const isZoomedIn = ratio < ZOOMED_IN_RATIO;

      if (renderer.getGraphState().isZoomedIn !== isZoomedIn) {
        renderer.setGraphState({ isZoomedIn });
        renderer.refresh({ skipIndexation: true });
      }
    };
    camera.on('updated', handleCameraUpdate);

    const preventContextMenu = (event: MouseEvent): void => event.preventDefault();
    container.addEventListener('contextmenu', preventContextMenu);

    apiRef.current = {
      fit: () => {
        void camera.reset({ duration: 300 });
      },
    };

    return () => {
      camera.off('updated', handleCameraUpdate);
      container.removeEventListener('contextmenu', preventContextMenu);
      apiRef.current = null;
      rendererRef.current = null;
      hoverRef.current = { key: null, nodes: [], edges: [] };
      renderer.kill();
    };
  }, [theme, mountAttempt, apiRef, startLayout, stopLayout, applyHover]);

  // Scene changes: sync the graph, then let the layout settle the new nodes.
  useEffect(() => {
    const graph = graphRef.current;

    if (!graph) {
      return;
    }

    const { changed, added, hadNodes } = syncGraph(graph, scene, colors);

    if (!changed) {
      return;
    }

    rendererRef.current?.setGraphState({ isDense: graph.order > DENSE_NODES });
    // Nodes added under the pointer get their hover marks; marks of dropped nodes go.
    applyHover(graph.hasNode(hoverRef.current.key ?? '') ? hoverRef.current.key : null);

    // Nothing to pull on: a bare sample stays on its ring.
    if (graph.size === 0) {
      stopLayout();

      return;
    }

    // Adding to a placed canvas: hold what is there, settle the newcomers.
    const hold = hadNodes && added.length > 0 ? graph.nodes().filter((key) => !added.includes(key)) : [];
    startLayout(layoutBudget(hold.length > 0 ? added.length : graph.order), hold);
    // Nodes and edges only change with the scene version; colours are applied by their own effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [scene.version]);

  // Theme change: recolour the nodes.
  useEffect(() => {
    const graph = graphRef.current;

    if (!graph) {
      return;
    }

    graph.forEachNode((key, attributes) => {
      graph.setNodeAttribute(key, 'color', colors[attributes.entity] ?? '#71717a');
    });
  }, [colors]);

  // Selection, switched-off entities and pins.
  useEffect(() => {
    const graph = graphRef.current;
    const renderer = rendererRef.current;

    if (!graph || !renderer) {
      return;
    }

    const hidden = new Set(scene.hiddenEntities);
    let pinsChanged = false;
    graph.forEachNode((key, attributes) => {
      renderer.setNodeState(key, { isHidden: hidden.has(attributes.entity), isHighlighted: key === scene.selected });
      const fixed = scene.pinned[key] === true || heldRef.current.has(key);

      if ((attributes.fixed ?? false) !== fixed) {
        graph.setNodeAttribute(key, 'fixed', fixed);
        pinsChanged = true;
      }
    });

    if (pinsChanged && layoutDeadlineRef.current !== null) {
      startLayout(Math.max(500, layoutDeadlineRef.current - performance.now()));
    }
    graph.forEachEdge((key, _attributes, source, target) => {
      renderer.setEdgeState(key, {
        isHidden:
          hidden.has(graph.getNodeAttribute(source, 'entity')) || hidden.has(graph.getNodeAttribute(target, 'entity')),
        isSelected: source === scene.selected || target === scene.selected,
      });
    });
    renderer.refresh({ skipIndexation: true });
  }, [scene.hiddenEntities, scene.selected, scene.pinned, scene.version, mountAttempt, theme, startLayout]);

  // Unmount: stop the worker.
  useEffect(() => stopLayout, [stopLayout]);

  return <div className="fk:h-full fk:w-full fk:min-h-0" ref={containerRef} />;
}
