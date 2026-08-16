# @runstamp/pptx Verified Examples

This file is generated from the same schemas and example fixtures used by `docs:verify` and `docs:render`. Do not edit it by hand.

## PaperDocument

**Schema:** `PaperDocumentSchema`
**Output:** `.pptx`

```jsonc
// verify: pptx:paper-document
{
  "version": "1.0",
  "type": "Document",
  "meta": {
    "title": "Quarterly Update",
    "author": "Runstamp",
    "language": "en-US"
  },
  "slides": [
    {
      "type": "Slide",
      "style": {
        "padding": 40,
        "backgroundColor": "#FFFFFF"
      },
      "children": [
        {
          "type": "Text",
          "content": "Quarterly Update",
          "style": {
            "fontSize": 28,
            "fontWeight": "bold",
            "color": "#1E293B"
          }
        },
        {
          "type": "Text",
          "content": "Revenue grew 28% year over year.",
          "style": {
            "marginTop": 12,
            "fontSize": 18,
            "color": "#334155"
          }
        }
      ]
    }
  ]
}
```
## AgentDocument

**Schema:** `AgentDocumentSchema`
**Output:** `.pptx`

```jsonc
// verify: pptx:agent-document
{
  "type": "presentation",
  "version": "1.0",
  "presentationTitle": "Revenue Dashboard",
  "companyName": "Acme Cloud",
  "theme": "editorial-serif",
  "designTokens": {
    "colors": {
      "accent": "#C2410C"
    },
    "typography": {
      "heroTitleSize": 40
    }
  },
  "slides": [
    {
      "pattern": "title",
      "content": {
        "title": "Revenue Dashboard",
        "subtitle": "Board update for Q2"
      }
    },
    {
      "pattern": "dashboard",
      "content": {
        "title": "Key Metrics",
        "subtitle": "Quarter to date",
        "kpis": [
          {
            "label": "ARR",
            "value": "$12.4M",
            "trend": "up",
            "sublabel": "+41% YoY"
          },
          {
            "label": "NRR",
            "value": "118%",
            "trend": "up",
            "sublabel": "+4 pts"
          }
        ],
        "chart": {
          "type": "bar",
          "title": "MRR by quarter",
          "series": [
            {
              "name": "MRR",
              "dataPoints": [
                {
                  "category": "Q1",
                  "value": 820
                },
                {
                  "category": "Q2",
                  "value": 880
                },
                {
                  "category": "Q3",
                  "value": 940
                },
                {
                  "category": "Q4",
                  "value": 1020
                }
              ]
            }
          ]
        }
      }
    }
  ]
}
```
