# @runstamp/catalog

The descriptor-only Runstamp v1 operation catalog. It contains exactly 79 stable
operations and intentionally contains no implementation module names or engine
code.

```ts
import { CATALOG, findOperation, httpRoute } from "@runstamp/catalog";

console.log(CATALOG.length); // 79
console.log(httpRoute(findOperation("pdf.render")!)); // /v1/pdf/render
```

The committed `catalog.json` export is the same data used by the JavaScript API.
