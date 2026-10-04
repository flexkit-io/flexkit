import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AUTO_MODEL_KEY,
  coerceEffort,
  findModelByKey,
  formatModelSelection,
  getEffortOptions,
  getModelKey,
  getModelSelectionLabel,
  parseModelSelection,
} from '../src/model-selection';
import type { AutomationModel } from '../src/types';

const auto: AutomationModel = {
  autoTier: null,
  defaultEffort: null,
  deprecated: false,
  effort: null,
  efforts: [],
  gatewayModelId: null,
  id: 'auto',
  kind: 'auto',
  name: 'Auto',
};
const sol: AutomationModel = {
  autoTier: 'balanced',
  defaultEffort: 'medium',
  deprecated: false,
  effort: 'Medium',
  efforts: ['none', 'low', 'medium', 'high', 'xhigh'],
  gatewayModelId: 'openai/gpt-6.1-sol',
  id: 'openai/gpt-6.1-sol:medium',
  kind: 'model',
  name: 'GPT-6.1 Sol',
};
const opus5: AutomationModel = {
  autoTier: null,
  defaultEffort: 'high',
  deprecated: true,
  effort: 'High',
  efforts: ['low', 'medium', 'high', 'max'],
  gatewayModelId: 'anthropic/claude-opus-5',
  id: 'anthropic/claude-opus-5:high',
  kind: 'model',
  name: 'Opus 5',
};
/** Shape an older API returns: composite ids and no effort data. */
const legacy: AutomationModel = { deprecated: false, effort: 'High', id: 'xai/grok-4.6:high', name: 'Grok 4.6 High' };
const models = [auto, sol, opus5];

describe('parseModelSelection', () => {
  it('recognizes auto, composites, bare ids and unsupported efforts', () => {
    assert.deepEqual(parseModelSelection('auto', models), { effort: null, modelKey: AUTO_MODEL_KEY });
    assert.deepEqual(parseModelSelection('openai/gpt-6.1-sol:high', models), { effort: 'high', modelKey: 'openai/gpt-6.1-sol' });
    assert.deepEqual(parseModelSelection('openai/gpt-6.1-sol', models), { effort: 'medium', modelKey: 'openai/gpt-6.1-sol' });
    assert.deepEqual(parseModelSelection('openai/gpt-6.1-sol:max', models), { effort: 'medium', modelKey: 'openai/gpt-6.1-sol' });
    assert.deepEqual(parseModelSelection('anthropic/claude-opus-5:high', models), { effort: 'high', modelKey: 'anthropic/claude-opus-5' });
    assert.equal(parseModelSelection('vendor/unknown:high', models), null);
    assert.equal(parseModelSelection('', models), null);
    assert.equal(parseModelSelection(null, models), null);
  });

  it('matches legacy catalogs on the exact id', () => {
    assert.deepEqual(parseModelSelection('xai/grok-4.6:high', [legacy]), { effort: null, modelKey: 'xai/grok-4.6:high' });
    assert.equal(parseModelSelection('xai/grok-4.6:low', [legacy]), null);
  });
});

describe('formatModelSelection', () => {
  it('round-trips every catalog entry and passes unknown keys through', () => {
    assert.equal(formatModelSelection({ effort: null, modelKey: AUTO_MODEL_KEY }, models), 'auto');
    assert.equal(formatModelSelection({ effort: 'high', modelKey: 'openai/gpt-6.1-sol' }, models), 'openai/gpt-6.1-sol:high');
    assert.equal(formatModelSelection({ effort: null, modelKey: 'openai/gpt-6.1-sol' }, models), 'openai/gpt-6.1-sol:medium');
    assert.equal(formatModelSelection({ effort: 'xhigh', modelKey: 'anthropic/claude-opus-5' }, models), 'anthropic/claude-opus-5:high');
    assert.equal(formatModelSelection({ effort: 'low', modelKey: 'vendor/gone:low' }, models), 'vendor/gone:low');
    assert.equal(formatModelSelection({ effort: null, modelKey: 'xai/grok-4.6:high' }, [legacy]), 'xai/grok-4.6:high');
  });
});

describe('effort helpers', () => {
  it('coerces to a supported effort and lists labeled options', () => {
    assert.equal(coerceEffort(sol, 'xhigh'), 'xhigh');
    assert.equal(coerceEffort(sol, 'max'), 'medium');
    assert.equal(coerceEffort(sol, null), 'medium');
    assert.equal(coerceEffort(auto, 'high'), null);
    assert.equal(coerceEffort(legacy, 'high'), null);
    assert.deepEqual(getEffortOptions(sol).map((option) => option.label), ['None', 'Low', 'Medium', 'High', 'Extra high']);
    assert.deepEqual(getEffortOptions(auto), []);
  });

  it('keys and labels models', () => {
    assert.equal(getModelKey(auto), 'auto');
    assert.equal(getModelKey(sol), 'openai/gpt-6.1-sol');
    assert.equal(getModelKey(legacy), 'xai/grok-4.6:high');
    assert.equal(findModelByKey(models, 'anthropic/claude-opus-5'), opus5);
    assert.equal(findModelByKey(models, null), undefined);
    assert.equal(getModelSelectionLabel({ effort: 'high', modelKey: 'openai/gpt-6.1-sol' }, models), 'GPT-6.1 Sol · High');
    assert.equal(getModelSelectionLabel({ effort: null, modelKey: 'auto' }, models), 'Auto');
    assert.equal(getModelSelectionLabel({ effort: null, modelKey: 'vendor/gone' }, models), 'vendor/gone');
  });
});
