---
'@flexkit/cli': patch
---

`flexkit login` no longer offers Bitbucket, which Flexkit has stopped supporting as a login provider. The interactive prompt lists GitHub, Google and Email. `flexkit login --bitbucket` now exits with a message that points to the other options instead of opening a login page that no longer exists.
