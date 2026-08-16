import type { PaperDocument } from "../../src/types/ast.js";

export const groupVectors: Record<string, PaperDocument> = {
  "group-basic": {
    type: "Document",
    meta: { title: "Group Basic" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Group",
            style: { width: 500, height: 300 },
            children: [
              {
                type: "View",
                style: { width: 240, height: 300, backgroundColor: "#4A90D9" },
              },
              {
                type: "View",
                style: { width: 240, height: 300, backgroundColor: "#D94A4A" },
              },
            ],
          },
        ],
      },
    ],
  },

  "group-nested": {
    type: "Document",
    meta: { title: "Group Nested" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Group",
            style: { width: 600, height: 400 },
            children: [
              {
                type: "View",
                style: { width: 280, height: 400, backgroundColor: "#2ECC71" },
              },
              {
                type: "Group",
                style: { width: 300, height: 200 },
                children: [
                  {
                    type: "View",
                    style: { width: 140, height: 200, backgroundColor: "#F39C12" },
                  },
                  {
                    type: "View",
                    style: { width: 140, height: 200, backgroundColor: "#8E44AD" },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  "group-mixed": {
    type: "Document",
    meta: { title: "Group Mixed" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Group",
            style: { width: 600, height: 350, flexDirection: "column" },
            children: [
              {
                type: "Text",
                style: { fontSize: 24, fontWeight: "bold", color: "#1A1A1A" },
                content: "Mixed Group Heading",
              },
              {
                type: "View",
                style: { width: 580, height: 100, backgroundColor: "#3498DB" },
              },
              {
                type: "Group",
                style: { width: 580, height: 120, flexDirection: "row" },
                children: [
                  {
                    type: "View",
                    style: { width: 280, height: 120, backgroundColor: "#E74C3C" },
                  },
                  {
                    type: "View",
                    style: { width: 280, height: 120, backgroundColor: "#1ABC9C" },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  "group-with-chart": {
    type: "Document",
    meta: { title: "Group With Chart" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Group",
            style: { width: 500, height: 350, flexDirection: "column" },
            children: [
              {
                type: "Text",
                style: { fontSize: 18, fontWeight: "bold", color: "#2C3E50" },
                content: "Quarterly Revenue",
              },
              {
                type: "Chart",
                style: { width: 400, height: 250 },
                chartData: {
                  chartType: "bar",
                  categories: ["Q1", "Q2", "Q3", "Q4"],
                  series: [
                    { name: "Revenue", values: [120, 185, 160, 210] },
                    { name: "Costs", values: [80, 95, 110, 130] },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  },

  "group-positioned": {
    type: "Document",
    meta: { title: "Group Positioned" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          {
            type: "Group",
            style: {
              width: 400,
              height: 250,
              position: "absolute",
              top: 100,
              left: 150,
            },
            children: [
              {
                type: "View",
                style: { width: 190, height: 250, backgroundColor: "#E67E22" },
              },
              {
                type: "View",
                style: { width: 190, height: 250, backgroundColor: "#9B59B6" },
              },
            ],
          },
        ],
      },
    ],
  },
};
