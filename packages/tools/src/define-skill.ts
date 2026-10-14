import type { FlexkitSkill } from './types';

export const MAX_SKILL_NAME_LENGTH = 120;
export const MAX_SKILL_DESCRIPTION_LENGTH = 500;
export const MAX_SKILL_CONTENT_LENGTH = 50_000;

export type { FlexkitSkill };

function requireValue(value: string, field: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`Custom skill ${field} is required.`);
  }

  return trimmed;
}

/**
 * Defines a version-controlled skill exposed through the Flexkit API handler.
 *
 * The skill name is its sync identity. Renaming it creates a new skill in
 * Flexkit and removes the old one, including its automation attachments.
 */
export function defineSkill(options: {
  content: string;
  description: string;
  name: string;
  space?: string;
}): FlexkitSkill {
  const name = requireValue(options.name, 'name');
  const description = requireValue(options.description, `"${name}" description`);
  const content = requireValue(options.content, `"${name}" content`);
  const space = options.space === undefined ? undefined : requireValue(options.space, `"${name}" space`);

  if (name.length > MAX_SKILL_NAME_LENGTH) {
    throw new Error(`Custom skill name must be at most ${String(MAX_SKILL_NAME_LENGTH)} characters.`);
  }

  if (description.length > MAX_SKILL_DESCRIPTION_LENGTH) {
    throw new Error(
      `Custom skill "${name}" description must be at most ${String(MAX_SKILL_DESCRIPTION_LENGTH)} characters.`
    );
  }

  if (content.length > MAX_SKILL_CONTENT_LENGTH) {
    throw new Error(`Custom skill "${name}" content must be at most ${String(MAX_SKILL_CONTENT_LENGTH)} characters.`);
  }

  return {
    content,
    description,
    name,
    ...(space === undefined ? {} : { space }),
  };
}

export function assertUniqueSkillNames(skills: FlexkitSkill[]): void {
  const names = new Set<string>();

  for (const skill of skills) {
    if (names.has(skill.name)) {
      throw new Error(`Duplicate custom skill name "${skill.name}".`);
    }

    names.add(skill.name);
  }
}
