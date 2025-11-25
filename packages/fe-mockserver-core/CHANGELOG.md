# @sap-ux/fe-mockserver-core

## 1.6.23

### Patch Changes

-   2f9aac0: We now support IsDigitSequence
    -   @sap-ux/annotation-converter@0.10.9
    -   @sap-ux/edmx-parser@0.9.6

## 1.6.22

### Patch Changes

-   Updated dependencies [1446b13]
    -   @sap-ux/annotation-converter@0.10.8
    -   @sap-ux/edmx-parser@0.9.6

## 1.6.21

### Patch Changes

-   6458c84: feat: dynamically register services defined in CodeList annotations. Renamed `resolveValueListReferences` configuration parameter to `resolveExternalServiceReferences`.

## 1.6.20

### Patch Changes

-   b333838: Misc fixes

## 1.6.19

### Patch Changes

-   a8b7cfc: feat: dynamically register services defined in `Common.ValueListReferences` annotation

## 1.6.18

### Patch Changes

-   bf2320d: Fix the type export

## 1.6.17

### Patch Changes

-   e3538f5: Action return doesn't include double /

## 1.6.16

### Patch Changes

-   2ede21e: Generated TS types are now much nicer

## 1.6.15

### Patch Changes

-   85ce46a: Proper return type for v2 unbound action

## 1.6.14

### Patch Changes

-   3636693: fix: The return data

## 1.6.13

### Patch Changes

-   a953dd9: We fixed an issue with non provided actionData

## 1.6.12

### Patch Changes

-   Updated dependencies [eb7176f]
    -   @sap-ux/annotation-converter@0.10.7

## 1.6.11

### Patch Changes

-   5deb872: Fix some dependency

## 1.6.10

### Patch Changes

-   Updated dependencies [1886ab9]
    -   @sap-ux/annotation-converter@0.10.6

## 1.6.9

### Patch Changes

-   9fa96cd: Fixes for draft + analytics

## 1.6.8

### Patch Changes

-   ddcc7a1: Fix the sibling entity

## 1.6.7

### Patch Changes

-   8192225: feat: add tenant-specific data loading functionality

## 1.6.6

### Patch Changes

-   45debfa: fix: date support for v2 - account for nullable dates

## 1.6.5

### Patch Changes

-   70303b6: Actions shouldn't set count

## 1.6.4

### Patch Changes

-   5300498: We don't wait to unload TS in case it's there

## 1.6.3

### Patch Changes

-   b671880: More changes to make this work with CAP

## 1.6.2

### Patch Changes

-   1cf5c8d: When CAP is in control, don't mess with it :)

## 1.6.1

### Patch Changes

-   ce22efd: ts-node should not be a requirement :D

## 1.6.0

### Minor Changes

-   ca1189b: feat: add TypeScript support for mockserver files and improve loader …

## 1.5.6

### Patch Changes

-   93f23d0: fix: better support for v2

## 1.5.5

### Patch Changes

-   Updated dependencies [5ab7499]
    -   @sap-ux/edmx-parser@0.9.6
    -   @sap-ux/annotation-converter@0.10.5

## 1.5.4

### Patch Changes

-   7aeedc6: Fix issue with browser caching messed up the capture

## 1.5.3

### Patch Changes

-   167bbef: Experimental capture and simulate feature

## 1.5.2

### Patch Changes

-   49adeb3: fix: calling loadServices should also open the service to be called back

## 1.5.1

### Patch Changes

-   Updated dependencies [99a072e]
    -   @sap-ux/annotation-converter@0.10.5

## 1.5.0

### Minor Changes

-   36c158b: Change the way the service registry manages services

## 1.4.33

### Patch Changes

-   f6a6211: Add support for cross-service communication

## 1.4.32

### Patch Changes

-   Updated dependencies [b2faf65]
    -   @sap-ux/edmx-parser@0.9.5
    -   @sap-ux/annotation-converter@0.10.4

## 1.4.31

### Patch Changes

-   Updated dependencies [b937f0b]
    -   @sap-ux/edmx-parser@0.9.4
    -   @sap-ux/annotation-converter@0.10.4

## 1.4.30

### Patch Changes

-   78e85d1: Slight changes on the containment when fetching a collection

## 1.4.29

### Patch Changes

-   8f2133f: We no longer corrupt the data of embedded navigation properties

## 1.4.28

### Patch Changes

-   Updated dependencies [97a8efc]
    -   @sap-ux/edmx-parser@0.9.3
    -   @sap-ux/annotation-converter@0.10.4

## 1.4.27

### Patch Changes

-   Updated dependencies [be78dde]
    -   @sap-ux/edmx-parser@0.9.2
    -   @sap-ux/annotation-converter@0.10.4

## 1.4.26

### Patch Changes

-   Updated dependencies [e5fad12]
    -   @sap-ux/annotation-converter@0.10.4

## 1.4.25

### Patch Changes

-   a1d9fce: Slight update of the typescript api

## 1.4.24

### Patch Changes

-   Updated dependencies [95bbfae]
    -   @sap-ux/edmx-parser@0.9.1
    -   @sap-ux/annotation-converter@0.10.3

## 1.4.23

### Patch Changes

-   20a47be: Fix types

## 1.4.22

### Patch Changes

-   2ab221f: Ensure that data changed through onAfterRead is properly maintained

## 1.4.21

### Patch Changes

-   dd40fed: We now properly deal with draft in case of complex cross navigation

## 1.4.20

### Patch Changes

-   5f67cc2: We fixed an issue while searching for OR / AND

## 1.4.19

### Patch Changes

-   Updated dependencies [52a22e6]
    -   @sap-ux/annotation-converter@0.10.3

## 1.4.18

### Patch Changes

-   0653af7: We now properly identify the entityset in case of parametrized query in v2

## 1.4.17

### Patch Changes

-   ce2e185: feat: veeeeeeeeery basic json batch support

## 1.4.16

### Patch Changes

-   759e442: feat: we now properly support x-http-method to pass more information

## 1.4.15

### Patch Changes

-   Updated dependencies [ca0aa14]
    -   @sap-ux/annotation-converter@0.10.2

## 1.4.14

### Patch Changes

-   @sap-ux/annotation-converter@0.10.1
-   @sap-ux/edmx-parser@0.9.0

## 1.4.13

### Patch Changes

-   b217a1e: fix: gracefully handle service paths with asterisks

## 1.4.12

### Patch Changes

-   68a00a9: We now support search string without quotes in analytical queries

## 1.4.11

### Patch Changes

-   Updated dependencies [d581d62]
    -   @sap-ux/annotation-converter@0.10.0
    -   @sap-ux/edmx-parser@0.9.0

## 1.4.10

### Patch Changes

-   e49df89: We now properly support filter with string values null

## 1.4.9

### Patch Changes

-   @sap-ux/annotation-converter@0.9.11
-   @sap-ux/edmx-parser@0.8.2

## 1.4.8

### Patch Changes

-   e7f354a: Support autoloading mockdata file for specific tenants

## 1.4.7

### Patch Changes

-   2df4e00: Fix logger preventing start

## 1.4.6

### Patch Changes

-   c2b7af8: we no longer depend on a deprecated version of ui5 logger

## 1.4.5

### Patch Changes

-   @sap-ux/annotation-converter@0.9.10
-   @sap-ux/edmx-parser@0.8.2

## 1.4.4

### Patch Changes

-   ac9a43e: Order by should respect the nullable field

## 1.4.3

### Patch Changes

-   cdce1a0: fix: improve support for Edm.Double
-   f4cb2e9: log missing mockdata
-   Updated dependencies [cdce1a0]
    -   @sap-ux/annotation-converter@0.9.9
    -   @sap-ux/edmx-parser@0.8.2

## 1.4.2

### Patch Changes

-   Updated dependencies [b4d0774]
    -   @sap-ux/annotation-converter@0.9.8

## 1.4.1

### Patch Changes

-   @sap-ux/annotation-converter@0.9.7
-   @sap-ux/edmx-parser@0.8.1

## 1.4.0

### Minor Changes

-   1aa917d: Update to router 2.x

## 1.3.11

### Patch Changes

-   e8c8e17: fix: We add ContentID to error details on changeset failure

## 1.3.10

### Patch Changes

-   81920f4: fix: add v2 batch response headers correctly

## 1.3.9

### Patch Changes

-   04bcbb5: fix: provide right response when there are failures in multi select changeset mode

## 1.3.8

### Patch Changes

-   e1ddd79: security patch
-   Updated dependencies [e1ddd79]
    -   @sap-ux/annotation-converter@0.9.6
    -   @sap-ux/edmx-parser@0.8.1

## 1.3.7

### Patch Changes

-   83adadc: Adding tests to support Expand all children of a node

## 1.3.6

### Patch Changes

-   ed78e39: add ability to throw a global error that makes a whole batch fail

## 1.3.5

### Patch Changes

-   Updated dependencies [7899cab]
    -   @sap-ux/edmx-parser@0.8.1
    -   @sap-ux/annotation-converter@0.9.5

## 1.3.4

### Patch Changes

-   738750d: fix(deps): update dependency body-parser to v1.20.3 [security]

## 1.3.3

### Patch Changes

-   Updated dependencies [514896d]
    -   @sap-ux/annotation-converter@0.9.5

## 1.3.2

### Patch Changes

-   d848d39: Etag on patch

## 1.3.1

### Patch Changes

-   @sap-ux/annotation-converter@0.9.4
-   @sap-ux/edmx-parser@0.8.0

## 1.3.0

### Minor Changes

-   fea7688: Make the fetchEntries / getAllEntries method async

## 1.2.59

### Patch Changes

-   @sap-ux/annotation-converter@0.9.3
-   @sap-ux/edmx-parser@0.8.0

## 1.2.58

### Patch Changes

-   Updated dependencies [b64aae6]
    -   @sap-ux/annotation-converter@0.9.2

## 1.2.57

### Patch Changes

-   6aee095: Improve the handling of hierarchy with drafts

## 1.2.56

### Patch Changes

-   @sap-ux/annotation-converter@0.9.1
-   @sap-ux/edmx-parser@0.8.0

## 1.2.55

### Patch Changes

-   Updated dependencies [bf2b130]
    -   @sap-ux/annotation-converter@0.9.0
    -   @sap-ux/edmx-parser@0.8.0

## 1.2.54

### Patch Changes

-   50bfb29: feat: Enhance mock server with service-level metadata processor override

## 1.2.53

### Patch Changes

-   39b6783: update to the batchResponse in case of 412 warnings for changeset

## 1.2.52

### Patch Changes

-   @sap-ux/annotation-converter@0.8.15
-   @sap-ux/edmx-parser@0.7.1

## 1.2.51

### Patch Changes

-   09d5a17: handle changeset scenarios for 412 warnings

## 1.2.50

### Patch Changes

-   b215858: feat: introduce a basic support for entity ETags

## 1.2.49

### Patch Changes

-   8fb7212: Fix issue with the hierarchy due to integer based handling

## 1.2.48

### Patch Changes

-   @sap-ux/annotation-converter@0.8.14
-   @sap-ux/edmx-parser@0.7.1

## 1.2.47

### Patch Changes

-   13abaa4: Slightly improved version of the index generation

## 1.2.46

### Patch Changes

-   0f34945: Add index to speed up the mockserver

## 1.2.45

### Patch Changes

-   586bcc9: fix: empty lambda are now properly parsed

## 1.2.44

### Patch Changes

-   35c9236: fix: allow empty lambda operations

## 1.2.43

### Patch Changes

-   a8506c5: We now properly fill the service document

## 1.2.42

### Patch Changes

-   @sap-ux/annotation-converter@0.8.13
-   @sap-ux/edmx-parser@0.7.1

## 1.2.41

### Patch Changes

-   @sap-ux/annotation-converter@0.8.12
-   @sap-ux/edmx-parser@0.7.1

## 1.2.40

### Patch Changes

-   Updated dependencies [3c0d8bd]
    -   @sap-ux/annotation-converter@0.8.11
    -   @sap-ux/edmx-parser@0.7.1

## 1.2.39

### Patch Changes

-   a103f9d: feat: support the LimitedRank property in a hierarchy

## 1.2.38

### Patch Changes

-   bdc82bf: Remove an extra CRLF in batch response

## 1.2.37

### Patch Changes

-   @sap-ux/annotation-converter@0.8.10
-   @sap-ux/edmx-parser@0.7.1

## 1.2.36

### Patch Changes

-   536e307: Adjust the draft administrative data

## 1.2.35

### Patch Changes

-   afc6049: fix: Correct hierarchy with expanded sub-nodes after draft creation

## 1.2.34

### Patch Changes

-   270106c: feat: Support the new version of the com.sap.vocabularies.Hierarchy

## 1.2.33

### Patch Changes

-   @sap-ux/annotation-converter@0.8.9
-   @sap-ux/edmx-parser@0.7.1

## 1.2.32

### Patch Changes

-   @sap-ux/annotation-converter@0.8.8
-   @sap-ux/edmx-parser@0.7.1

## 1.2.31

### Patch Changes

-   692d2b5: Revert back to previous behavior for nullable properties (always generate if they are missing)

## 1.2.30

### Patch Changes

-   6b21589: Fix recursive delete

## 1.2.29

### Patch Changes

-   ae19e5a: Fix draft hierarchy queries

## 1.2.28

### Patch Changes

-   1b25c13: Introduce a new property `forceNullableValuesToNull`
-   Updated dependencies [1b25c13]
    -   @sap-ux/annotation-converter@0.8.7
    -   @sap-ux/edmx-parser@0.7.1

## 1.2.27

### Patch Changes

-   79314d3: Add support for in operator (odata v4.01)

## 1.2.26

### Patch Changes

-   @sap-ux/annotation-converter@0.8.6
-   @sap-ux/edmx-parser@0.7.0

## 1.2.25

### Patch Changes

-   Updated dependencies [260e502]
    -   @sap-ux/annotation-converter@0.8.5

## 1.2.24

### Patch Changes

-   160e4ec: fix: proper query for expand levels

## 1.2.23

### Patch Changes

-   5707fd4: fix subExpand in topLevels

## 1.2.22

### Patch Changes

-   @sap-ux/annotation-converter@0.8.4
-   @sap-ux/edmx-parser@0.7.0

## 1.2.21

### Patch Changes

-   @sap-ux/annotation-converter@0.8.3
-   @sap-ux/edmx-parser@0.7.0

## 1.2.20

### Patch Changes

-   1b29820: Fix an issue with null in property names

## 1.2.19

### Patch Changes

-   cc89632: MaxLength is now considered for string key properties

## 1.2.18

### Patch Changes

-   @sap-ux/annotation-converter@0.8.2
-   @sap-ux/edmx-parser@0.7.0

## 1.2.17

### Patch Changes

-   08baacc: Allow to define hierarchies with complex keys

## 1.2.16

### Patch Changes

-   4588dc4: The mockserver now handles $filter and $orderby in $expand clauses

## 1.2.15

### Patch Changes

-   e33af15: feat: support the "unofficial" search for v2

## 1.2.14

### Patch Changes

-   a2ecbcd: Fix an issue with applyDefinition not resolving navProperty values

## 1.2.13

### Patch Changes

-   e632150: getReferentialConstraint was not working when there was an implementation file associated with a hierarchic entity

## 1.2.12

### Patch Changes

-   14094c5: Fix an issue with not lambda parsing

## 1.2.11

### Patch Changes

-   ececa87: Lambda expression containing methods a properly evaluated

## 1.2.10

### Patch Changes

-   74f6b41: Analytical queries are now properly handled

## 1.2.9

### Patch Changes

-   9570cd8: Filter using not in front of lambda operator are now working fine

## 1.2.8

### Patch Changes

-   0a1f7c1: encodeURI is called even when multiple keys are used

## 1.2.7

### Patch Changes

-   @sap-ux/annotation-converter@0.8.1
-   @sap-ux/edmx-parser@0.7.0

## 1.2.6

### Patch Changes

-   ddecc42: Date Time offset are now parsed properly

## 1.2.5

### Patch Changes

-   79d5e17: fix: data is now fetched from the session if one exists

## 1.2.4

### Patch Changes

-   7bd3e7f: fix: isolate sticky sessions

## 1.2.3

### Patch Changes

-   955117a: Improve the hierarchy support when using complex type to hold the hierarchy data

## 1.2.2

### Patch Changes

-   234c698: fix: the sticky 'discard' action must not return a sap-contextid header

## 1.2.1

### Patch Changes

-   cb0a6a0: fix: sticky 'discard' action has no return value
    fix: sticky `$batch` requests are aborted completely if the session token (sap-contextid) is invalid or has expired

## 1.2.0

### Minor Changes

-   2821157: Bump version to account for new node version support

### Patch Changes

-   Updated dependencies [2821157]
    -   @sap-ux/annotation-converter@0.8.0
    -   @sap-ux/edmx-parser@0.7.0

## 1.1.121

### Patch Changes

-   ce953a3: fix: minor code improvement on the hierarchy flow

## 1.1.120

### Patch Changes

-   @sap-ux/annotation-converter@0.7.5
-   @sap-ux/edmx-parser@0.6.0

## 1.1.119

### Patch Changes

-   ad8dc44: Don't try to set header to undefined

## 1.1.118

### Patch Changes

-   @sap-ux/annotation-converter@0.7.4
-   @sap-ux/edmx-parser@0.6.0

## 1.1.117

### Patch Changes

-   bae3664: V2 metadata response now encode special characters in keys

## 1.1.116

### Patch Changes

-   2d25b15: ancestor queries can be parsed on complex navigation

## 1.1.115

### Patch Changes

-   @sap-ux/annotation-converter@0.7.3
-   @sap-ux/edmx-parser@0.6.0

## 1.1.114

### Patch Changes

-   17d8ba5: fix: prevent keyword from interfering with queries

## 1.1.113

### Patch Changes

-   dda5847: fix: cannot create a node in a hierarchy and a node below it

## 1.1.112

### Patch Changes

-   cc971c4: Fix various issues with v2

## 1.1.111

### Patch Changes

-   2ecd0c5: fix: update metadata definition for v2 requests

## 1.1.110

### Patch Changes

-   4dc98e0: Allow to perform maintenance on hierrchy nodes

## 1.1.109

### Patch Changes

-   @sap-ux/annotation-converter@0.7.2
-   @sap-ux/edmx-parser@0.6.0

## 1.1.108

### Patch Changes

-   7d98e16: Tenant based data will no longer leak onto one another

## 1.1.107

### Patch Changes

-   09052b5: Navigation property are not expected to be draft enabled anymore

## 1.1.106

### Patch Changes

-   c8d1d8f: fix: v2 metadata contains incorrect data

## 1.1.105

### Patch Changes

-   cd5b778: Strict mode is now properly evaluated on the odataRequest

## 1.1.104

### Patch Changes

-   4bdf473: Allow more queries on the analytical use case

## 1.1.103

### Patch Changes

-   5bbed77: DraftAdminData is now properly maintained

## 1.1.102

### Patch Changes

-   @sap-ux/annotation-converter@0.7.1
-   @sap-ux/edmx-parser@0.6.0

## 1.1.101

### Patch Changes

-   cd6efe3: Navigation properties will no longer be mistaken for actions

## 1.1.100

### Patch Changes

-   0e0c7e2: Further fix on the filter parser for date time with timezone

## 1.1.99

### Patch Changes

-   cb37ec6: Add more logging info on debug

## 1.1.98

### Patch Changes

-   bcc6971: key values are now parsed into a more specific type

## 1.1.97

### Patch Changes

-   dfe9f06: Function are now properly resolved

## 1.1.96

### Patch Changes

-   a734d07: Leading and trailing apostrophes are now removed from string values in keys

## 1.1.95

### Patch Changes

-   d93101e: We now properly merge deep expand of the same level

## 1.1.94

### Patch Changes

-   Updated dependencies [e70d625]
    -   @sap-ux/annotation-converter@0.7.0
    -   @sap-ux/edmx-parser@0.6.0

## 1.1.93

### Patch Changes

-   4b255c9: Complex and nested expand in v2 are now working correctly

## 1.1.92

### Patch Changes

-   f23406b: Properly set the contextID for sticky in all cases

## 1.1.91

### Patch Changes

-   a5129b2: Sticky session is now properly set

## 1.1.90

### Patch Changes

-   Updated dependencies [9475a66]
    -   @sap-ux/annotation-converter@0.6.16

## 1.1.89

### Patch Changes

-   Updated dependencies [3116cd5]
    -   @sap-ux/annotation-converter@0.6.15
    -   @sap-ux/edmx-parser@0.5.16

## 1.1.88

### Patch Changes

-   Updated dependencies [1fc2286]
    -   @sap-ux/annotation-converter@0.6.14
    -   @sap-ux/edmx-parser@0.5.15

## 1.1.87

### Patch Changes

-   df52a22: The `$target` property of types `PropertyPath`, `NavigationPropertyPath`, `AnnotationPath` and `PathAnnotationExpression` can now be undefined
-   Updated dependencies [df52a22]
    -   @sap-ux/annotation-converter@0.6.13
    -   @sap-ux/edmx-parser@0.5.14

## 1.1.86

### Patch Changes

-   @sap-ux/annotation-converter@0.6.12
-   @sap-ux/edmx-parser@0.5.14

## 1.1.85

### Patch Changes

-   6ece620: group by query may not have aggregates

## 1.1.84

### Patch Changes

-   6bdb95b: DateTime can also include fractional seconds

## 1.1.83

### Patch Changes

-   Updated dependencies [5e2ff68]
    -   @sap-ux/annotation-converter@0.6.11

## 1.1.82

### Patch Changes

-   4a65e71: Analytical queries operator will not overmatch their boundaries

## 1.1.81

### Patch Changes

-   924f0a6: Complex type are created even if they are computed

## 1.1.80

### Patch Changes

-   d4cbd89: We now support groupBy on navigation property

## 1.1.79

### Patch Changes

-   9bfc721: We now send the correct http header for the $count queries in batch

## 1.1.78

### Patch Changes

-   Updated dependencies [4c90240]
    -   @sap-ux/annotation-converter@0.6.10

## 1.1.77

### Patch Changes

-   6ed2cdc: Properly support additional hierarchy queries

## 1.1.76

### Patch Changes

-   0f3fd90: $count queries are now working properly

## 1.1.75

### Patch Changes

-   c714433: The base type of the mockdata contributor is now correct

## 1.1.74

### Patch Changes

-   3e411f5: Improved the logic to resolve the parent from a specific node

## 1.1.73

### Patch Changes

-   1bd4851: feat(MockDataContributor): Add support of generic types

## 1.1.72

### Patch Changes

-   e32f68f: Unaliasing now falls back to the global namespace if an alias cannot be resolved using references
-   Updated dependencies [e32f68f]
-   Updated dependencies [e32f68f]
    -   @sap-ux/annotation-converter@0.6.9
    -   @sap-ux/edmx-parser@0.5.14

## 1.1.71

### Patch Changes

-   67886a2: Search transformations should be considered the same as filters for matching descendant counts

## 1.1.70

### Patch Changes

-   Updated dependencies [6c325c5]
    -   @sap-ux/annotation-converter@0.6.8

## 1.1.69

### Patch Changes

-   c767c85: We fixed an issue with composition data and sub object creation

## 1.1.68

### Patch Changes

-   Updated dependencies [24d8199]
    -   @sap-ux/annotation-converter@0.6.7
    -   @sap-ux/edmx-parser@0.5.13

## 1.1.67

### Patch Changes

-   Updated dependencies [9be80ce]
    -   @sap-ux/annotation-converter@0.6.6

## 1.1.66

### Patch Changes

-   Updated dependencies [217e517]
    -   @sap-ux/annotation-converter@0.6.5
    -   @sap-ux/edmx-parser@0.5.13

## 1.1.65

### Patch Changes

-   2da31ba: Fix an issue with complex aggregate queries

## 1.1.64

### Patch Changes

-   d6edb21: Experimental support for hierarchial structure

## 1.1.63

### Patch Changes

-   Updated dependencies [7230a33]
    -   @sap-ux/annotation-converter@0.6.4
    -   @sap-ux/edmx-parser@0.5.13

## 1.1.62

### Patch Changes

-   0c1ec3e: The mockserver now allows to use actions that do not return a value

## 1.1.61

### Patch Changes

-   4050889: Empty navigation path will now lead to empty target

## 1.1.60

### Patch Changes

-   4e3aca0: Lenient create

## 1.1.59

### Patch Changes

-   Updated dependencies [e922bf7]
    -   @sap-ux/annotation-converter@0.6.3

## 1.1.58

### Patch Changes

-   Updated dependencies [76b4876]
    -   @sap-ux/annotation-converter@0.6.2

## 1.1.57

### Patch Changes

-   25a4c33: Add support for ComplexType in $orderBy

## 1.1.56

### Patch Changes

-   Updated dependencies [946cf8f]
    -   @sap-ux/annotation-converter@0.6.1

## 1.1.55

### Patch Changes

-   5c1b089: We now allow to specify referential constraints even if the backend doesn't provide them

## 1.1.54

### Patch Changes

-   Updated dependencies [956ee23]
    -   @sap-ux/annotation-converter@0.6.0
    -   @sap-ux/edmx-parser@0.5.13

## 1.1.53

### Patch Changes

-   Updated dependencies [c3dfcba]
    -   @sap-ux/annotation-converter@0.5.23

## 1.1.52

### Patch Changes

-   4b190d5: Allow action to be resolved when the service alias is used

## 1.1.51

### Patch Changes

-   5673d74: implicitly expand navigation properties needed for filter conditions

## 1.1.50

### Patch Changes

-   69c88e3: Fixed an issue with the parsing when the filter contained a # character

## 1.1.49

### Patch Changes

-   8f8ef12: Scope the cache disablement only for the mockserver data

## 1.1.48

### Patch Changes

-   Updated dependencies [b408038]
    -   @sap-ux/annotation-converter@0.5.22

## 1.1.47

### Patch Changes

-   fe1db88: Improve the result set for create on an odata v2 service

## 1.1.46

### Patch Changes

-   04a076f: An issue with the filter parser has been fixed

## 1.1.45

### Patch Changes

-   3924328: fix: resolve the back navigation using partner first and then by entitytype

## 1.1.44

### Patch Changes

-   Updated dependencies [3e1eea4]
    -   @sap-ux/annotation-converter@0.5.21

## 1.1.43

### Patch Changes

-   dbb6b60: Make processing of $search and $filter more robust if the mock data contains wrong data types

## 1.1.42

### Patch Changes

-   eee3a92: Fix the draft root resolution in services with multiple draft roots

## 1.1.41

### Patch Changes

-   4b0be5e: Fix how the substringof filter is being evaluated

## 1.1.40

### Patch Changes

-   8c86984: feat(mockserver): Add feature CSRF token

## 1.1.39

### Patch Changes

-   e745035: Nested complex type will now be checked for proper format

## 1.1.38

### Patch Changes

-   e8eeff3: An issue with the date time filtering in v2 service has been fixed

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
