---
'@sap-ux/annotation-converter': patch
---

- Annotations from different sources are now merged correctly even if the sources used different aliases.
- Aliases in the `value` property of `AnnotationTarget`s are now always expanded to the full namespace.  
