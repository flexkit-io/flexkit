'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX, MutableRefObject } from 'react';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import FA2LayoutSupervisor from 'graphology-layout-forceatlas2/worker';
import Sigma, { DEFAULT_STYLES } from 'sigma';
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

function nodeSize(degree: number): number {
  return 5 + Math.min(10, Math.sqrt(degree) * 2);
}

/** How long the force layout runs after a change: short for small graphs, up to 8 s at the cap. */
export function layoutDuration(order: number): number {
  return Math.min(8000, 1500 + order * 3);
}

function randomAround(x: number, y: number, radius: number): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2;
  const distance = radius * (0.5 + Math.random() * 0.5);

  return { x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance };
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
 * rendered by sigma and laid out by ForceAtlas2 in a web worker after every
 * change. Selection, entity visibility and pins are sigma states and node
 * attributes; the scene stays the source of truth.
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
  const rendererRef = useRef<Sigma<NodeAttributes, EdgeAttributes> | null>(null);
  const layoutRef = useRef<FA2LayoutSupervisor | null>(null);
  const layoutTimerRef = useRef<number | null>(null);
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

    if (layoutRef.current) {
      layoutRef.current.kill();
      layoutRef.current = null;
      layoutDeadlineRef.current = null;
      callbacksRef.current.onLayoutChange(false);
    }
  }, []);

  // The worker reads `fixed` only when it (re)builds its matrices, so a new
  // supervisor is needed whenever pins change while a layout runs.
  const startLayout = useCallback(
    (durationMs: number): void => {
      const graph = graphRef.current;
      stopLayout();

      if (!graph || graph.order === 0) {
        return;
      }

      const layout = new FA2LayoutSupervisor(graph, {
        settings: { ...forceAtlas2.inferSettings(graph), adjustSizes: true, gravity: 1 },
      });
      layoutRef.current = layout;
      layoutDeadlineRef.current = performance.now() + durationMs;
      layout.start();
      callbacksRef.current.onLayoutChange(true);
      layoutTimerRef.current = window.setTimeout(stopLayout, durationMs);
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
    const renderer = new Sigma<NodeAttributes, EdgeAttributes>(graph, container, {
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
            labelColor: isDark ? '#e4e4e7' : '#18181b',
            labelSize: 12,
            labelFont: 'ui-sans-serif, system-ui, sans-serif',
            labelVisibility: {
              whenState: ['isHovered', 'isHighlighted'],
              then: 'visible',
              else: 'auto',
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
          },
        ],
      },
    });
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
    renderer.on('nodeDragStart', ({ node }) => {
      // A running layout would pull the node away from the pointer.
      stopLayout();
      graph.setNodeAttribute(node, 'fixed', true);
    });
    renderer.on('nodeDragEnd', ({ node }) => {
      callbacksRef.current.onPin(node);
    });

    const preventContextMenu = (event: MouseEvent): void => event.preventDefault();
    container.addEventListener('contextmenu', preventContextMenu);

    apiRef.current = {
      fit: () => {
        void renderer.getCamera().reset({ duration: 300 });
      },
    };

    return () => {
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

    startLayout(layoutDuration(graph.order));
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
  useEffect(
    () => () => {
      if (layoutTimerRef.current !== null) {
        window.clearTimeout(layoutTimerRef.current);
      }
      layoutRef.current?.kill();
    },
    []
  );

  return <div className="fk:h-full fk:w-full fk:min-h-0" ref={containerRef} />;
}
