# @sap-ux/edmx-parser

## 0.9.5

### Patch Changes

-   b2faf65: We now also support variable scale

## 0.9.4

### Patch Changes

-   b937f0b: Fix for maxLength = 'max'

## 0.9.3

### Patch Changes

-   97a8efc: Ensure we ignore the comments inside after parsing

## 0.9.2

### Patch Changes

-   be78dde: Ignore trailing text content during parsing of expressions

## 0.9.1

### Patch Changes

-   95bbfae: handle odata v4 minor versions - fix "Unsupported EDMX version:" message

## 0.9.0

### Minor Changes

-   d581d62: **BREAKING CHANGE**: parser and writeback no longer incorrectly convert string Collections entries as `string`. Now returned values correctly match the `StringExpression` type and function signatures.

## 0.8.2

### Patch Changes

-   cdce1a0: fix: improve support for Edm.Double

## 0.8.1

### Patch Changes

-   7899cab: Fix $Path

## 0.8.0

### Minor Changes

-   bf2b130: Proper parsing for complex expression and adjustment to the format for embedded expressions

## 0.7.1

### Patch Changes

-   1b25c13: Introduce a new property `forceNullableValuesToNull`

## 0.7.0

### Minor Changes

-   2821157: Bump version to account for new node version support

## 0.6.0

### Minor Changes

-   e70d625: - NavigationPropertyBindings are now resolved by the annotation converter. This is a breaking change for consumers of types `RawSingleton` or `RawEntitySet` from package @sap-ux/vocabularies-types (the type of property `navigationPropertyBinding` changed).
    -   Annotations of action parameters are now also resolved for unbound actions and unbound functions. The fully-qualified name of unbound actions and unbound functions changed - they now always include their overloads. E.g., in case of unbound actions: old `myAction`, new: `myAction()` - `()` denotes the "unbound overload".

## 0.5.16

### Patch Changes

-   3116cd5: The annotation converter now returns the correct references

## 0.5.15

### Patch Changes

-   1fc2286: The annotation converter now ensures that references (aliases and namespaces) are unique

## 0.5.14

### Patch Changes

-   e32f68f: - The parser no longer returns references representing schema aliases
    -   For annotations with aliased target in the input data, the parser now returns the unaliased target

## 0.5.13

### Patch Changes

-   29a4f8c: feat: support reverting primitive object to its raw type

## 0.5.12

### Patch Changes

-   4543b01: Fix an issue with the ActionImport type

## 0.5.11

### Patch Changes

-   fe8374c: feat: add support for ActionImport and FunctionImport

## 0.5.10

### Patch Changes

-   dde9115: Improve singleton support

## 0.5.9

### Patch Changes

-   18aee1c: fix: Remove the unused 'isEntitySet' property from the ActionParameter type

## 0.5.8

### Patch Changes

-   e2bd72a: Singleton are properly resolved through the resolvePath method

## 0.5.7

### Patch Changes

-   747c020: feat: add flag for collection-valued action parameters

## 0.5.6

### Patch Changes

-   64a0fdf: Improve v2 services support

## 0.5.5

### Patch Changes

-   069270b: Initial open source release of the SAP UX FE Mockserver

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
