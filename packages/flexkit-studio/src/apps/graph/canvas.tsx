'use client';

import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import Graph from 'graphology';
import circular from 'graphology-layout/circular';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import FA2LayoutSupervisor from 'graphology-layout-forceatlas2/worker';
import Sigma, { DEFAULT_STYLES } from 'sigma';
import type { GraphData, GraphNode } from './graph';

/** How long the force layout runs before the canvas settles. */
const LAYOUT_DURATION_MS = 3000;

export interface GraphCanvasStats {
  nodes: number;
  edges: number;
  /** Milliseconds from mount to the first frame. */
  firstFrameMs: number;
  /** Milliseconds the force layout worker ran. */
  layoutMs: number;
}

export interface GraphCanvasProps {
  data: GraphData;
  colors: { [entity: string]: string };
  theme: 'light' | 'dark';
  onSelect: (node: GraphNode | null) => void;
  onStats: (stats: GraphCanvasStats) => void;
}

type NodeAttributes = { entity: string; id: string; label: string; color: string; size: number; x: number; y: number };
type EdgeAttributes = { label: string; size: number };

function nodeSize(degree: number): number {
  return 5 + Math.min(10, Math.sqrt(degree) * 2);
}

/**
 * The WebGL canvas: a graphology graph rendered by sigma, laid out by
 * ForceAtlas2 in a web worker. Rebuilt whenever the data or theme changes;
 * the spike does not try to patch an existing graph.
 */
export function GraphCanvas({ data, colors, theme, onSelect, onStats }: GraphCanvasProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const onStatsRef = useRef(onStats);
  const [mountAttempt, setMountAttempt] = useState(0);
  onSelectRef.current = onSelect;
  onStatsRef.current = onStats;

  useEffect(() => {
    const container = containerRef.current;

    if (!container || data.nodes.length === 0) {
      return undefined;
    }

    // Sigma throws when the container has no size yet (first paint of a lazy
    // route, hidden tab); wait for the box to get one before mounting.
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

    const startedAt = performance.now();
    const graph = new Graph<NodeAttributes, EdgeAttributes>({ type: 'undirected', multi: false });
    const nodesByKey = new Map(data.nodes.map((node) => [node.key, node]));

    data.nodes.forEach((node) => {
      graph.addNode(node.key, {
        entity: node.entity,
        id: node.id,
        label: node.label,
        color: colors[node.entity] ?? '#71717a',
        size: 5,
        x: 0,
        y: 0,
      });
    });
    data.edges.forEach((edge) => {
      if (!graph.hasEdge(edge.source, edge.target)) {
        graph.addEdgeWithKey(edge.key, edge.source, edge.target, { label: edge.label, size: 1 });
      }
    });
    graph.forEachNode((key) => {
      graph.setNodeAttribute(key, 'size', nodeSize(graph.degree(key)));
    });
    circular.assign(graph, { scale: 100 });

    const isDark = theme === 'dark';
    const renderer = new Sigma(graph, container, {
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
              else: { whenState: 'isHovered', then: (attributes: NodeAttributes) => attributes.size + 2, else: { attribute: 'size' } },
            },
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

    // Spike only: lets the browser automation reach the renderer.
    Object.defineProperty(container, '__sigma', { value: renderer, configurable: true });

    let selected: string | null = null;

    renderer.on('clickNode', ({ node }) => {
      if (selected) {
        renderer.setNodeState(selected, { isHighlighted: false });
      }

      selected = node;
      renderer.setNodeState(node, { isHighlighted: true });
      renderer.refresh({ skipIndexation: true });
      onSelectRef.current(nodesByKey.get(node) ?? null);
    });
    renderer.on('clickStage', () => {
      if (selected) {
        renderer.setNodeState(selected, { isHighlighted: false });
        renderer.refresh({ skipIndexation: true });
      }

      selected = null;
      onSelectRef.current(null);
    });

    let firstFrameMs = 0;
    renderer.once('afterRender', () => {
      firstFrameMs = performance.now() - startedAt;
    });

    const layout = new FA2LayoutSupervisor(graph, {
      settings: { ...forceAtlas2.inferSettings(graph), adjustSizes: true, gravity: 1 },
    });
    const layoutStartedAt = performance.now();
    layout.start();

    const timer = window.setTimeout(() => {
      layout.stop();
      onStatsRef.current({
        nodes: graph.order,
        edges: graph.size,
        firstFrameMs: Math.round(firstFrameMs),
        layoutMs: Math.round(performance.now() - layoutStartedAt),
      });
    }, LAYOUT_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
      layout.kill();
      renderer.kill();
    };
  }, [data, colors, theme, mountAttempt]);

  return <div ref={containerRef} className="fk:h-full fk:w-full fk:min-h-0" />;
}
