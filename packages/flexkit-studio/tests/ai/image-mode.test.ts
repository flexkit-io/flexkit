import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getCssAspectRatio,
  getImageModeAfterSend,
  getImageModeLabel,
  getImageModePlaceholder,
  getRetryImageModels,
  toImageGeneration,
  toReusedImageRequest,
} from '../../src/apps/ai/agent/image-mode';

const SOURCE = '6f1c2b8e-0f4e-4a8c-9a51-2f7d4c1b9e10';

describe('image mode', () => {
  it('labels the chip with the model, the default when none was picked', () => {
    assert.equal(getImageModeLabel({}), 'Image · GPT Image');
    assert.equal(getImageModeLabel({ model: 'bytedance/seedream-5.5' }), 'Image · Seedream');
    assert.equal(
      getImageModeLabel({ model: 'google/gemini-nano-banana-2.1', sourceArtifactId: SOURCE }),
      'Edit image · Nano Banana'
    );
  });

  it('asks for changes while editing and for a description otherwise', () => {
    assert.equal(getImageModePlaceholder({}), 'Describe an image...');
    assert.equal(getImageModePlaceholder({ sourceArtifactId: SOURCE }), 'Describe the changes...');
  });

  it('keeps the model and ratio after a send but ends the edit', () => {
    assert.deepEqual(
      getImageModeAfterSend({ aspectRatio: '16:9', model: 'bytedance/seedream-5.5', sourceArtifactId: SOURCE }),
      { aspectRatio: '16:9', model: 'bytedance/seedream-5.5' }
    );
  });

  it('sends only the options the user set', () => {
    assert.equal(toImageGeneration(null), undefined);
    assert.deepEqual(toImageGeneration({}), {});
    assert.deepEqual(toImageGeneration({ aspectRatio: '1:1' }), { aspectRatio: '1:1' });
  });

  it('offers the other models for a retry', () => {
    assert.deepEqual(
      getRetryImageModels('openai/gpt-image-2.6-sunburst').map((model) => model.name),
      ['Seedream', 'Nano Banana']
    );
  });

  it('turns a ratio into a CSS aspect ratio, square when unknown', () => {
    assert.equal(getCssAspectRatio('16:9'), '16 / 9');
    assert.equal(getCssAspectRatio(undefined), '1 / 1');
    assert.equal(getCssAspectRatio('wide'), '1 / 1');
  });

  it('drops a model or ratio from history that is no longer offered', () => {
    assert.deepEqual(toReusedImageRequest({ aspectRatio: '16:9', model: 'bytedance/seedream-5.5' }), {
      aspectRatio: '16:9',
      model: 'bytedance/seedream-5.5',
    });
    assert.deepEqual(
      toReusedImageRequest({ aspectRatio: '4:5', model: 'openai/retired-image-1', sourceArtifactId: SOURCE }),
      {
        sourceArtifactId: SOURCE,
      }
    );
  });
});
