---
"@sap-ux/fe-mockserver-core": patch
---

Fix matrix parameter parsing for external service references in OData URLs

This change fixes a regression where value help data from external services was not loading correctly when using UI5 1.144+. The issue occurred because UI5 1.144+ stopped URL-encoding single quotes in matrix parameters (semicolon-separated parameters like `;ps='value';va='value'`), but the mockserver was not handling the unencoded format.

**Changes:**
- Updated `QueryPath` type to include optional `matrixParameters` field
- Enhanced `parsePath()` method to detect and parse matrix parameters from path segments
- Added support for both encoded (`%27`) and unencoded (`'`) single quote formats
- Added comprehensive test cases covering both UI5 1.142 (encoded) and UI5 1.144+ (unencoded) formats

**Impact:**
- Value help dialogs for external service references now work correctly with UI5 1.144+
- Maintains backward compatibility with UI5 1.142 and earlier versions
- Resolves ServiceNow incident where Agency ID value help was not displaying values 60001, 60002, and 60003

**Example URLs now handled:**
- Encoded (UI5 1.142): `/service/0001;ps=%27srvd-name%27;va=%27path%27/$metadata`
- Unencoded (UI5 1.144+): `/service/0001;ps='srvd-name';va='path'/$metadata`
