---
'@sap-ux/fe-mockserver-core': patch
---

fix: PATCH on a keyed collection navigation (e.g. `RootEntity(key)/_Child(childKey)`) now updates the addressed child entity in its own entity set instead of overwriting the parent's navigation property and ignoring the child key
