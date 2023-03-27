---
'@sap-ux/edmx-parser': patch
---

- The parser no longer returns references representing schema aliases
- For annotations with aliased target in the input data, the parser now returns the unaliased target
