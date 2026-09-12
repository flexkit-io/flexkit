---
"@flexkit/studio": patch
"@flexkit/desk": patch
"@flexkit/explorer": patch
"@flexkit/asset-manager": patch
"@flexkit/ai": patch
"@flexkit/cli": patch
---

Patch security dependencies across the workspace.

- Pin `svgo` to 4.1.0 (GHSA-2p49-hgcm-8545, GHSA-w27v-7q3p-w38r)
- Pin `brace-expansion` to 1.1.18 and 5.0.9 (GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895)
- Pin `seroval` to >=1.5.6 (GHSA-mv8w-475r-vwqw)
- Upgrade Next.js to 16.3.5 (GHSA-p293-qw3h-jr36, GHSA-2xp9-vwfh-vxw4)
- Upgrade Astro to 7.3.2
- Upgrade Vitest to 3.2.6 (GHSA-5xrq-8626-4rwp)
