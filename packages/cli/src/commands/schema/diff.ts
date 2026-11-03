/**
 * Pure schema comparison used by `flexkit schema diff` and
 * `flexkit deployments inspect --diff`. The severity rules mirror the deploy
 * route's diff plan (`buildSchemaDiffPlan` in the backend):
 *
 * - removing an entity or an attribute is `breaking`: deploy refuses it unless
 *   `--allow-breaking-changes` is passed;
 * - changing an attribute's `dataType` is `blocking`: deploy always refuses it;
 * - changing an attribute's `scope`, or removing a space, is a `warning` (the
 *   backend only treats a space removal as breaking while the space is in use).
 */

export interface DiffEntityInput {
  name: string;
  attributes: DiffAttributeInput[];
  [key: string]: unknown;
}

export interface DiffAttributeInput {
  name: string;
  dataType?: string;
  scope?: string;
  [key: string]: unknown;
}

/** One side of a comparison: a deployed snapshot or the local config of a project. */
export interface SchemaSnapshot {
  title?: string;
  menuGroups?: { name: string; [key: string]: unknown }[];
  scopes?: { name: string; [key: string]: unknown }[];
  spaces?: { code: string; [key: string]: unknown }[];
  schema: DiffEntityInput[];
}

export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

export type ChangeKind = 'added' | 'removed' | 'changed';

export interface AttributeDiff {
  kind: ChangeKind;
  name: string;
  /** For `added`/`removed`: the attribute itself. */
  attribute?: DiffAttributeInput;
  /** For `changed`: the fields that differ. */
  changes: FieldChange[];
}

export interface EntityDiff {
  kind: ChangeKind;
  name: string;
  /** For `added`/`removed`: the entity itself. */
  entity?: DiffEntityInput;
  /** Entity-level fields that differ (plural, display, menu, spaces, groups). */
  changes: FieldChange[];
  attributes: AttributeDiff[];
  /** The same attributes in a different order (changes the Studio form order). */
  attributesReordered: boolean;
}

export interface KeyedDiff {
  kind: ChangeKind;
  key: string;
  changes: FieldChange[];
}

export type Severity = 'blocking' | 'breaking' | 'warning';

export interface DiffIssue {
  severity: Severity;
  path: string;
  message: string;
}

export interface SchemaDiff {
  hasChanges: boolean;
  /** Title change; only compared when the local side sets a title. */
  title?: FieldChange;
  entities: EntityDiff[];
  entitiesReordered: boolean;
  scopes: KeyedDiff[];
  spaces: KeyedDiff[];
  menuGroups: KeyedDiff[];
  issues: DiffIssue[];
}

/** JSON with sorted keys; `undefined` (a missing key) compares equal to a missing key. */
export function stableStringify(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }

  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};

    for (const key of Object.keys(value).sort()) {
      const entry = (value as Record<string, unknown>)[key];

      if (entry !== undefined) {
        sorted[key] = sortValue(entry);
      }
    }

    return sorted;
  }

  return value;
}

function isEqual(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right);
}

/** Field-by-field differences of two objects, ignoring the listed keys. */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  ignore: readonly string[] = []
): FieldChange[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => !ignore.includes(key))
    .sort();

  return keys
    .filter((key) => !isEqual(before[key], after[key]))
    .map((key) => ({ field: key, from: before[key], to: after[key] }));
}

function sameOrder(left: string[], right: string[]): boolean {
  const common = new Set(left.filter((name) => right.includes(name)));
  const a = left.filter((name) => common.has(name));
  const b = right.filter((name) => common.has(name));

  return a.every((name, index) => b[index] === name);
}

function diffKeyed<T extends Record<string, unknown>>(
  before: T[],
  after: T[],
  keyOf: (item: T) => string
): KeyedDiff[] {
  const beforeMap = new Map(before.map((item) => [keyOf(item), item]));
  const afterMap = new Map(after.map((item) => [keyOf(item), item]));
  const result: KeyedDiff[] = [];

  for (const [key, item] of afterMap) {
    const previous = beforeMap.get(key);

    if (!previous) {
      result.push({ kind: 'added', key, changes: [] });
    } else {
      const changes = diffFields(previous, item);

      if (changes.length > 0) {
        result.push({ kind: 'changed', key, changes });
      }
    }
  }

  for (const key of beforeMap.keys()) {
    if (!afterMap.has(key)) {
      result.push({ kind: 'removed', key, changes: [] });
    }
  }

  return result;
}

function diffAttributes(
  entityName: string,
  before: DiffAttributeInput[],
  after: DiffAttributeInput[],
  issues: DiffIssue[]
): AttributeDiff[] {
  const beforeMap = new Map(before.map((attribute) => [attribute.name, attribute]));
  const afterMap = new Map(after.map((attribute) => [attribute.name, attribute]));
  const result: AttributeDiff[] = [];

  for (const attribute of after) {
    const previous = beforeMap.get(attribute.name);

    if (!previous) {
      result.push({ kind: 'added', name: attribute.name, attribute, changes: [] });
      continue;
    }

    const changes = diffFields(previous, attribute, ['name']);

    if (changes.length === 0) {
      continue;
    }

    result.push({ kind: 'changed', name: attribute.name, changes });
    const path = `${entityName}.${attribute.name}`;

    if (previous.dataType !== attribute.dataType) {
      issues.push({
        severity: 'blocking',
        path,
        message: `Attribute "${path}" changes data type from "${String(previous.dataType)}" to "${String(attribute.dataType)}". Deploy refuses this change: add a new attribute, migrate the data, then remove the old one.`,
      });
    }

    if (previous.scope !== attribute.scope) {
      issues.push({
        severity: 'warning',
        path,
        message: `Attribute "${path}" changes scope from "${String(previous.scope)}" to "${String(attribute.scope)}". Check access rules and relationship behavior.`,
      });
    }
  }

  for (const attribute of before) {
    if (!afterMap.has(attribute.name)) {
      const path = `${entityName}.${attribute.name}`;
      result.push({ kind: 'removed', name: attribute.name, attribute, changes: [] });
      issues.push({
        severity: 'breaking',
        path,
        message: `Attribute "${path}" is removed. Its values become inaccessible; deploy needs --allow-breaking-changes.`,
      });
    }
  }

  return result;
}

/**
 * Compares two schema snapshots. `before` is usually the deployed schema and
 * `after` the local config, so the result reads as "what a deploy would change".
 */
export function diffSchemas(before: SchemaSnapshot, after: SchemaSnapshot): SchemaDiff {
  const issues: DiffIssue[] = [];
  const entities: EntityDiff[] = [];
  const beforeEntities = new Map(before.schema.map((entity) => [entity.name, entity]));
  const afterEntities = new Map(after.schema.map((entity) => [entity.name, entity]));

  for (const entity of after.schema) {
    const previous = beforeEntities.get(entity.name);

    if (!previous) {
      entities.push({
        kind: 'added',
        name: entity.name,
        entity,
        changes: [],
        attributes: [],
        attributesReordered: false,
      });
      continue;
    }

    const changes = diffFields(previous, entity, ['name', 'attributes']);
    const attributes = diffAttributes(entity.name, previous.attributes, entity.attributes, issues);
    const attributesReordered = !sameOrder(
      previous.attributes.map((attribute) => attribute.name),
      entity.attributes.map((attribute) => attribute.name)
    );

    if (changes.length > 0 || attributes.length > 0 || attributesReordered) {
      entities.push({ kind: 'changed', name: entity.name, changes, attributes, attributesReordered });
    }
  }

  for (const entity of before.schema) {
    if (!afterEntities.has(entity.name)) {
      entities.push({
        kind: 'removed',
        name: entity.name,
        entity,
        changes: [],
        attributes: [],
        attributesReordered: false,
      });
      issues.push({
        severity: 'breaking',
        path: entity.name,
        message: `Entity "${entity.name}" is removed. Its records become inaccessible; deploy needs --allow-breaking-changes.`,
      });
    }
  }

  const entitiesReordered = !sameOrder(
    before.schema.map((entity) => entity.name),
    after.schema.map((entity) => entity.name)
  );
  const scopes = diffKeyed(before.scopes ?? [], after.scopes ?? [], (scope) => scope.name);
  const spaces = diffKeyed(before.spaces ?? [], after.spaces ?? [], (space) => space.code);
  const menuGroups = diffKeyed(before.menuGroups ?? [], after.menuGroups ?? [], (group) => group.name);

  for (const space of spaces) {
    if (space.kind === 'removed') {
      issues.push({
        severity: 'warning',
        path: `spaces.${space.key}`,
        message: `Space "${space.key}" is removed. Deploy treats this as breaking while the space still has members or automations.`,
      });
    }
  }

  const title =
    after.title !== undefined && after.title !== before.title
      ? { field: 'title', from: before.title, to: after.title }
      : undefined;
  const hasChanges =
    Boolean(title) ||
    entities.length > 0 ||
    entitiesReordered ||
    scopes.length > 0 ||
    spaces.length > 0 ||
    menuGroups.length > 0;

  const order: Record<Severity, number> = { blocking: 0, breaking: 1, warning: 2 };
  issues.sort((left, right) => order[left.severity] - order[right.severity]);

  return { hasChanges, title, entities, entitiesReordered, scopes, spaces, menuGroups, issues };
}

/** True when deploy would refuse the change without (or even with) --allow-breaking-changes. */
export function hasBreakingChanges(diff: SchemaDiff): boolean {
  return diff.issues.some((issue) => issue.severity === 'blocking' || issue.severity === 'breaking');
}

/** Short value rendering for diff output: strings quoted, objects as compact JSON. */
export function formatDiffValue(value: unknown, max = 48): string {
  if (value === undefined) {
    return '(unset)';
  }

  const text = typeof value === 'string' ? JSON.stringify(value) : stableStringify(value);

  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Counts for a one-line summary. */
export function summarizeDiff(diff: SchemaDiff): {
  added: number;
  removed: number;
  changed: number;
  breaking: number;
  blocking: number;
  warnings: number;
} {
  return {
    added: diff.entities.filter((entity) => entity.kind === 'added').length,
    removed: diff.entities.filter((entity) => entity.kind === 'removed').length,
    changed: diff.entities.filter((entity) => entity.kind === 'changed').length,
    breaking: diff.issues.filter((issue) => issue.severity === 'breaking').length,
    blocking: diff.issues.filter((issue) => issue.severity === 'blocking').length,
    warnings: diff.issues.filter((issue) => issue.severity === 'warning').length,
  };
}
