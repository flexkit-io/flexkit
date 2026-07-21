---
'@flexkit/cli': patch
'@flexkit/studio': patch
'@flexkit/asset-manager': patch
---

Add a CLI asset import/export pipeline and migrate uploads to the one-shot assets endpoint.

- CLI: new `flexkit assets upload` (files, directories, URLs, `--id-from`, `--tag`, `--json`), `flexkit import` (NDJSON/directory/tarball with `_asset` and `_ref` references, `--dry-run`, `--skip-existing`/`--replace`) and `flexkit export` / `flexkit assets export` (round-trippable tarballs with `data.ndjson`, `assets.ndjson` and files).
- Studio: uploads now go through the single `POST /assets` endpoint which stores the blob and creates the asset node (deduplicated by content hash) in one request; entity saves connect assets by `_id` instead of nested create/update.
- Asset Manager: per-row actions with Copy ID and Copy URL.
