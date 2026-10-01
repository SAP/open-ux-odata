---
'@sap-ux/annotation-converter': patch
---

Resolve Capabilities annotations placed on container-path navigation properties. `getAnnotations()` now falls back to the container-path target form (`Namespace.Container/EntitySet/NavProp` and the singleton equivalent) when the entity-type-path lookup returns nothing.
