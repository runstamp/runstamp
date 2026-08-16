# @runstamp/docx Verified Examples

This file is generated from the same schemas and example fixtures used by `docs:verify` and `docs:render`. Do not edit it by hand.

## DocxDocument

**Schema:** `DocxDocumentSchema`
**Output:** `.docx`

```jsonc
// verify: docx:document
{
  "type": "DocxDocument",
  "metadata": {
    "title": "Quarterly Business Review",
    "author": "Runstamp",
    "language": "en-US"
  },
  "pageSize": "a4",
  "margins": {
    "top": 72,
    "right": 72,
    "bottom": 72,
    "left": 72
  },
  "theme": {
    "preset": "corporate"
  },
  "footer": {
    "includePageNumber": true
  },
  "pages": [
    {
      "elements": [
        {
          "type": "heading",
          "level": 1,
          "text": "Quarterly Business Review"
        },
        {
          "type": "paragraph",
          "text": "Revenue grew 18% year over year, driven by enterprise expansion."
        },
        {
          "type": "table",
          "tableStyle": "corporate",
          "rows": [
            {
              "isHeader": true,
              "cells": [
                {
                  "text": "Region"
                },
                {
                  "text": "Revenue"
                }
              ]
            },
            {
              "cells": [
                {
                  "text": "North America"
                },
                {
                  "text": "$5.1M"
                }
              ]
            },
            {
              "cells": [
                {
                  "text": "Europe"
                },
                {
                  "text": "$3.6M"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```
