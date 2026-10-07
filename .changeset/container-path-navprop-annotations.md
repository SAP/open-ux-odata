---
'@sap-ux/annotation-converter': patch
---

fix: resolve annotations on container-path navigation properties

`getAnnotations()` now falls back to the container-path target form
(`Namespace.Container/EntitySet/NavProp` and the singleton equivalent) when the
entity-type-path lookup returns no annotations. This ensures `Capabilities`
restrictions (e.g. `DeleteRestrictions`/`UpdateRestrictions`) placed on containment
navigation properties are correctly resolved.
