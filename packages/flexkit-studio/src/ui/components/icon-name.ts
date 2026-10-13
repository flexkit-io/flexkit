import Fuse from 'fuse.js';

/** `FolderTree` → `folder-tree`, `Clock10` → `clock-10`, `folder-tree` → `folder-tree`. */
export function toIconName(name: string): string {
  return name
    .trim()
    .replace(/([a-z])([A-Z0-9])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export const DEFAULT_ICON_NAME = 'dock';

/** `arrow-down-0-1` → `ArrowDown01`: the component name lucide exports for a kebab icon name. */
export function toPascalIconName(name: string): string {
  return name.replace(/(^|-)([a-z0-9])/g, (_, __, char: string) => char.toUpperCase());
}

/**
 * Builds a resolver over the available icon names. It returns the icon for
 * `name` when it exists (as a kebab name or as lucide's PascalCase component
 * name), otherwise the closest match for `fallbackFor` (an entity name, say),
 * and finally `dock`.
 */
export function createIconResolver(
  iconNames: readonly string[]
): (name: string | undefined, fallbackFor?: string) => string {
  const available = new Set<string>(iconNames);
  // Kebab → PascalCase is lossy (`arrow-down-0-1` and `clock-10` both keep
  // their digits differently), so map every known PascalCase name explicitly.
  // Aliases (`arrow-down-0-1`, `arrow-down-01`) share a PascalCase name; the first one wins.
  const byPascalName = new Map<string, string>();

  for (const candidate of iconNames) {
    const pascal = toPascalIconName(candidate);

    if (!byPascalName.has(pascal)) {
      byPascalName.set(pascal, candidate);
    }
  }

  const fuse = new Fuse(
    iconNames.map((candidate) => ({ name: candidate })),
    { keys: ['name'], threshold: 0.5 }
  );

  return (name, fallbackFor) => {
    if (name) {
      const trimmed = name.trim();
      const exact = byPascalName.get(trimmed) ?? (available.has(trimmed) ? trimmed : undefined);

      if (exact) {
        return exact;
      }

      const normalized = toIconName(trimmed);

      if (available.has(normalized)) {
        return normalized;
      }
    }

    const concept = fallbackFor ?? name;

    if (concept) {
      const [match] = fuse.search(concept);

      if (match) {
        return match.item.name;
      }
    }

    return DEFAULT_ICON_NAME;
  };
}
