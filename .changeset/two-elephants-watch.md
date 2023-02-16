---
'@sap-ux/annotation-converter': patch
---

* Invalid paths no longer resolve to their last valid segment, but return `undefined` instead
* `undefined` is not pushed to the list of visited objects if path resolution fails 
