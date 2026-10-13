import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, it } from 'node:test';
import { createIconResolver, toIconName, toPascalIconName } from '../src/ui/components/icon-name';

// The lucide package has no exports map, so Node cannot import
// `lucide-react/dynamic` directly; read the icon list from the file instead.
async function loadIconNames(): Promise<string[]> {
  const packageJson = createRequire(import.meta.url).resolve('lucide-react/package.json');
  const imports = (await import(path.join(path.dirname(packageJson), 'dynamicIconImports.mjs'))) as {
    default: { [name: string]: unknown };
  };

  return Object.keys(imports.default);
}

describe('icon names', () => {
  it('turns PascalCase lucide names into the kebab-case names the dynamic loader expects', () => {
    assert.equal(toIconName('Tag'), 'tag');
    assert.equal(toIconName('FolderTree'), 'folder-tree');
    assert.equal(toIconName('Clock10'), 'clock-10');
    assert.equal(toIconName('ShoppingCart'), 'shopping-cart');
    assert.equal(toIconName('folder-tree'), 'folder-tree');
    assert.equal(toIconName(' Tag '), 'tag');
  });

  it('resolves every lucide icon from the PascalCase name its component is exported under', async () => {
    const iconNames = await loadIconNames();
    const resolve = createIconResolver(iconNames);

    assert.ok(iconNames.length > 1000);
    assert.equal(toPascalIconName('arrow-down-0-1'), 'ArrowDown01');
    assert.equal(toPascalIconName('clock-10'), 'Clock10');

    for (const name of iconNames) {
      // Aliases such as `arrow-down-0-1` / `arrow-down-01` share one PascalCase name.
      assert.equal(toPascalIconName(resolve(toPascalIconName(name))), toPascalIconName(name), name);
      assert.equal(resolve(name), name, name);
    }
  });

  it('resolves exact names, then an entity name that is itself an icon, then dock', async () => {
    const resolve = createIconResolver(await loadIconNames());

    assert.equal(resolve('Tag'), 'tag');
    assert.equal(resolve('ChartColumnIncreasing'), 'chart-column-increasing');
    assert.equal(resolve('NotAnIcon', 'calendar'), 'calendar');
    // Singular/plural forms of an icon name count as exact.
    assert.equal(resolve(undefined, 'language'), 'languages');
    assert.equal(resolve(undefined, 'tags'), 'tags');
    assert.equal(resolve(undefined, 'contact'), 'contact');
    // Loose matches used to produce unrelated icons; they now fall back.
    for (const entity of ['brand', 'category', 'product', 'tax', 'shipment', 'customer', 'use']) {
      assert.equal(resolve(undefined, entity), 'dock', entity);
    }
  });
});
