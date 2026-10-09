---
'@sap-ux/edmx-parser': patch
---

Throw a descriptive error instead of a generic TypeError when the EDMX root is not `edmx:Edmx` or is missing `edmx:DataServices`.
