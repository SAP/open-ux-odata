# @sap-ux/fe-mockserver-core

## 1.1.37

### Patch Changes

-   Updated dependencies [29a4f8c]
    -   @sap-ux/annotation-converter@0.5.20
    -   @sap-ux/edmx-parser@0.5.13

## 1.1.36

### Patch Changes

-   4543b01: The substringof function is now supported
-   Updated dependencies [4543b01]
    -   @sap-ux/edmx-parser@0.5.12
    -   @sap-ux/annotation-converter@0.5.19

## 1.1.35

### Patch Changes

-   7b9c840: Allow usage of sap-client in order to determine tenant id

## 1.1.34

### Patch Changes

-   9d32f37: Various fixes
    -   @sap-ux/annotation-converter@0.5.19
    -   @sap-ux/edmx-parser@0.5.11

## 1.1.33

### Patch Changes

-   3f2940b: Key containing the `/` character now work properly

## 1.1.32

### Patch Changes

-   e11bb40: Ensure DraftAdministrativeData is defined for newly created draft

## 1.1.31

### Patch Changes

-   d0aaa4c: Reduce logging of data access debug messages (if debug=false)

## 1.1.30

### Patch Changes

-   3fd3eec: Fix POST / PUT without $batch request

## 1.1.29

### Patch Changes

-   076569b: According to the draft choreography the HasDraftEntity property needs to be false on newly created items

## 1.1.28

### Patch Changes

-   4d7cf9c: Add support for the base API in the mock entitycontainer file

## 1.1.27

### Patch Changes

-   e501c2e: Add support for nested transformation functions

## 1.1.26

### Patch Changes

-   87a9bf0: Draft Activate now properly respect passed query parameters

## 1.1.25

### Patch Changes

-   172238c: Content-Type is now properly set on errors

## 1.1.24

### Patch Changes

-   1d0ea1c: Nested expand now behaves correctly for v2 application

## 1.1.23

### Patch Changes

-   bd259d9: Singleton property can now be queried individually

## 1.1.22

### Patch Changes

-   45bfb2c: fix: 1 to 1 navigation was not respecting draft status

## 1.1.21

### Patch Changes

-   c5cd829: Set the DraftAdministrativeData to null on activate

## 1.1.20

### Patch Changes

-   455030e: OData keys can contain weird symbol and require to be decoded

## 1.1.19

### Patch Changes

-   546fcdd: Make sure the 404 is returned for null values on GET

## 1.1.18

### Patch Changes

-   2e09bdc: Ensure that non nullable properties are defined

## 1.1.17

### Patch Changes

-   fe8374c: feat: add support for ActionImport and FunctionImport
-   Updated dependencies [fe8374c]
    -   @sap-ux/annotation-converter@0.5.19
    -   @sap-ux/edmx-parser@0.5.11

## 1.1.16

### Patch Changes

-   dde9115: Improve singleton support
-   Updated dependencies [dde9115]
    -   @sap-ux/annotation-converter@0.5.18
    -   @sap-ux/edmx-parser@0.5.10

## 1.1.15

### Patch Changes

-   Updated dependencies [18aee1c]
    -   @sap-ux/annotation-converter@0.5.17
    -   @sap-ux/edmx-parser@0.5.9

## 1.1.14

### Patch Changes

-   Updated dependencies [e2bd72a]
    -   @sap-ux/annotation-converter@0.5.16
    -   @sap-ux/edmx-parser@0.5.8

## 1.1.13

### Patch Changes

-   86932ff: Unbound Action are now correctly forwarded to custom handlers

## 1.1.12

### Patch Changes

-   Updated dependencies [747c020]
    -   @sap-ux/edmx-parser@0.5.7
    -   @sap-ux/annotation-converter@0.5.15

## 1.1.11

### Patch Changes

-   Updated dependencies [3f461ec]
    -   @sap-ux/annotation-converter@0.5.14

## 1.1.10

### Patch Changes

-   Updated dependencies [de0498f]
    -   @sap-ux/annotation-converter@0.5.13

## 1.1.9

### Patch Changes

-   64a0fdf: Improve v2 services support
-   Updated dependencies [64a0fdf]
    -   @sap-ux/annotation-converter@0.5.12
    -   @sap-ux/edmx-parser@0.5.6

## 1.1.8

### Patch Changes

-   Updated dependencies [a5b4df9]
    -   @sap-ux/annotation-converter@0.5.11

## 1.1.7

### Patch Changes

-   4c8a147: '204' response will no longer contain an empty data object

## 1.1.6

### Patch Changes

-   Updated dependencies [0f7acf2]
    -   @sap-ux/annotation-converter@0.5.10
    -   @sap-ux/edmx-parser@0.5.5

## 1.1.5

### Patch Changes

-   3d65cc0: Default mockdata folder to the folder containing the metadata if missing

## 1.1.4

### Patch Changes

-   715790c: Boolean keys are now working correctly

## 1.1.3

### Patch Changes

-   987d74e: The urlPath for annotation file can now contains '\*' characters.

## 1.1.2

### Patch Changes

-   8df5691: Fix mock data generation and reorganize some part of the code

## 1.1.1

### Patch Changes

-   af43ce7: Fix dependencies

## 1.1.0

### Minor Changes

-   32c6142: Improve the function based mockdata API

## 1.0.4

### Patch Changes

-   a3b8a5d: Add support for nested lambda functions

## 1.0.3

### Patch Changes

-   e96f8fc: Fixes an issue that resulted in empty objects being returned if the query contains a path in a \$select option

## 1.0.2

### Patch Changes

-   f06b6d2: Make sure request for non existing object returns 404

## 1.0.1

### Patch Changes

-   069270b: Initial open source release of the SAP UX FE Mockserver
