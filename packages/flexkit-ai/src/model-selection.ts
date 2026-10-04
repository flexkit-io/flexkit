import type { AutomationModel } from './types';

/**
 * A stored model id is `auto` or `<gatewayModelId>:<effort>`. The UI keeps
 * the two halves apart: a model key (`auto`, a gateway model id, or a legacy
 * id the catalog no longer lists) and an effort the selected model supports.
 */
export const AUTO_MODEL_KEY = 'auto';

export interface ModelSelection {
  effort: string | null;
  modelKey: string;
}

const EFFORT_LABELS: { [effort: string]: string } = {
  high: 'High',
  low: 'Low',
  max: 'Max',
  medium: 'Medium',
  minimal: 'Minimal',
  none: 'None',
  xhigh: 'Extra high',
};

export function getEffortLabel(effort: string): string {
  return EFFORT_LABELS[effort] ?? effort;
}

export function isAutoModel(model: AutomationModel): boolean {
  return model.kind === 'auto' || model.id === AUTO_MODEL_KEY;
}

/** The value a model select holds for this catalog entry. */
export function getModelKey(model: AutomationModel): string {
  if (isAutoModel(model)) {
    return AUTO_MODEL_KEY;
  }

  return model.gatewayModelId ?? model.id;
}

export function findModelByKey(models: AutomationModel[], modelKey: string | null): AutomationModel | undefined {
  if (!modelKey) {
    return undefined;
  }

  return models.find((model) => getModelKey(model) === modelKey);
}

function splitModelId(value: string): { gatewayModelId: string; rawEffort: string | null } {
  // Gateway ids contain no colon, so the last one separates the effort.
  const separator = value.lastIndexOf(':');

  if (separator === -1) {
    return { gatewayModelId: value, rawEffort: null };
  }

  return { gatewayModelId: value.slice(0, separator), rawEffort: value.slice(separator + 1).trim().toLowerCase() };
}

/** Effort the model accepts: the given one when supported, else its default. */
export function coerceEffort(model: AutomationModel | undefined, effort: string | null): string | null {
  if (!model || !model.efforts || model.efforts.length === 0) {
    return null;
  }

  if (effort && model.efforts.includes(effort)) {
    return effort;
  }

  return model.defaultEffort ?? model.efforts[0] ?? null;
}

export function getEffortOptions(model: AutomationModel | undefined): { label: string; value: string }[] {
  return (model?.efforts ?? []).map((effort) => ({ label: getEffortLabel(effort), value: effort }));
}

/**
 * Null when the id names no model in the catalog. A bare gateway id or an
 * unsupported effort gets the model's default effort; an exact match on a
 * legacy id (older API without gateway ids) keeps that id as the key.
 */
export function parseModelSelection(value: string | null | undefined, models: AutomationModel[]): ModelSelection | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed === AUTO_MODEL_KEY) {
    return { effort: null, modelKey: AUTO_MODEL_KEY };
  }

  const { gatewayModelId, rawEffort } = splitModelId(trimmed);
  const byGatewayId = models.find((model) => !isAutoModel(model) && model.gatewayModelId === gatewayModelId);

  if (byGatewayId) {
    return { effort: coerceEffort(byGatewayId, rawEffort), modelKey: getModelKey(byGatewayId) };
  }

  const byId = models.find((model) => !isAutoModel(model) && model.id === trimmed);

  if (byId) {
    return { effort: coerceEffort(byId, rawEffort), modelKey: getModelKey(byId) };
  }

  return null;
}

/** The id to store or send; an unknown key (legacy id) passes through unchanged. */
export function formatModelSelection(selection: ModelSelection, models: AutomationModel[]): string {
  if (selection.modelKey === AUTO_MODEL_KEY) {
    return AUTO_MODEL_KEY;
  }

  const model = findModelByKey(models, selection.modelKey);

  if (!model) {
    return selection.modelKey;
  }

  const effort = coerceEffort(model, selection.effort);

  if (!effort || !model.gatewayModelId) {
    return model.id;
  }

  return `${model.gatewayModelId}:${effort}`;
}

/** "Opus 5.5 · High", "Auto", or the raw key for a legacy id. */
export function getModelSelectionLabel(selection: ModelSelection, models: AutomationModel[]): string {
  const model = findModelByKey(models, selection.modelKey);

  if (!model) {
    return selection.modelKey;
  }

  const effort = coerceEffort(model, selection.effort);

  return effort ? `${model.name} · ${getEffortLabel(effort)}` : model.name;
}
