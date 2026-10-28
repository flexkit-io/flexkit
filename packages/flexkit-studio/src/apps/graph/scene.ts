import { MAX_NODES, type GraphCounts, type GraphData, type GraphEdge, type GraphNode } from './graph';

/**
 * The scene is what the canvas draws: the nodes and edges loaded so far,
 * which entities are switched off, which nodes are pinned, the selection.
 * A pure reducer so every rule is unit-tested; the canvas syncs to it.
 */

export interface SceneState {
  nodes: { [key: string]: GraphNode };
  edges: { [key: string]: GraphEdge };
  /** Total related records per relationship of a node, when the API told us. */
  counts: GraphCounts;
  /** Related records fetched so far per relationship of a node: the next page's offset. */
  fetched: GraphCounts;
  hiddenEntities: string[];
  pinned: { [key: string]: true };
  selected: string | null;
  /** A message for the status line, such as the node cap being reached. */
  notice: string | null;
  /** Bumped whenever nodes or edges change, so the canvas knows to sync. */
  version: number;
}

export type SceneAction =
  | { type: 'merge'; data: GraphData; fetched?: GraphCounts }
  | { type: 'remove'; keys: string[] }
  | { type: 'keepOnly'; keys: string[] }
  | { type: 'clear' }
  | { type: 'toggleEntity'; entity: string }
  | { type: 'select'; key: string | null }
  | { type: 'togglePin'; key: string }
  | { type: 'notice'; message: string | null };

export const EMPTY_SCENE: SceneState = {
  nodes: {},
  edges: {},
  counts: {},
  fetched: {},
  hiddenEntities: [],
  pinned: {},
  selected: null,
  notice: null,
  version: 0,
};

function mergeCounts(current: GraphCounts, incoming: GraphCounts | undefined): GraphCounts {
  if (!incoming) {
    return current;
  }

  const next = { ...current };
  Object.entries(incoming).forEach(([key, perAttribute]) => {
    next[key] = { ...next[key], ...perAttribute };
  });

  return next;
}

/** Fetched offsets only move forward: a fresh first page never rewinds paging. */
function mergeFetched(current: GraphCounts, incoming: GraphCounts | undefined): GraphCounts {
  if (!incoming) {
    return current;
  }

  const next = { ...current };
  Object.entries(incoming).forEach(([key, perAttribute]) => {
    const merged = { ...next[key] };
    Object.entries(perAttribute).forEach(([attribute, offset]) => {
      merged[attribute] = Math.max(merged[attribute] ?? 0, offset);
    });
    next[key] = merged;
  });

  return next;
}

function withoutNodes(state: SceneState, dropped: Set<string>): SceneState {
  const nodes = Object.fromEntries(Object.entries(state.nodes).filter(([key]) => !dropped.has(key)));
  const edges = Object.fromEntries(
    Object.entries(state.edges).filter(([, edge]) => !dropped.has(edge.source) && !dropped.has(edge.target))
  );
  const pinned = Object.fromEntries(Object.entries(state.pinned).filter(([key]) => !dropped.has(key)));

  return {
    ...state,
    nodes,
    edges,
    pinned,
    selected: state.selected && dropped.has(state.selected) ? null : state.selected,
    version: state.version + 1,
  };
}

export function sceneReducer(state: SceneState, action: SceneAction): SceneState {
  switch (action.type) {
    case 'merge': {
      const nodes = { ...state.nodes };
      let count = Object.keys(nodes).length;
      let dropped = 0;

      action.data.nodes.forEach((node) => {
        const existing = nodes[node.key];

        if (existing) {
          // A node first drawn with only its id takes the caption a later load brings.
          if (existing.label === existing.id && node.label !== node.id) {
            nodes[node.key] = { ...existing, label: node.label };
          }

          return;
        }

        if (count >= MAX_NODES) {
          dropped += 1;

          return;
        }

        nodes[node.key] = node;
        count += 1;
      });

      const edges = { ...state.edges };
      action.data.edges.forEach((edge) => {
        if (nodes[edge.source] && nodes[edge.target]) {
          edges[edge.key] = edge;
        }
      });

      return {
        ...state,
        nodes,
        edges,
        counts: mergeCounts(state.counts, action.data.counts),
        fetched: mergeFetched(state.fetched, action.fetched),
        notice:
          dropped > 0
            ? `The canvas holds ${MAX_NODES.toLocaleString()} nodes at most; ${dropped.toLocaleString()} were left out. Hide some nodes to make room.`
            : state.notice,
        version: state.version + 1,
      };
    }
    case 'remove':
      return withoutNodes(state, new Set(action.keys));
    case 'keepOnly': {
      const kept = new Set(action.keys);

      return withoutNodes(state, new Set(Object.keys(state.nodes).filter((key) => !kept.has(key))));
    }
    case 'clear':
      return { ...EMPTY_SCENE, hiddenEntities: state.hiddenEntities, version: state.version + 1 };
    case 'toggleEntity':
      return {
        ...state,
        hiddenEntities: state.hiddenEntities.includes(action.entity)
          ? state.hiddenEntities.filter((entity) => entity !== action.entity)
          : [...state.hiddenEntities, action.entity],
      };
    case 'select':
      return state.selected === action.key ? state : { ...state, selected: action.key };
    case 'togglePin': {
      const pinned = { ...state.pinned };

      if (pinned[action.key]) {
        delete pinned[action.key];
      } else {
        pinned[action.key] = true;
      }

      return { ...state, pinned };
    }
    case 'notice':
      return { ...state, notice: action.message };
    default:
      return state;
  }
}

/** Nodes on the canvas per entity, for the legend. */
export function countNodesByEntity(state: SceneState): { [entity: string]: number } {
  return Object.values(state.nodes).reduce<{ [entity: string]: number }>((result, node) => {
    result[node.entity] = (result[node.entity] ?? 0) + 1;

    return result;
  }, {});
}

/** Related nodes of one node per relationship attribute that are on the canvas. */
export function countEdgesByAttribute(state: SceneState, key: string): { [attribute: string]: number } {
  return Object.values(state.edges).reduce<{ [attribute: string]: number }>((result, edge) => {
    if (edge.source === key) {
      result[edge.sourceAttribute] = (result[edge.sourceAttribute] ?? 0) + 1;
    } else if (edge.target === key) {
      result[edge.targetAttribute] = (result[edge.targetAttribute] ?? 0) + 1;
    }

    return result;
  }, {});
}

/** Keys of the nodes joined to one node by an edge. */
export function neighbourKeys(state: SceneState, key: string): string[] {
  return Object.values(state.edges).flatMap((edge) => {
    if (edge.source === key) {
      return [edge.target];
    }

    if (edge.target === key) {
      return [edge.source];
    }

    return [];
  });
}
