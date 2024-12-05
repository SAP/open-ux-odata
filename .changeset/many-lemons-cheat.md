---
'@sap-ux/annotation-converter': minor
'@sap-ux/edmx-parser': minor
---

**BREAKING CHANGE**: parser and writeback no longer incorrectly convert string Collections entries as `string`. Now returned values correctly match the `StringExpression` type and function signatures.
