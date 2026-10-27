'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX, MutableRefObject } from 'react';
import Graph from 'graphology';
import type { Attributes } from 'graphology-types';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import FA2LayoutSupervisor from 'graphology-layout-forceatlas2/worker';
import Sigma, { DEFAULT_STYLES } from 'sigma';
import { DENSE_NODES, isSettled, layoutBudget, ZOOMED_IN_RATIO } from './layout';
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
/** An edge of the hovered node. */
type EdgeState = { isNear: boolean };
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
/** Two quiet samples in a row end the layout. */
const SETTLE_QUIET_SAMPLES = 2;

function nodeSize(degree: number): number {
  return 5 + Math.min(10, Math.sqrt(degree) * 2);
}

function randomAround(x: number, y: number, radius: number): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2;
  const distance = radius * (0.5 + Math.random() * 0.5);

  return { x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance };
}

/** Node positions, the layout's movement is measured against. */
function snapshotPositions(graph: Graph<NodeAttributes, EdgeAttributes>): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  graph.forEachNode((key, attributes) => {
    positions.set(key, { x: attributes.x, y: attributes.y });
  });

  return positions;
}

/** Mean move per node since the snapshot, and the bounding-box diagonal now. */
function measureMovement(
  graph: Graph<NodeAttributes, EdgeAttributes>,
  previous: Map<string, { x: number; y: number }>
): { mean: number; diagonal: number } {
  let total = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  graph.forEachNode((key, attributes) => {
    const before = previous.get(key);

    if (before) {
      total += Math.hypot(attributes.x - before.x, attributes.y - before.y);
    }

    minX = Math.min(minX, attributes.x);
    minY = Math.min(minY, attributes.y);
    maxX = Math.max(maxX, attributes.x);
    maxY = Math.max(maxY, attributes.y);
  });

  return {
    mean: graph.order > 0 ? total / graph.order : 0,
    diagonal: graph.order > 0 ? Math.hypot(maxX - minX, maxY - minY) : 0,
  };
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
 * settles after every change. Selection, entity visibility and pins are
 * sigma states and node attributes; the scene stays the source of truth.
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
  // layout stops when the nodes stop moving, or at the budget.
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
      let previous = snapshotPositions(graph);
      let quietSamples = 0;
      layoutRef.current = layout;
      layoutDeadlineRef.current = startedAt + budgetMs;
      layout.start();
      callbacksRef.current.onLayoutChange(true);
      layoutTimerRef.current = window.setTimeout(stopLayout, budgetMs);
      settleTimerRef.current = window.setInterval(() => {
        const { mean, diagonal } = measureMovement(graph, previous);
        previous = snapshotPositions(graph);
        quietSamples = isSettled(mean, diagonal) ? quietSamples + 1 : 0;

        if (quietSamples >= SETTLE_QUIET_SAMPLES && performance.now() - startedAt >= SETTLE_MIN_MS) {
          stopLayout();
        }
      }, SETTLE_INTERVAL_MS);
    },
    [stopLayout]
  );

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
        customEdgeState: { isNear: false },
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
              // Dense graphs label only the pointer's surroundings and the selection until zoomed in.
              labelVisibility: (_attributes, state, graphState) => {
                if (state.isHovered || state.isHighlighted || state.isNeighbour) {
                  return 'visible';
                }

                return graphState.isDense && !graphState.isZoomedIn ? 'hidden' : 'auto';
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
              opacity: (_attributes, state, graphState) => (graphState.hasHovered && !state.isNear ? 0.15 : 1),
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
    renderer.on('enterNode', ({ node }) => {
      if (!graph.hasNode(node)) {
        return;
      }

      renderer.setNodesState(graph.neighbors(node), { isNeighbour: true });
      renderer.setEdgesState(graph.edges(node), { isNear: true });
      renderer.refresh({ skipIndexation: true });
    });
    renderer.on('leaveNode', ({ node }) => {
      if (!graph.hasNode(node)) {
        return;
      }

      renderer.setNodesState(graph.neighbors(node), { isNeighbour: false });
      renderer.setEdgesState(graph.edges(node), { isNear: false });
      renderer.refresh({ skipIndexation: true });
    });
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
      renderer.kill();
    };
  }, [theme, mountAttempt, apiRef, stopLayout]);

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
      });
    });
    renderer.refresh({ skipIndexation: true });
  }, [scene.hiddenEntities, scene.selected, scene.pinned, scene.version, mountAttempt, theme, startLayout]);

  // Unmount: stop the worker.
  useEffect(() => stopLayout, [stopLayout]);

  return <div className="fk:h-full fk:w-full fk:min-h-0" ref={containerRef} />;
}
