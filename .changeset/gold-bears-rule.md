---
'@sap-ux/fe-mockserver-core': patch
---

`getData` throws `Error: Cannot read properties of undefined (reading 'forEach')` when the entity is a draft and `IsActiveEntity` is set to `false` for all mock data entries.
