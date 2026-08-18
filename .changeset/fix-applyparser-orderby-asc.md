---
"@sap-ux/fe-mockserver-core": patch
---

Fix `$apply=orderby(<prop> asc)` throwing `Parsing errors detected`. The lexer emitted `SimpleIdentifier` for `asc` instead of `AscDesc` because `AS_TOKEN` was listed before `ASCDESC` in `applyTokens`; `AS_TOKEN`'s `longer_alt` extended a two-char `as` match to consume `asc` before `ASCDESC` was tried. `desc` was unaffected. This broke every OData v4 hierarchical list binding with a client-side `$orderby=<prop>` (v4 folds those into `$apply=orderby(<prop> asc)/TopLevels(...)`).
