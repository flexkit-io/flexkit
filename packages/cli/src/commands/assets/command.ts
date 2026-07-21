import type { Command } from '../help';

export const assetsUploadCommand: Command = {
  name: 'upload',
  description: 'Upload files or URLs as project assets. Identical files are deduplicated by content hash.',
  arguments: [
    {
      name: 'path|url',
      required: true,
    },
  ],
  options: [
    {
      name: 'project',
      shorthand: null,
      type: String,
      argument: 'ID',
      description: 'Project id (required when the local config defines several projects)',
      deprecated: false,
    },
    {
      name: 'concurrency',
      shorthand: null,
      type: Number,
      argument: 'N',
      description: 'Number of parallel uploads (default 5)',
      deprecated: false,
    },
    {
      name: 'id-from',
      shorthand: null,
      type: String,
      argument: 'STRATEGY',
      description: 'Derive deterministic asset _ids: "filename" or "hash"',
      deprecated: false,
    },
    {
      name: 'tag',
      shorthand: null,
      type: String,
      argument: 'NAME',
      description: 'Tag every uploaded asset with the given tag (created if missing)',
      deprecated: false,
    },
    {
      name: 'json',
      shorthand: null,
      type: String,
      description: 'Output created assets as NDJSON on stdout',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'Upload a folder of images',
      value: 'flexkit assets upload ./images',
    },
    {
      name: 'Upload files and a remote URL with a tag',
      value: 'flexkit assets upload hero.png https://example.com/logo.svg --tag branding',
    },
    {
      name: 'Upload with deterministic ids derived from filenames',
      value: 'flexkit assets upload ./icons --id-from filename',
    },
  ],
};

export const assetsExportCommand: Command = {
  name: 'export',
  description: 'Export all project assets (files + metadata) into a tarball that can be re-imported.',
  arguments: [
    {
      name: 'dest.tar.gz',
      required: false,
    },
  ],
  options: [
    {
      name: 'project',
      shorthand: null,
      type: String,
      argument: 'ID',
      description: 'Project id (required when the local config defines several projects)',
      deprecated: false,
    },
    {
      name: 'tag',
      shorthand: null,
      type: String,
      argument: 'NAME',
      description: 'Only export assets with the given tag',
      deprecated: false,
    },
    {
      name: 'concurrency',
      shorthand: null,
      type: Number,
      argument: 'N',
      description: 'Number of parallel downloads (default 5)',
      deprecated: false,
    },
    {
      name: 'overwrite',
      shorthand: null,
      type: String,
      description: 'Overwrite the destination file if it exists',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'Export all assets',
      value: 'flexkit assets export',
    },
    {
      name: 'Export assets with a tag to a specific file',
      value: 'flexkit assets export branding.tar.gz --tag branding',
    },
  ],
};

export const assetsCommand: Command = {
  name: 'assets',
  description: 'Manage project assets.',
  arguments: [],
  subcommands: [assetsUploadCommand, assetsExportCommand],
  options: [],
  examples: [
    {
      name: 'Upload a folder of images',
      value: 'flexkit assets upload ./images',
    },
    {
      name: 'Export all assets to a tarball',
      value: 'flexkit assets export',
    },
  ],
};
