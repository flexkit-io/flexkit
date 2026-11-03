import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assignPullFilenames,
  formatFrontMatterValue,
  nameFromFilename,
  parseFrontMatter,
  parseSkillMarkdown,
  planSkillPush,
  skillToMarkdown,
  slugifySkillName,
  toSkillInput,
  type LocalSkill,
  type SkillDto,
} from '../src/commands/skills/markdown';

function remote(overrides: Partial<SkillDto>): SkillDto {
  return {
    content: 'Do the thing.',
    createdAt: '2026-10-01T00:00:00Z',
    createdBy: 'user-1',
    description: 'When to do the thing',
    id: 'id-1',
    logoUrl: null,
    name: 'thing',
    projectId: 'proj',
    source: 'studio',
    spaceId: null,
    updatedAt: '2026-10-02T00:00:00Z',
    visibility: 'project',
    ...overrides,
  };
}

function local(overrides: Partial<LocalSkill>): LocalSkill {
  return {
    file: 'thing.md',
    name: 'thing',
    description: 'When to do the thing',
    content: 'Do the thing.',
    ...overrides,
  };
}

describe('parseFrontMatter', () => {
  it('returns the whole text as body without front matter', () => {
    assert.deepEqual(parseFrontMatter('# Title\n\nBody'), { data: {}, body: '# Title\n\nBody', hasFrontMatter: false });
  });

  it('parses plain, quoted and commented values', () => {
    const doc = parseFrontMatter(
      [
        '---',
        '# comment',
        'name: refund-policy',
        'description: "Use when: a customer asks for a refund"',
        "title: 'It''s quoted'",
        'visibility: project # trailing comment',
        '---',
        '',
        'Body text',
      ].join('\r\n')
    );

    assert.deepEqual(doc.data, {
      name: 'refund-policy',
      description: 'Use when: a customer asks for a refund',
      title: "It's quoted",
      visibility: 'project',
    });
    assert.equal(doc.body, 'Body text');
  });

  it('parses literal and folded block scalars', () => {
    const doc = parseFrontMatter(
      [
        '---',
        'description: >',
        '  Line one',
        '  continues.',
        '',
        '  Second paragraph.',
        'notes: |',
        '  a',
        '    b',
        '---',
        'x',
      ].join('\n')
    );

    assert.equal(doc.data.description, 'Line one continues.\nSecond paragraph.');
    assert.equal(doc.data.notes, 'a\n  b');
  });

  it('rejects unclosed front matter and malformed lines', () => {
    assert.throws(() => parseFrontMatter('---\nname: a\n'), /never closed/);
    assert.throws(() => parseFrontMatter('---\njust text\n---\n'), /line 2/);
  });
});

describe('front matter serialization', () => {
  it('quotes only values YAML would misread', () => {
    assert.equal(formatFrontMatterValue('refund-policy'), 'refund-policy');
    assert.equal(formatFrontMatterValue('Use when: refunds'), '"Use when: refunds"');
    assert.equal(formatFrontMatterValue('yes'), '"yes"');
    assert.equal(formatFrontMatterValue('2026 plan'), '"2026 plan"');
    assert.equal(formatFrontMatterValue('# heading'), '"# heading"');
    assert.equal(formatFrontMatterValue('a\nb'), '"a\\nb"');
  });

  it('round-trips a skill through Markdown', () => {
    const skill = remote({
      id: 'abc',
      name: 'shopify/order-lookup',
      description: 'Look up orders: by number, email or "name"',
      content: '# Steps\n\n1. Search.\n2. Report.\n',
      visibility: 'space',
      spaceId: 'space-9',
    });
    const text = skillToMarkdown(skill);
    const parsed = parseSkillMarkdown(text, 'order.md');

    assert.ok(text.startsWith('---\nid: abc\nname: shopify/order-lookup\n'));
    assert.deepEqual(parsed, {
      file: 'order.md',
      id: 'abc',
      name: skill.name,
      description: skill.description,
      visibility: 'space',
      spaceId: 'space-9',
      content: '# Steps\n\n1. Search.\n2. Report.',
    });
  });

  it('leaves out the space unless the skill is space-scoped', () => {
    assert.ok(!skillToMarkdown(remote({ spaceId: 'leftover' })).includes('space:'));
  });

  it('rejects an unknown visibility', () => {
    assert.throws(() => parseSkillMarkdown('---\nvisibility: everyone\n---\nx', 'a.md'), /visibility must be one of/);
  });
});

describe('names and files', () => {
  it('slugifies names', () => {
    assert.equal(slugifySkillName('Refund Policy (EU)'), 'refund-policy-eu');
    assert.equal(slugifySkillName('shopify/order-lookup'), 'shopify-order-lookup');
    assert.equal(slugifySkillName('Čeština'), 'cestina');
    assert.equal(slugifySkillName('!!!'), 'skill');
  });

  it('derives a name from a file name', () => {
    assert.equal(nameFromFilename('/x/skills/refund-policy.md'), 'refund-policy');
    assert.equal(nameFromFilename('notes.markdown'), 'notes');
  });

  it('keeps files by id, then by name, and never overwrites other files', () => {
    const files = assignPullFilenames(
      [
        { id: 'a', name: 'Refunds renamed' },
        { id: 'b', name: 'Onboarding' },
        { id: 'c', name: 'Refunds' },
        { id: 'd', name: 'refunds!' },
      ],
      new Map([['a', 'refunds.md']]),
      new Map([
        ['onboarding', 'my-onboarding.md'],
        ['other', 'refunds-2.md'],
      ])
    );

    assert.equal(files.get('a'), 'refunds.md');
    assert.equal(files.get('b'), 'my-onboarding.md');
    assert.equal(files.get('c'), 'refunds-3.md');
    assert.equal(files.get('d'), 'refunds-4.md');
  });
});

describe('toSkillInput', () => {
  it('fills missing fields from the remote skill or defaults', () => {
    assert.deepEqual(toSkillInput({ file: 'x/new-skill.md', content: 'C', description: 'D' }), {
      name: 'new-skill',
      description: 'D',
      content: 'C',
      visibility: 'project',
      spaceId: null,
    });
    assert.deepEqual(
      toSkillInput(
        { file: 'a.md', content: 'C' },
        remote({ visibility: 'space', spaceId: 's1', name: 'a', description: 'R' })
      ),
      { name: 'a', description: 'R', content: 'C', visibility: 'space', spaceId: 's1' }
    );
  });
});

describe('planSkillPush', () => {
  it('creates, updates and keeps unchanged skills', () => {
    const plan = planSkillPush(
      [
        local({ file: 'new.md', name: 'new', description: 'New one' }),
        local({ file: 'thing.md', content: 'Do the thing better.' }),
        local({ file: 'same.md', name: 'Same' }),
      ],
      [remote({}), remote({ id: 'id-2', name: 'same' })]
    );

    assert.deepEqual(
      plan.actions.map((action) => action.type),
      ['create', 'update', 'update']
    );
  });

  it('matches by id before name and detects no-op pushes', () => {
    const plan = planSkillPush(
      [local({ file: 'renamed.md', id: 'id-1', name: 'thing' })],
      [remote({}), remote({ id: 'id-2', name: 'other' })]
    );

    assert.equal(plan.actions[0]?.type, 'unchanged');
    assert.deepEqual(
      plan.unmatched.map((skill) => skill.id),
      ['id-2']
    );
  });

  it('renames by id when the new name is free and refuses a clash', () => {
    const renamed = planSkillPush([local({ id: 'id-1', name: 'thing-v2' })], [remote({})]);

    assert.equal(renamed.actions[0]?.type, 'update');

    const clash = planSkillPush(
      [local({ id: 'id-1', name: 'taken' })],
      [remote({}), remote({ id: 'id-2', name: 'Taken', source: 'code' })]
    );

    assert.equal(clash.actions[0]?.type, 'skip');
  });

  it('skips code and plugin skills', () => {
    const plan = planSkillPush(
      [local({ name: 'catalog-review' }), local({ file: 'p.md', name: 'shopify/orders' })],
      [
        remote({ id: 'c', name: 'catalog-review', source: 'code' }),
        remote({ id: 'p', name: 'shopify/orders', source: 'plugin' }),
      ]
    );

    assert.deepEqual(
      plan.actions.map((action) => (action.type === 'skip' ? action.reason : action.type)),
      ['"catalog-review" is managed by code (flexkit.tools.ts)', '"shopify/orders" is managed by a plugin']
    );
    assert.equal(plan.unmatched.length, 0);
  });

  it('reports invalid files and duplicate names', () => {
    const plan = planSkillPush(
      [
        local({ file: 'a.md', description: undefined }),
        local({ file: 'b.md', name: 'x' }),
        local({ file: 'c.md', name: 'X' }),
      ],
      []
    );

    assert.deepEqual(
      plan.actions.map((action) => action.type),
      ['invalid', 'create', 'invalid']
    );
  });

  it('deletes unmatched Studio skills only with prune', () => {
    const remotes = [remote({ id: 'gone', name: 'gone' }), remote({ id: 'code', name: 'code', source: 'code' })];

    assert.equal(planSkillPush([], remotes).actions.length, 0);
    assert.deepEqual(
      planSkillPush([], remotes, { prune: true }).actions.map((action) =>
        action.type === 'delete' ? action.remote.id : ''
      ),
      ['gone']
    );
  });
});
