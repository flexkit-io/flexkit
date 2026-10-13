/** `FolderTree` → `folder-tree`, `Clock10` → `clock-10`, `folder-tree` → `folder-tree`. */
export function toIconName(name: string): string {
  return name
    .trim()
    .replace(/([a-z])([A-Z0-9])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/** Shown for entities that declare no icon and whose name is not itself an icon name. */
export const DEFAULT_ICON_NAME = 'dock';

/** `arrow-down-0-1` → `ArrowDown01`: the component name lucide exports for a kebab icon name. */
export function toPascalIconName(name: string): string {
  return name.replace(/(^|-)([a-z0-9])/g, (_, __, char: string) => char.toUpperCase());
}

/**
 * Builds a resolver over the available icon names.
 *
 * `name` (from `menu.icon`) is accepted as a kebab name or as lucide's
 * PascalCase component name. Without one, an entity gets the icon that shares
 * its name exactly, allowing for a plural `s` either way (`tag` → `tags`,
 * `languages` → `languages`); anything looser produced unrelated icons, so
 * everything else falls back to `DEFAULT_ICON_NAME`.
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

  const findExact = (value: string): string | undefined => {
    const trimmed = value.trim();

    if (available.has(trimmed)) {
      return trimmed;
    }

    const pascal = byPascalName.get(trimmed);

    if (pascal) {
      return pascal;
    }

    const kebab = toIconName(trimmed);

    return available.has(kebab) ? kebab : undefined;
  };

  return (name, fallbackFor) => {
    if (name) {
      const exact = findExact(name);

      if (exact) {
        return exact;
      }
    }

    if (fallbackFor) {
      const kebab = toIconName(fallbackFor);
      const candidates = [kebab, `${kebab}s`, kebab.endsWith('s') ? kebab.slice(0, -1) : ''].filter(Boolean);
      const match = candidates.find((candidate) => available.has(candidate));

      if (match) {
        return match;
      }
    }

    return DEFAULT_ICON_NAME;
  };
}
