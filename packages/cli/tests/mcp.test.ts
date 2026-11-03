import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  buildMcpUrl,
  claudeCodeArgs,
  clientTarget,
  mcpOrigin,
  mergeMcpConfig,
  shellQuote,
} from '../src/commands/mcp/config';
import { dashboardOrigin } from '../src/commands/mcp/team';
import { usagePageUrl } from '../src/commands/usage/links';

describe('mcp url', () => {
  it('derives the MCP host from the API host', () => {
    assert.equal(mcpOrigin('https://api.flexkit.io', {}), 'https://mcp.flexkit.io');
    assert.equal(mcpOrigin('https://api.flexkit.test:8443', {}), 'https://mcp.flexkit.test:8443');
    assert.equal(
      mcpOrigin('https://api.flexkit.io', { FLEXKIT_MCP_URL: 'https://mcp.example.com/' }),
      'https://mcp.example.com'
    );
  });

  it('builds account, team and project URLs', () => {
    const origin = 'https://mcp.flexkit.io';

    assert.equal(buildMcpUrl({ origin }), 'https://mcp.flexkit.io');
    assert.equal(buildMcpUrl({ origin, teamId: 'acme' }), 'https://mcp.flexkit.io/acme');
    assert.equal(
      buildMcpUrl({ origin, teamId: 'acme', projectId: 'abcdefghij' }),
      'https://mcp.flexkit.io/acme/abcdefghij'
    );
    assert.equal(
      buildMcpUrl({ origin, teamId: 'acme', projectId: 'abcdefghij', readOnly: true }),
      'https://mcp.flexkit.io/acme/abcdefghij?read_only=true'
    );
  });
});

describe('mcp client config', () => {
  const opts = { cwd: '/work/app', home: '/home/ada', platform: 'linux' as NodeJS.Platform, env: {} };

  it('locates each client config file and entry shape', () => {
    assert.deepEqual(clientTarget('cursor', 'project', 'U', opts), {
      file: path.join('/work/app', '.cursor', 'mcp.json'),
      key: 'mcpServers',
      entry: { url: 'U' },
    });
    assert.equal(clientTarget('cursor', 'user', 'U', opts).file, path.join('/home/ada', '.cursor', 'mcp.json'));
    assert.deepEqual(clientTarget('vscode', 'project', 'U', opts), {
      file: path.join('/work/app', '.vscode', 'mcp.json'),
      key: 'servers',
      entry: { type: 'http', url: 'U' },
    });
    assert.equal(
      clientTarget('vscode', 'user', 'U', { ...opts, platform: 'darwin' }).file,
      path.join('/home/ada', 'Library', 'Application Support', 'Code', 'User', 'mcp.json')
    );
    assert.equal(
      clientTarget('vscode', 'user', 'U', opts).file,
      path.join('/home/ada', '.config', 'Code', 'User', 'mcp.json')
    );
    assert.deepEqual(clientTarget('windsurf', 'user', 'U', opts), {
      file: path.join('/home/ada', '.codeium', 'windsurf', 'mcp_config.json'),
      key: 'mcpServers',
      entry: { serverUrl: 'U' },
    });
  });

  it('creates a config when there is none', () => {
    const result = mergeMcpConfig(null, 'mcpServers', 'flexkit', { url: 'U' });

    assert.equal(result.status, 'added');
    assert.ok('text' in result);
    assert.deepEqual(JSON.parse(result.text), { mcpServers: { flexkit: { url: 'U' } } });
  });

  it('keeps other servers and settings', () => {
    const existing = JSON.stringify({ theme: 'dark', mcpServers: { github: { command: 'gh-mcp' } } }, null, 4);
    const result = mergeMcpConfig(existing, 'mcpServers', 'flexkit', { url: 'U' });

    assert.equal(result.status, 'added');
    assert.ok('text' in result);
    assert.deepEqual(JSON.parse(result.text), {
      theme: 'dark',
      mcpServers: { github: { command: 'gh-mcp' }, flexkit: { url: 'U' } },
    });
    assert.match(result.text, /^ {4}"theme"/m, 'keeps the file indentation');
    assert.ok(result.text.endsWith('}\n'));
  });

  it('reports an identical entry as unchanged and a different one as a conflict', () => {
    const existing = JSON.stringify({ mcpServers: { flexkit: { url: 'U' } } });

    assert.equal(mergeMcpConfig(existing, 'mcpServers', 'flexkit', { url: 'U' }).status, 'unchanged');

    const conflict = mergeMcpConfig(existing, 'mcpServers', 'flexkit', { url: 'V' });

    assert.equal(conflict.status, 'conflict');
    assert.deepEqual(conflict.previous, { url: 'U' });

    const replaced = mergeMcpConfig(existing, 'mcpServers', 'flexkit', { url: 'V' }, { replace: true });

    assert.equal(replaced.status, 'replaced');
    assert.ok('text' in replaced);
    assert.deepEqual(JSON.parse(replaced.text), { mcpServers: { flexkit: { url: 'V' } } });
  });

  it('treats an empty file as a new config', () => {
    assert.equal(mergeMcpConfig('  \n', 'servers', 'flexkit', { type: 'http', url: 'U' }).status, 'added');
  });

  it('refuses files it cannot rewrite safely', () => {
    assert.throws(() => mergeMcpConfig('{ // comment\n "servers": {} }', 'servers', 'flexkit', {}), /not plain JSON/);
    assert.throws(() => mergeMcpConfig('[1]', 'servers', 'flexkit', {}), /JSON object/);
    assert.throws(() => mergeMcpConfig('{"servers": []}', 'servers', 'flexkit', {}), /not an object/);
  });

  it('builds the claude mcp add command', () => {
    const url = 'https://mcp.flexkit.io/acme/abcdefghij?read_only=true';

    assert.deepEqual(claudeCodeArgs('flexkit', url, 'local'), [
      'mcp',
      'add',
      '--transport',
      'http',
      '--scope',
      'local',
      'flexkit',
      url,
    ]);
    assert.equal(shellQuote(url), `'${url}'`);
    assert.equal(shellQuote('flexkit'), 'flexkit');
    assert.equal(shellQuote("it's"), `'it'\\''s'`);
  });
});

describe('usage links', () => {
  it('builds Dashboard Usage URLs', () => {
    assert.equal(dashboardOrigin('https://api.flexkit.io'), 'https://flexkit.io');
    assert.equal(
      usagePageUrl('https://flexkit.io', 'acme', 'abcdefghij'),
      'https://flexkit.io/dashboard/acme/abcdefghij/usage'
    );
    assert.equal(usagePageUrl('https://flexkit.io', 'acme'), 'https://flexkit.io/dashboard/acme/usage');
  });
});
