# @sap-ux/annotation-converter

## 0.9.0

### Minor Changes

-   bf2b130: Proper parsing for complex expression and adjustment to the format for embedded expressions

### Patch Changes

-   Updated dependencies [bf2b130]
    -   @sap-ux/vocabularies-types@0.11.0

## 0.8.15

### Patch Changes

-   Updated dependencies [a7c29f3]
    -   @sap-ux/vocabularies-types@0.10.14

## 0.8.14

### Patch Changes

-   Updated dependencies [b1c3d54]
    -   @sap-ux/vocabularies-types@0.10.13

## 0.8.13

### Patch Changes

-   Updated dependencies [d283913]
    -   @sap-ux/vocabularies-types@0.10.12

## 0.8.12

### Patch Changes

-   Updated dependencies [af38185]
    -   @sap-ux/vocabularies-types@0.10.11

## 0.8.11

### Patch Changes

-   3c0d8bd: fix: We now keep track of the fact that the return type for a function is a collection
-   Updated dependencies [3c0d8bd]
    -   @sap-ux/vocabularies-types@0.10.10

## 0.8.10

### Patch Changes

-   Updated dependencies [1030a62]
    -   @sap-ux/vocabularies-types@0.10.9

## 0.8.9

### Patch Changes

-   Updated dependencies [f19e9b4]
    -   @sap-ux/vocabularies-types@0.10.8

## 0.8.8

### Patch Changes

-   Updated dependencies [b776b71]
    -   @sap-ux/vocabularies-types@0.10.7

## 0.8.7

### Patch Changes

-   1b25c13: Introduce a new property `forceNullableValuesToNull`
-   Updated dependencies [1b25c13]
    -   @sap-ux/vocabularies-types@0.10.6

## 0.8.6

### Patch Changes

-   Updated dependencies [bad1db5]
    -   @sap-ux/vocabularies-types@0.10.5

## 0.8.5

### Patch Changes

-   260e502: fix: The annotation converter now resolves unbound actions both with a trailing `()` and without

## 0.8.4

### Patch Changes

-   Updated dependencies [609a24a]
    -   @sap-ux/vocabularies-types@0.10.4

## 0.8.3

### Patch Changes

-   Updated dependencies [85a06d9]
    -   @sap-ux/vocabularies-types@0.10.3

## 0.8.2

### Patch Changes

-   Updated dependencies [0b08eb8]
    -   @sap-ux/vocabularies-types@0.10.2

## 0.8.1

### Patch Changes

-   Updated dependencies [2cffd38]
    -   @sap-ux/vocabularies-types@0.10.1

## 0.8.0

### Minor Changes

-   2821157: Bump version to account for new node version support

### Patch Changes

-   Updated dependencies [2821157]
    -   @sap-ux/vocabularies-types@0.10.0

## 0.7.5

### Patch Changes

-   Updated dependencies [ac518e6]
    -   @sap-ux/vocabularies-types@0.9.4

## 0.7.4

### Patch Changes

-   Updated dependencies [8a8081a]
    -   @sap-ux/vocabularies-types@0.9.3

## 0.7.3

### Patch Changes

-   Updated dependencies [39eadb1]
    -   @sap-ux/vocabularies-types@0.9.2

## 0.7.2

### Patch Changes

-   Updated dependencies [06396a1]
    -   @sap-ux/vocabularies-types@0.9.1

## 0.7.1

### Patch Changes

-   Updated dependencies [4509062]
    -   @sap-ux/vocabularies-types@0.9.0

## 0.7.0

### Minor Changes

-   e70d625: - NavigationPropertyBindings are now resolved by the annotation converter. This is a breaking change for consumers of types `RawSingleton` or `RawEntitySet` from package @sap-ux/vocabularies-types (the type of property `navigationPropertyBinding` changed).
    -   Annotations of action parameters are now also resolved for unbound actions and unbound functions. The fully-qualified name of unbound actions and unbound functions changed - they now always include their overloads. E.g., in case of unbound actions: old `myAction`, new: `myAction()` - `()` denotes the "unbound overload".

### Patch Changes

-   Updated dependencies [e70d625]
    -   @sap-ux/vocabularies-types@0.8.0

## 0.6.16

### Patch Changes

-   9475a66: - Annotations from different sources are now merged correctly even if the sources used different aliases.
    -   Aliases in the `value` property of `AnnotationTarget`s are now always expanded to the full namespace.

## 0.6.15

### Patch Changes

-   3116cd5: The annotation converter now returns the correct references

## 0.6.14

### Patch Changes

-   1fc2286: The annotation converter now ensures that references (aliases and namespaces) are unique

## 0.6.13

### Patch Changes

-   df52a22: The `$target` property of types `PropertyPath`, `NavigationPropertyPath`, `AnnotationPath` and `PathAnnotationExpression` can now be undefined
-   Updated dependencies [df52a22]
    -   @sap-ux/vocabularies-types@0.7.6

## 0.6.12

### Patch Changes

-   Updated dependencies [d1a950b]
    -   @sap-ux/vocabularies-types@0.7.5

## 0.6.11

### Patch Changes

-   5e2ff68: Resolving path now works correctly even when the namespace is the same as an entitySet

## 0.6.10

### Patch Changes

-   4c90240: fix(converter): removed strict checking for a boolean value

## 0.6.9

### Patch Changes

-   e32f68f: Unaliasing now falls back to the global namespace if an alias cannot be resolved using references

## 0.6.8

### Patch Changes

-   6c325c5: We have improved the handling of aliases

## 0.6.7

### Patch Changes

-   24d8199: The annotation converter now depends on vocabularies-types
-   Updated dependencies [24d8199]
    -   @sap-ux/vocabularies-types@0.7.4

## 0.6.6

### Patch Changes

-   9be80ce: Consider the alias when converting annotations

## 0.6.5

### Patch Changes

-   217e517: The vocabulary types now provide a complete set of vocabulary references in constant `VocabularyReferences`

## 0.6.4

### Patch Changes

-   7230a33: feat: allow to resolve entity type by their fqdn

## 0.6.3

### Patch Changes

-   e922bf7: Fix simple name resolution for action target -> unbound action

## 0.6.2

### Patch Changes

-   76b4876: \* Invalid paths no longer resolve to their last valid segment, but return `undefined` instead
    -   `undefined` is not pushed to the list of visited objects if path resolution fails

## 0.6.1

### Patch Changes

-   946cf8f: Annotations on properties of a ComplexType are now resolved

## 0.6.0

### Minor Changes

-   956ee23: The annotation converter now delays the conversion of certain elements and annotations until the converted results are requested

## 0.5.23

### Patch Changes

-   c3dfcba: The annotation converter now resolves annotations of unbound actions

## 0.5.22

### Patch Changes

-   b408038: DataFieldForAction annotations are now resolved correctly if the action is bound to a different entity type

## 0.5.21

### Patch Changes

-   3e1eea4: Inferred types for sub object are now properly assigned

## 0.5.20

### Patch Changes

-   29a4f8c: feat: support reverting primitive object to its raw type

## 0.5.19

### Patch Changes

-   fe8374c: feat: add support for ActionImport and FunctionImport

## 0.5.18

### Patch Changes

-   dde9115: Improve singleton support

## 0.5.17

### Patch Changes

-   18aee1c: fix: Remove the unused 'isEntitySet' property from the ActionParameter type

## 0.5.16

### Patch Changes

-   e2bd72a: Singleton are properly resolved through the resolvePath method

## 0.5.15

### Patch Changes

-   747c020: feat: add flag for collection-valued action parameters

## 0.5.14

### Patch Changes

-   3f461ec: fix: resolve static action targets

## 0.5.13

### Patch Changes

-   de0498f: Handle the case where the annotation result is null

## 0.5.12

### Patch Changes

-   64a0fdf: Improve v2 services support

## 0.5.11

### Patch Changes

-   a5b4df9: Make sure annotations object is defined like the type says

## 0.5.10

### Patch Changes

-   0f7acf2: Improve type definition to be more consistent with the output

## 0.5.9

### Patch Changes

-   069270b: Initial open source release of the SAP UX FE Mockserver

## 0.5.8

### Patch Changes

-   591a801: Ensure converted entity types comply to the type definition

## 0.5.7

### Patch Changes

-   2ab7e09: Fix an issue with incorrect annotation format

## 0.5.6

### Patch Changes

-   0dc370d: fix: annotation source definition in all cases

## 0.5.5

### Patch Changes

-   5d321f3: fix: make sure the annotation source is consistent

## 0.5.4

### Patch Changes

-   412c6a8: fix: embedded annotation should not be taken to top level

## 0.5.3

### Patch Changes

-   b7bd95f: The description and content of the package was ajusted

## 0.5.2

### Patch Changes

-   3ed5c7c: Add support for parsing sap\* inline annotations for entity types
