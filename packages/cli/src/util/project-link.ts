import fs from 'node:fs';
import path from 'node:path';

export const LINK_DIR = '.flexkit';
export const LINK_FILE = 'project.json';

export interface ProjectLink {
  projectId: string;
  projectName?: string;
  teamId?: string;
  teamName?: string;
}

export interface FoundProjectLink {
  link: ProjectLink;
  /** Absolute path of the `.flexkit/project.json` file. */
  file: string;
}

export function getLinkFilePath(dir: string): string {
  return path.join(dir, LINK_DIR, LINK_FILE);
}

function parseLink(raw: string): ProjectLink | null {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const { projectId, projectName, teamId, teamName } = parsed as Record<string, unknown>;

    if (typeof projectId !== 'string' || projectId.length === 0) {
      return null;
    }

    return {
      projectId,
      ...(typeof projectName === 'string' ? { projectName } : {}),
      ...(typeof teamId === 'string' ? { teamId } : {}),
      ...(typeof teamName === 'string' ? { teamName } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Finds the nearest `.flexkit/project.json`, walking up from `startDir` to the
 * filesystem root, so commands run from a subfolder of a linked project too.
 */
export function findProjectLink(startDir: string): FoundProjectLink | null {
  let dir = path.resolve(startDir);

  for (;;) {
    const file = getLinkFilePath(dir);

    if (fs.existsSync(file)) {
      const link = parseLink(fs.readFileSync(file, 'utf8'));

      return link ? { link, file } : null;
    }

    const parent = path.dirname(dir);

    if (parent === dir) {
      return null;
    }

    dir = parent;
  }
}

/**
 * Writes `.flexkit/project.json` in `dir` and adds `.flexkit` to the folder's
 * `.gitignore` when one exists, so the link stays local like Vercel's `.vercel`.
 */
export function writeProjectLink(dir: string, link: ProjectLink): { file: string; gitignoreUpdated: boolean } {
  const file = getLinkFilePath(dir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(link, null, 2)}\n`);
  fs.writeFileSync(
    path.join(dir, LINK_DIR, 'README.txt'),
    '> Why do I have a folder named ".flexkit" in my project?\nThe ".flexkit" folder is created when you link a directory to a Flexkit project.\n\n> What does "project.json" contain?\nThe id and name of the linked Flexkit project, so commands know which project to use.\n\n> Should I commit the ".flexkit" folder?\nNo. It is local to your machine; `flexkit link` adds it to .gitignore.\n'
  );

  return { file, gitignoreUpdated: ensureGitignored(dir) };
}

function ensureGitignored(dir: string): boolean {
  const gitignore = path.join(dir, '.gitignore');
  const hasGit = fs.existsSync(path.join(dir, '.git'));

  if (!fs.existsSync(gitignore) && !hasGit) {
    return false;
  }

  const current = fs.existsSync(gitignore) ? fs.readFileSync(gitignore, 'utf8') : '';
  const lines = current.split(/\r?\n/).map((line) => line.trim());

  if (lines.includes('.flexkit') || lines.includes('.flexkit/') || lines.includes('/.flexkit')) {
    return false;
  }

  const prefix = current.length > 0 && !current.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(gitignore, `${current}${prefix}.flexkit\n`);

  return true;
}

/** Removes the link file (and the `.flexkit` folder when nothing else is left in it). */
export function removeProjectLink(found: FoundProjectLink): void {
  fs.rmSync(found.file, { force: true });
  const dir = path.dirname(found.file);
  fs.rmSync(path.join(dir, 'README.txt'), { force: true });

  try {
    if (fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
    }
  } catch {
    // The folder is already gone or not empty; nothing else to clean.
  }
}
