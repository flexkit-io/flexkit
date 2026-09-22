import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server.js';
import { Route, Routes } from 'react-router-dom';
import { ConfigProvider, getApps, useConfig, type ConfigContext } from '../src/core/config/config-context';
import { defineExtension } from '../src/core/config/define-extension';
import type { AppOptions, ProjectOptions } from '../src/core/config/types';

const app = (name: string): AppOptions => ({
  name,
  title: name,
  component: <p>{name}</p>,
  routes: [{ path: 'edit/:id', component: <p>Edit</p> }],
});
const parentLogo = () => <span>Parent</span>;
const childLogo = () => <span>Child</span>;
const parent = defineExtension({
  id: 'acme.parent',
  name: 'Display label, not an identity',
  contributes: { apps: [app('parent')], navbar: { logo: { component: parentLogo } } },
  extensions: [
    defineExtension({
      id: 'acme.child',
      contributes: { apps: [app('child')], navbar: { logo: { component: childLogo } } },
    }),
  ],
});
const config: ProjectOptions[] = [
  { projectId: 'first', basePath: '/studio', schema: [], extensions: [parent] },
  {
    projectId: 'second',
    basePath: '/studio',
    schema: [],
    extensions: [
      { id: 'acme.group', contributes: {}, extensions: [{ id: 'acme.other', contributes: { apps: [app('other')] } }] },
    ],
  },
  { projectId: 'empty', basePath: '/studio', schema: [] },
];

function readContext(projectId: string): ConfigContext {
  let value: ConfigContext | undefined;
  function Probe() {
    value = useConfig();
    return null;
  }
  renderToStaticMarkup(
    <StaticRouter location={`/${projectId}`}>
      <Routes>
        <Route
          path="/:projectId"
          element={
            <ConfigProvider config={config}>
              <Probe />
            </ConfigProvider>
          }
        />
      </Routes>
    </StaticRouter>
  );
  assert.ok(value);
  return value;
}

test('nested extensions preserve parent-first app order and app routing identities', () => {
  const apps = getApps(config);
  assert.deepEqual(
    apps.map(({ name }) => name),
    ['parent', 'child', 'other']
  );
  assert.equal(apps[0], parent.contributes.apps[0]);
  assert.equal(apps[0].routes?.[0].path, 'edit/:id');
});

test('project selection isolates contributions and preserves override precedence', () => {
  const first = readContext('first');
  const second = readContext('second');
  assert.deepEqual(
    first.contributions.apps.map(({ name }) => name),
    ['parent', 'child']
  );
  assert.deepEqual(
    second.contributions.apps.map(({ name }) => name),
    ['other']
  );
  const logos = first.getContributionPointConfig('navbar', ['logo']) as unknown as { component: unknown }[];
  assert.deepEqual(
    logos.map(({ component }) => component),
    [parentLogo, childLogo]
  );
  assert.deepEqual(second.getContributionPointConfig('navbar', ['logo']), []);
  assert.deepEqual(
    first.extensions.map(({ id }) => id),
    ['acme.parent', 'acme.child', 'acme.group', 'acme.other']
  );
  assert.equal(first.extensions[0].name, 'Display label, not an identity');
  assert.deepEqual(
    first.projects.map(({ projectId }) => projectId),
    ['first', 'second', 'empty']
  );
});

test('empty and unknown projects have no contributed apps', () => {
  assert.deepEqual(getApps([]), []);
  assert.deepEqual(readContext('empty').contributions.apps, []);
  assert.deepEqual(readContext('unknown').contributions.apps, []);
});

test('defineExtension retains object identity', () => {
  assert.equal(defineExtension(parent), parent);
});
