import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildMemoryUpdate,
  formatMemorySize,
  isMemoryChanged,
  resolveEditor,
  shellQuote,
} from '../src/commands/memory/memory';

describe('buildMemoryUpdate', () => {
  it('sends only the content when no name is given', () => {
    assert.deepEqual(buildMemoryUpdate('# Notes', undefined), { body: { content: '# Notes' } });
  });

  it('trims the preferred name and refuses a blank or long one', () => {
    assert.deepEqual(buildMemoryUpdate('x', '  Dani '), { body: { content: 'x', preferredName: 'Dani' } });
    assert.ok('error' in buildMemoryUpdate('x', '   '));
    assert.ok('error' in buildMemoryUpdate('x', 'n'.repeat(101)));
  });

  it('enforces the length limit before calling the server', () => {
    assert.ok('body' in buildMemoryUpdate('x'.repeat(20_000), undefined));

    const tooLong = buildMemoryUpdate('x'.repeat(20_001), undefined);

    assert.ok('error' in tooLong);
    assert.match(tooLong.error, /20,000 characters; this one has 20,001/);
    assert.ok('error' in buildMemoryUpdate('x'.repeat(11), undefined, 10));
  });
});

describe('memory helpers', () => {
  it('formats the size against the limit', () => {
    assert.equal(formatMemorySize('x'.repeat(1234)), '1,234 / 20,000 characters');
  });

  it('prefers $VISUAL, then $EDITOR, then a platform default', () => {
    assert.equal(resolveEditor({ EDITOR: 'nano', VISUAL: 'code --wait' }), 'code --wait');
    assert.equal(resolveEditor({ EDITOR: 'nano' }), 'nano');
    assert.equal(resolveEditor({ EDITOR: '  ' }, 'darwin'), 'vi');
    assert.equal(resolveEditor({}, 'win32'), 'notepad');
  });

  it('quotes paths for the shell', () => {
    assert.equal(shellQuote("/tmp/it's here/memory.md", 'linux'), `'/tmp/it'\\''s here/memory.md'`);
    assert.equal(shellQuote('C:\\Temp\\memory.md', 'win32'), '"C:\\Temp\\memory.md"');
  });

  it('ignores a trailing newline added by the editor', () => {
    assert.equal(isMemoryChanged('# Notes', '# Notes\n'), false);
    assert.equal(isMemoryChanged('# Notes', '# Notes\n- new'), true);
  });
});
