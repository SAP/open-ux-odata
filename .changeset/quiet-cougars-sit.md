---
'@sap-ux/annotation-converter': minor
'@sap-ux/vocabularies-types': minor
'@sap-ux/edmx-parser': minor
---


- NavigationPropertyBindings are now resolved by the annotation converter. This is a breaking change for consumers of types `RawSingleton` or `RawEntitySet` from package @sap-ux/vocabularies-types (the type of property `navigationPropertyBinding` changed).
- Annotations of action parameters are now also resolved for unbound actions and unbound functions. The fully-qualified name of unbound actions and unbound functions changed - they now always include their overloads. E.g., in case of unbound actions: old `myAction`, new: `myAction()` - `()` denotes the "unbound overload".
