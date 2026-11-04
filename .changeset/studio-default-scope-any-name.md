---
'@flexkit/studio': patch
---

Desk, record forms and the Graph app now work with a default scope of any name: they find it through `isDefault` instead of expecting a scope called `default`. Projects whose default scope is named after a market (for example `eu`) no longer show "Cannot query field default", and new records are saved in that scope.
