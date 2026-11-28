import type { MarketplacePlugin, PluginConnection } from './plugin-types';
import type { TemplateSummary } from './template-types';

/**
 * SWR options for `/templates`: an older platform answers 404, which must not be retried or
 * re-requested on every window focus.
 */
export const TEMPLATES_SWR_OPTIONS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  shouldRetryOnError: false,
} as const;

/** Required plugins of the template that the project has no connection for, in the template's order. */
export function missingRequiredPlugins(template: TemplateSummary, plugins: MarketplacePlugin[]): MarketplacePlugin[] {
  const byId = new Map(plugins.map((plugin) => [plugin.id, plugin]));

  return template.plugins
    .filter((requirement) => requirement.required)
    .map((requirement) => byId.get(requirement.id))
    .filter((plugin): plugin is MarketplacePlugin => plugin !== undefined && !plugin.connections.some(usableOrBroken));
}

/** Templates count every connection (one needing a reconnect too) except one still waiting for its project. */
function usableOrBroken(connection: PluginConnection): boolean {
  return connection.needsTarget !== true;
}

/**
 * An automation template is ready to use when every plugin it requires is connected.
 * A required plugin missing from the catalog counts as not ready.
 */
export function isTemplateReady(template: TemplateSummary, plugins: MarketplacePlugin[]): boolean {
  const byId = new Map(plugins.map((plugin) => [plugin.id, plugin]));

  return template.plugins
    .filter((requirement) => requirement.required)
    .every((requirement) => byId.get(requirement.id)?.connections.some(usableOrBroken) ?? false);
}

export function matchesTemplateSearch(template: TemplateSummary, search: string): boolean {
  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return [template.displayName, template.description, template.category, ...(template.keywords ?? [])]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

export interface TemplateGroup {
  category: string;
  templates: TemplateSummary[];
}

/** Splits the catalog for the gallery by category, in alphabetical order. */
export function groupTemplates(templates: TemplateSummary[]): TemplateGroup[] {
  const groups = new Map<string, TemplateSummary[]>();

  for (const template of templates) {
    const existing = groups.get(template.category);

    if (existing) {
      existing.push(template);
    } else {
      groups.set(template.category, [template]);
    }
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, items]) => ({ category, templates: items }));
}

/** The names of the catalog's template categories; the ids are its schema's. */
const TEMPLATE_CATEGORY_LABELS: { [category: string]: string } = {
  catalog: 'Catalog',
  'data-quality': 'Data Quality',
  marketing: 'Marketing',
  'orders-customers': 'Orders & Customers',
  reporting: 'Reporting',
  'team-ops': 'Team Operations',
};

/** A template category's name; a category added to the catalog later is named from its id. */
export function templateCategoryLabel(category: string): string {
  if (Object.prototype.hasOwnProperty.call(TEMPLATE_CATEGORY_LABELS, category)) {
    return TEMPLATE_CATEGORY_LABELS[category]!;
  }

  return category
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** The first message of the chat that sets a template up; the agent loads the template by its name. */
export function templateSetupPrompt(template: Pick<TemplateSummary, 'displayName' | 'name'>): string {
  return `Set up the "${template.displayName}" template (${template.name}).`;
}

/** Automation templates to suggest when the project has no automations yet. */
export function suggestedAutomationTemplates(
  templates: TemplateSummary[],
  plugins: MarketplacePlugin[] | undefined,
  limit = 4
): TemplateSummary[] {
  const automations = templates.filter((template) => template.kind === 'automation');

  if (!plugins) {
    return automations.slice(0, limit);
  }

  const ready = automations.filter((template) => isTemplateReady(template, plugins));
  const rest = automations.filter((template) => !isTemplateReady(template, plugins));

  return [...ready, ...rest].slice(0, limit);
}
