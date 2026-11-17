import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { httpsLinkUrl, noticeMessageParts } from '../../src/apps/ai/plugin-setup-notice-parts';

describe('plugin setup notice', () => {
  it('sets URLs in the message apart, without trailing punctuation', () => {
    assert.deepEqual(noticeMessageParts('Add https://flexkit.io/plugins/oauth/mcp/callback, then connect.'), [
      { text: 'Add ', url: false },
      { text: 'https://flexkit.io/plugins/oauth/mcp/callback', url: true },
      { text: ', then connect.', url: false },
    ]);
    assert.deepEqual(noticeMessageParts('Allow https://example.test/callback.'), [
      { text: 'Allow ', url: false },
      { text: 'https://example.test/callback', url: true },
      { text: '.', url: false },
    ]);
  });

  it('keeps a message without URLs as one run of text', () => {
    assert.deepEqual(noticeMessageParts('Ask an admin first.'), [{ text: 'Ask an admin first.', url: false }]);
  });

  it('only links to https URLs', () => {
    assert.equal(httpsLinkUrl('https://support.atlassian.com/docs'), 'https://support.atlassian.com/docs');
    assert.equal(httpsLinkUrl('http://example.test'), null);
    assert.equal(httpsLinkUrl('javascript:alert(1)'), null);
    assert.equal(httpsLinkUrl('not a url'), null);
  });
});
