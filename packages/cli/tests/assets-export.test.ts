import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  assertDistinctBundleFilenames,
  assetBundleFilename,
  downloadAssetFile,
  type ExportedAsset,
} from '../src/commands/assets/export';
import { findRefsOutside } from '../src/util/import/input';
import type Client from '../src/util/client';

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
    const extensions = ['/../../../../home/user/.ssh/authorized_keys', '..', 'png/../../x', 'a\\..\\b', 'png\n', ''];

    for (const extension of extensions) {
      for (const id of ['asset1', '..', '../../etc', 'a/b', 'a\\b', 'c:d']) {
        const filename = assetBundleFilename(asset({ _id: id, extension, path: 'project/asset1.png' }));

        // Checked with both path flavours: the CLI also runs on Windows.
        for (const flavour of [path.posix, path.win32]) {
          const staging = flavour.resolve('/tmp/staging');

          assert.equal(
            flavour.dirname(flavour.resolve(staging, filename)),
            flavour.join(staging, 'files'),
            `${id} + ${extension} -> ${filename}`
          );
        }

        assert.ok(filename.endsWith('.png'));
      }
    }
  });
});

describe('assertDistinctBundleFilenames', () => {
  it('accepts assets with distinct file names', () => {
    assert.doesNotThrow(() => {
      assertDistinctBundleFilenames([asset({ _id: 'a' }), asset({ _id: 'b' }), asset({ _id: 'a', extension: 'jpg' })]);
    });
  });

  it('refuses two assets that would share a file, including on case-insensitive file systems', () => {
    assert.throws(() => {
      assertDistinctBundleFilenames([asset({ _id: 'a/b' }), asset({ _id: 'a_b' })]);
    }, /same file name/);
    assert.throws(() => {
      assertDistinctBundleFilenames([asset({ _id: 'Logo' }), asset({ _id: 'logo' })]);
    }, /same file name/);
  });
});

describe('downloadAssetFile', () => {
  it('does not request a path that leaves the images route', async () => {
    const client = { authUrl: 'https://flexkit.example' } as unknown as Client;

    for (const assetPath of ['../api/user', 'p/../../x.png', '/x.png', 'p/a.png?x=1', 'p/a.png#x', 'p\\a.png']) {
      await assert.rejects(
        downloadAssetFile(client, asset({ path: assetPath }), '/tmp/never-written'),
        /invalid file path/
      );
    }
  });
});

describe('findRefsOutside', () => {
  it('keeps the references of a bundle inside the bundle', () => {
    const base = path.resolve('/tmp/bundle');

    assert.deepEqual(findRefsOutside([path.join(base, 'files/a.png'), path.join(base, 'a.png')], base), []);
    assert.deepEqual(
      findRefsOutside(
        [path.resolve(base, '../../etc/passwd'), path.resolve('/etc/passwd'), `${base}-other/a.png`],
        base
      ),
      [path.resolve(base, '../../etc/passwd'), path.resolve('/etc/passwd'), `${base}-other/a.png`]
    );
  });
});
