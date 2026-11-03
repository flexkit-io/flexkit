import chalk from 'chalk';
import { formatDiffValue, type AttributeDiff, type FieldChange, type KeyedDiff, type SchemaDiff } from './diff';

const SIGN = {
  added: chalk.green('+'),
  removed: chalk.red('-'),
  changed: chalk.yellow('~'),
} as const;

function formatChange(change: FieldChange): string {
  return `${chalk.dim(`${change.field}:`)} ${formatDiffValue(change.from)} ${chalk.dim('→')} ${formatDiffValue(change.to)}`;
}

function describeAttribute(attribute: AttributeDiff): string {
  const source = attribute.attribute;

  if (!source) {
    return '';
  }

  const parts = [source.dataType, source.scope].filter(Boolean);
  const relationship = source.relationship as { entity?: string; mode?: string } | undefined;

  if (relationship?.entity) {
    parts.push(`→ ${relationship.entity}${relationship.mode ? ` (${relationship.mode})` : ''}`);
  }

  return chalk.dim(parts.join(', '));
}

function renderKeyed(title: string, items: KeyedDiff[], lines: string[]): void {
  if (items.length === 0) {
    return;
  }

  lines.push('', chalk.bold(title));

  for (const item of items) {
    lines.push(`  ${SIGN[item.kind]} ${item.key}`);

    for (const change of item.changes) {
      lines.push(`      ${formatChange(change)}`);
    }
  }
}

/** Renders a schema diff as indented, colored lines (no trailing newline). */
export function renderSchemaDiff(diff: SchemaDiff): string {
  const lines: string[] = [];
  const severityByPath = new Map(diff.issues.map((issue) => [issue.path, issue.severity]));
  const tag = (path: string): string => {
    const severity = severityByPath.get(path);

    if (severity === 'blocking') {
      return ` ${chalk.red.bold('BLOCKING')}`;
    }

    if (severity === 'breaking') {
      return ` ${chalk.red('BREAKING')}`;
    }

    return '';
  };

  if (diff.title) {
    lines.push('', `${chalk.bold('Studio')}`, `  ${SIGN.changed} ${formatChange(diff.title)}`);
  }

  if (diff.entities.length > 0 || diff.entitiesReordered) {
    lines.push('', chalk.bold('Entities'));
  }

  for (const entity of diff.entities) {
    if (entity.kind !== 'changed') {
      const count = entity.entity?.attributes.length ?? 0;
      lines.push(
        `  ${SIGN[entity.kind]} ${entity.name} ${chalk.dim(`(${count.toString()} attribute${count === 1 ? '' : 's'})`)}${tag(entity.name)}`
      );
      continue;
    }

    lines.push(`  ${SIGN.changed} ${entity.name}`);

    for (const change of entity.changes) {
      lines.push(`      ${formatChange(change)}`);
    }

    for (const attribute of entity.attributes) {
      const path = `${entity.name}.${attribute.name}`;

      if (attribute.kind !== 'changed') {
        lines.push(`      ${SIGN[attribute.kind]} ${attribute.name} ${describeAttribute(attribute)}${tag(path)}`);
        continue;
      }

      lines.push(`      ${SIGN.changed} ${attribute.name}${tag(path)}`);

      for (const change of attribute.changes) {
        lines.push(`          ${formatChange(change)}`);
      }
    }

    if (entity.attributesReordered) {
      lines.push(`      ${chalk.dim('attribute order changed')}`);
    }
  }

  if (diff.entitiesReordered) {
    lines.push(`  ${chalk.dim('entity order changed')}`);
  }

  renderKeyed('Scopes', diff.scopes, lines);
  renderKeyed('Spaces', diff.spaces, lines);
  renderKeyed('Menu groups', diff.menuGroups, lines);

  if (diff.issues.length > 0) {
    lines.push('', chalk.bold('Compatibility'));

    for (const issue of diff.issues) {
      const label =
        issue.severity === 'warning'
          ? chalk.yellow('warning ')
          : issue.severity === 'blocking'
            ? chalk.red.bold('blocking')
            : chalk.red('breaking');
      lines.push(`  ${label} ${issue.message}`);
    }
  }

  return lines.join('\n').replace(/^\n/, '');
}
