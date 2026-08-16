# @runstamp/pdf Verified Examples

This file is generated from the same schemas and example fixtures used by `docs:verify` and `docs:render`. Do not edit it by hand.

## PdfStructuredDocument

**Schema:** `PdfStructuredDocumentSchema`
**Output:** `.pdf`

```jsonc
// verify: pdf:structured-document
{
  "meta": {
    "title": "Monthly Update",
    "author": "Acme Inc."
  },
  "page": {
    "size": "Letter",
    "margin": 48
  },
  "children": [
    {
      "type": "heading",
      "value": "Monthly Update",
      "level": 1
    },
    {
      "type": "paragraph",
      "value": "Revenue grew 18% month over month."
    },
    {
      "type": "preformatted",
      "value": "line one\nline two\nline three"
    },
    {
      "type": "table",
      "columns": [
        {
          "width": 120
        },
        {
          "width": 80
        }
      ],
      "header": [
        {
          "cells": [
            {
              "role": "th",
              "children": [
                {
                  "type": "paragraph",
                  "value": "Region"
                }
              ]
            },
            {
              "role": "th",
              "children": [
                {
                  "type": "paragraph",
                  "value": "Revenue"
                }
              ]
            }
          ]
        }
      ],
      "body": [
        {
          "cells": [
            {
              "children": [
                {
                  "type": "paragraph",
                  "value": "North America"
                }
              ]
            },
            {
              "children": [
                {
                  "type": "paragraph",
                  "value": "$5.1M"
                }
              ]
            }
          ]
        },
        {
          "cells": [
            {
              "children": [
                {
                  "type": "paragraph",
                  "value": "Europe"
                }
              ]
            },
            {
              "children": [
                {
                  "type": "paragraph",
                  "value": "$3.6M"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "list",
      "ordered": false,
      "items": [
        {
          "text": "Deployment frequency increased by 18%"
        },
        {
          "text": "MTTR dropped below one hour"
        }
      ]
    },
    {
      "type": "divider"
    },
    {
      "type": "page-break"
    },
    {
      "type": "paragraph",
      "value": "Appendix starts on a new page."
    }
  ]
}
```
## PdfRawDocument

**Schema:** `PdfRawDocumentSchema`
**Output:** `.pdf`

```jsonc
// verify: pdf:raw-document
{
  "meta": {
    "title": "Simple raw PDF"
  },
  "pages": [
    {
      "texts": [
        {
          "value": "Hello from the low-level PDF API.",
          "x": 72,
          "y": 720
        }
      ]
    }
  ]
}
```
