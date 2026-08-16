# @runstamp/xlsx Verified Examples

This file is generated from the same schemas and example fixtures used by `docs:verify` and `docs:render`. Do not edit it by hand.

## SpreadsheetDocument

**Schema:** `SpreadsheetDocumentSchema`
**Output:** `.xlsx`

```jsonc
// verify: xlsx:document
{
  "meta": {
    "title": "Revenue Report",
    "creator": "Runstamp",
    "description": "Quarterly revenue workbook"
  },
  "sheets": [
    {
      "name": "Summary",
      "columns": [
        {
          "width": 24
        },
        {
          "width": 18
        }
      ],
      "rows": [
        {
          "cells": [
            {
              "value": "Quarterly Revenue",
              "style": "header"
            },
            {
              "value": null
            }
          ]
        },
        {
          "cells": [
            {
              "value": "Q1 2026"
            },
            {
              "value": 420000,
              "style": "currency"
            }
          ]
        },
        {
          "cells": [
            {
              "value": "Q2 2026"
            },
            {
              "value": 465000,
              "style": "currency"
            }
          ]
        }
      ],
      "mergedCells": [
        "A1:B1"
      ],
      "freezePane": {
        "row": 1,
        "col": 0
      }
    }
  ]
}
```
