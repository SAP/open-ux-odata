---
"@sap-ux/fe-mockserver-core": patch
---

Include ETag response header in 204 minimal representation responses. When a PATCH request is sent with `Prefer: return=minimal`, the mock server now returns the updated ETag in the response header, matching real backend behaviour and preventing false optimistic concurrency conflicts on subsequent requests in the same session.
