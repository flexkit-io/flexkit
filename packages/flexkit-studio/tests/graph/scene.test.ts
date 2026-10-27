import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAX_NODES, type GraphData, type GraphEdge, type GraphNode } from '../../src/apps/graph/graph';
import {
  countEdgesByAttribute,
  countNodesByEntity,
  EMPTY_SCENE,
  neighbourKeys,
  sceneReducer,
  type SceneState,
} from '../../src/apps/graph/scene';

function node(entity: string, id: string): GraphNode {
  return { key: `${entity}:${id}`, entity, id, label: id };
}

function edge(source: GraphNode, target: GraphNode, sourceAttribute: string, targetAttribute: string): GraphEdge {
  return { key: `${source.key}|${target.key}|${sourceAttribute}`, source: source.key, target: target.key, sourceAttribute, targetAttribute };
}

const p1 = node('product', 'p1');
const p2 = node('product', 'p2');
const b1 = node('brand', 'b1');
const data: GraphData = {
  nodes: [p1, p2, b1],
  edges: [edge(p1, b1, 'brand', 'products'), edge(p2, b1, 'brand', 'products')],
  counts: { 'product:p1': { brand: 1 } },
};

function merged(): SceneState {
  return sceneReducer(EMPTY_SCENE, { type: 'merge', data, fetched: { 'product:p1': { brand: 1 } } });
}

describe('merge', () => {
  it('adds nodes, edges, counts and fetched offsets and bumps the version', () => {
    const state = merged();

    assert.deepEqual(Object.keys(state.nodes), ['product:p1', 'product:p2', 'brand:b1']);
    assert.equal(Object.keys(state.edges).length, 2);
    assert.deepEqual(state.counts, { 'product:p1': { brand: 1 } });
    assert.deepEqual(state.fetched, { 'product:p1': { brand: 1 } });
    assert.equal(state.version, 1);
    assert.equal(state.notice, null);
  });

  it('keeps existing nodes and merges new counts per attribute', () => {
    const state = sceneReducer(merged(), {
      type: 'merge',
      data: { nodes: [{ ...p1, label: 'renamed' }], edges: [], counts: { 'product:p1': { tags: 4 } } },
    });

    assert.equal(state.nodes['product:p1']?.label, 'p1');
    assert.deepEqual(state.counts['product:p1'], { brand: 1, tags: 4 });
  });

  it('never rewinds a fetched offset', () => {
    const paged = sceneReducer(merged(), { type: 'merge', data: { nodes: [], edges: [], counts: {} }, fetched: { 'product:p1': { brand: 75 } } });
    const state = sceneReducer(paged, { type: 'merge', data: { nodes: [], edges: [], counts: {} }, fetched: { 'product:p1': { brand: 25, tags: 3 } } });

    assert.deepEqual(state.fetched['product:p1'], { brand: 75, tags: 3 });
  });

  it('drops nodes beyond the cap, their edges with them, and says so', () => {
    const many: GraphData = {
      nodes: Array.from({ length: MAX_NODES + 5 }, (_, index) => node('product', `n${index}`)),
      edges: [edge(node('product', 'n0'), node('product', `n${MAX_NODES + 1}`), 'related', 'related')],
      counts: {},
    };
    const state = sceneReducer(EMPTY_SCENE, { type: 'merge', data: many });

    assert.equal(Object.keys(state.nodes).length, MAX_NODES);
    assert.equal(Object.keys(state.edges).length, 0);
    assert.match(state.notice ?? '', /5 were left out/);
  });
});

describe('remove and keepOnly', () => {
  it('removes nodes with their edges, pins and selection', () => {
    const selected = sceneReducer(sceneReducer(merged(), { type: 'select', key: 'brand:b1' }), {
      type: 'togglePin',
      key: 'brand:b1',
    });
    const state = sceneReducer(selected, { type: 'remove', keys: ['brand:b1'] });

    assert.deepEqual(Object.keys(state.nodes), ['product:p1', 'product:p2']);
    assert.equal(Object.keys(state.edges).length, 0);
    assert.equal(state.selected, null);
    assert.deepEqual(state.pinned, {});
  });

  it('keeps only the given nodes', () => {
    const state = sceneReducer(merged(), { type: 'keepOnly', keys: ['product:p1', 'brand:b1'] });

    assert.deepEqual(Object.keys(state.nodes), ['product:p1', 'brand:b1']);
    assert.deepEqual(Object.keys(state.edges), ['product:p1|brand:b1|brand']);
  });

  it('clear empties everything but the entity switches', () => {
    const state = sceneReducer(sceneReducer(merged(), { type: 'toggleEntity', entity: 'brand' }), { type: 'clear' });

    assert.deepEqual(state.nodes, {});
    assert.deepEqual(state.hiddenEntities, ['brand']);
    assert.equal(state.version, 2);
  });
});

describe('switches', () => {
  it('toggles entities, pins and the selection', () => {
    let state = sceneReducer(merged(), { type: 'toggleEntity', entity: 'brand' });
    assert.deepEqual(state.hiddenEntities, ['brand']);
    state = sceneReducer(state, { type: 'toggleEntity', entity: 'brand' });
    assert.deepEqual(state.hiddenEntities, []);
    state = sceneReducer(state, { type: 'togglePin', key: 'product:p1' });
    assert.deepEqual(state.pinned, { 'product:p1': true });
    state = sceneReducer(state, { type: 'togglePin', key: 'product:p1' });
    assert.deepEqual(state.pinned, {});
    state = sceneReducer(state, { type: 'select', key: 'product:p1' });
    assert.equal(state.selected, 'product:p1');
    assert.equal(sceneReducer(state, { type: 'select', key: 'product:p1' }), state);
  });
});

describe('derived counts', () => {
  it('counts nodes per entity and related nodes per attribute', () => {
    const state = merged();

    assert.deepEqual(countNodesByEntity(state), { product: 2, brand: 1 });
    assert.deepEqual(countEdgesByAttribute(state, 'brand:b1'), { products: 2 });
    assert.deepEqual(countEdgesByAttribute(state, 'product:p1'), { brand: 1 });
    assert.deepEqual(neighbourKeys(state, 'brand:b1'), ['product:p1', 'product:p2']);
  });
});
