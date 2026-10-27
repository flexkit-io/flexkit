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

function randomAround(x: number, y: number, radius: number): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2;
  const distance = radius * (0.5 + Math.random() * 0.5);

  return { x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance };
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
 * and places new nodes next to a neighbour already on the canvas.
 */
function syncGraph(
  graph: Graph<NodeAttributes, EdgeAttributes>,
  scene: SceneState,
  colors: { [entity: string]: string }
): boolean {
  let changed = false;
  const added: string[] = [];

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

  added.forEach((key) => {
    const anchor = graph.neighbors(key).find((neighbour) => !Number.isNaN(graph.getNodeAttribute(neighbour, 'x')));
    const position = anchor
      ? randomAround(graph.getNodeAttribute(anchor, 'x'), graph.getNodeAttribute(anchor, 'y'), PLACEMENT_RADIUS)
      : randomAround(0, 0, PLACEMENT_RADIUS * 2);
    graph.mergeNodeAttributes(key, position);
  });

  if (changed) {
    graph.forEachNode((key) => {
      graph.setNodeAttribute(key, 'size', nodeSize(graph.degree(key)));
    });
  }

  return changed;
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
  const settleTimerRef = useRef<number | null>(null);
  const layoutDeadlineRef = useRef<number | null>(null);
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
  }, []);

  // The worker reads `fixed` only when it (re)builds its matrices, so a new
  // supervisor is needed whenever pins change while a layout runs. The
  // layout stops once the nodes stop moving, or at the budget.
  const startLayout = useCallback(
    (budgetMs: number): void => {
      const graph = graphRef.current;
      stopLayout();

      if (!graph || graph.order === 0) {
        return;
      }

      const layout = new FA2LayoutSupervisor(graph, {
        settings: { ...forceAtlas2.inferSettings(graph), adjustSizes: true, gravity: 1 },
      });
      const startedAt = performance.now();
      const tracker = new PositionTracker(graph);
      let hasMoved = false;
      let quietSamples = 0;
      layoutRef.current = layout;
      layoutDeadlineRef.current = startedAt + budgetMs;
      layout.start();
      callbacksRef.current.onLayoutChange(true);
      layoutTimerRef.current = window.setTimeout(stopLayout, budgetMs);
      settleTimerRef.current = window.setInterval(() => {
        const movement = tracker.measure();
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
    renderer.on('nodeDragStart', ({ node }) => {
      // A running layout would pull the node away from the pointer.
      stopLayout();
      graph.setNodeAttribute(node, 'fixed', true);
    });
    renderer.on('nodeDragEnd', ({ node }) => {
      callbacksRef.current.onPin(node);
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
  }, [theme, mountAttempt, apiRef, stopLayout, applyHover]);

  // Scene changes: sync the graph, then let the layout settle the new nodes.
  useEffect(() => {
    const graph = graphRef.current;

    if (!graph) {
      return;
    }

    const changed = syncGraph(graph, scene, colors);

    if (!changed) {
      return;
    }

    rendererRef.current?.setGraphState({ isDense: graph.order > DENSE_NODES });
    // Nodes added under the pointer get their hover marks; marks of dropped nodes go.
    applyHover(graph.hasNode(hoverRef.current.key ?? '') ? hoverRef.current.key : null);
    startLayout(layoutBudget(graph.order));
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
      const fixed = scene.pinned[key] === true;

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
