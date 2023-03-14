# @sap-ux/annotation-converter

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
