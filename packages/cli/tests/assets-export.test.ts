import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { assetBundleFilename, type ExportedAsset } from '../src/commands/assets/export';

const asset = (overrides: Partial<ExportedAsset>): ExportedAsset => ({
  _id: 'asset1',
  extension: 'png',
  height: null,
  lqip: null,
  mimeType: null,
  originalFilename: null,
  path: 'project/asset1.png',
  sha256: null,
  size: null,
  width: null,
  ...overrides,
});

describe('assetBundleFilename', () => {
  it('names the file after the asset id and its extension', () => {
    assert.equal(assetBundleFilename(asset({})), 'files/asset1.png');
    assert.equal(assetBundleFilename(asset({ extension: null, path: 'project/asset1.webp' })), 'files/asset1.webp');
    assert.equal(assetBundleFilename(asset({ extension: null, path: 'project/asset1' })), 'files/asset1.bin');
  });

  it('never leaves the files folder, whatever the asset record holds', () => {
    const staging = path.resolve('/tmp/staging');

    for (const extension of ['/../../../../home/user/.ssh/authorized_keys', '..', 'png/../../x', 'a\\..\\b', '']) {
      for (const id of ['asset1', '..', '../../etc', 'a/b']) {
        const filename = assetBundleFilename(asset({ _id: id, extension, path: 'project/asset1.png' }));
        const destination = path.resolve(staging, filename);

        assert.equal(path.dirname(destination), path.join(staging, 'files'), `${id} + ${extension} -> ${filename}`);
        assert.ok(filename.endsWith('.png'));
      }
    }
  });
});
