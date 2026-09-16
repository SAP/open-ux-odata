---
'@sap-ux/fe-mockserver-core': patch
---

fix: propagate DraftAdministrativeData on draftEdit and return 200 for null navigation properties

- draftEdit now copies DraftAdministrativeData onto the active entity so GET Active/DraftAdministrativeData returns data instead of null
- draftDiscard now resets DraftAdministrativeData to null on the active entity
- Navigation paths that resolve to null now return HTTP 200 instead of 404, consistent with the OData spec
