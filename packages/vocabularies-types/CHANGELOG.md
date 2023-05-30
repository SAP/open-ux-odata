# @sap-ux/vocabularies-types

## 0.8.0

### Minor Changes

-   e70d625: - NavigationPropertyBindings are now resolved by the annotation converter. This is a breaking change for consumers of types `RawSingleton` or `RawEntitySet` from package @sap-ux/vocabularies-types (the type of property `navigationPropertyBinding` changed).
    -   Annotations of action parameters are now also resolved for unbound actions and unbound functions. The fully-qualified name of unbound actions and unbound functions changed - they now always include their overloads. E.g., in case of unbound actions: old `myAction`, new: `myAction()` - `()` denotes the "unbound overload".

## 0.7.6

### Patch Changes

-   df52a22: The `$target` property of types `PropertyPath`, `NavigationPropertyPath`, `AnnotationPath` and `PathAnnotationExpression` can now be undefined

## 0.7.5

### Patch Changes

-   d1a950b: Adjusted the type for the ActionParameters

## 0.7.4

### Patch Changes

-   24d8199: The annotation converter now depends on vocabularies-types

## 0.7.3

### Patch Changes

-   217e517: The vocabulary types now provide a complete set of vocabulary references in constant `VocabularyReferences`

## 0.7.2

### Patch Changes

-   7230a33: feat: allow to resolve entity type by their fqdn

## 0.7.1

### Patch Changes

-   2df59c3: ActionImport and TypeDefinition added to type ServiceObjects

## 0.7.0

### Minor Changes

-   956ee23: The annotation converter now delays the conversion of certain elements and annotations until the converted results are requested

## 0.6.9

### Patch Changes

-   62963f0: Improve the types for enum values and add support for qualifier values

## 0.6.8

### Patch Changes

-   29a4f8c: feat: support reverting primitive object to its raw type

## 0.6.7

### Patch Changes

-   9d32f37: Various fixes

## 0.6.6

### Patch Changes

-   93db8e0: Upgrade types

## 0.6.5

### Patch Changes

-   fe8374c: feat: add support for ActionImport and FunctionImport

## 0.6.4

### Patch Changes

-   dde9115: Improve singleton support

## 0.6.3

### Patch Changes

-   18aee1c: fix: Remove the unused 'isEntitySet' property from the ActionParameter type

## 0.6.2

### Patch Changes

-   3b9ce6d: Slight adjustment to the type for the conditional expressions

## 0.6.1

### Patch Changes

-   747c020: feat: add flag for collection-valued action parameters

## 0.6.0

### Minor Changes

-   0f7acf2: Improve type definition to be more consistent with the output

## 0.5.7

### Patch Changes

-   1797017: Exposes the enum for those not using typescript to compile their app

## 0.5.6

### Patch Changes

-   069270b: Initial open source release of the SAP UX FE Mockserver

## 0.5.5

### Patch Changes

-   073a25e: Align with latest vocabularies

## 0.5.4

### Patch Changes

-   412c6a8: fix: embedded annotation should not be taken to top level

## 0.5.3

### Patch Changes

-   b7bd95f: The description and content of the package was ajusted

## 0.5.2

### Patch Changes

-   3ed5c7c: Add support for parsing sap\* inline annotations for entity types

## 0.5.1

### Patch Changes

-   f1e5c5f: Initial version of modules
