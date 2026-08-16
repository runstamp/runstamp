// multi-slide.ts -- 5-slide deck with title, content, and conclusion slides.
// Demonstrates absolute positioning and multiple slide layouts.
// Published package consumers import from @runstamp/pptx.
// This workspace example imports the built lite bundle. Run `pnpm build` first if needed.
// Run: npx tsx examples/multi-slide.ts

import fs from "node:fs";
import { PaperEngine, type PaperDocument, type PaperSlide } from "../dist-lite/index.js";

const titleSlide: PaperSlide = {
  backgroundColor: "#0F172A",
  children: [
    {
      type: "Text",
      content: "Product Strategy 2025",
      style: {
        position: "absolute",
        top: 220,
        left: 120,
        width: 1040,
        height: 80,
        fontSize: 48,
        fontWeight: "bold",
        color: "#FFFFFF",
        textAlign: "center",
      },
    },
    {
      type: "Text",
      content: "Building the next generation platform",
      style: {
        position: "absolute",
        top: 320,
        left: 120,
        width: 1040,
        height: 40,
        fontSize: 20,
        color: "#94A3B8",
        textAlign: "center",
      },
    },
    {
      type: "Text",
      content: "March 2025  |  Confidential",
      style: {
        position: "absolute",
        top: 620,
        left: 120,
        width: 1040,
        height: 30,
        fontSize: 12,
        color: "#64748B",
        textAlign: "center",
      },
    },
  ],
};

const marketSlide: PaperSlide = {
  backgroundColor: "#FFFFFF",
  children: [
    {
      type: "Text",
      content: "Market Opportunity",
      style: {
        position: "absolute",
        top: 30,
        left: 60,
        width: 600,
        height: 50,
        fontSize: 32,
        fontWeight: "bold",
        color: "#0F172A",
      },
    },
    {
      type: "View",
      style: {
        position: "absolute",
        top: 110,
        left: 60,
        width: 340,
        height: 160,
        backgroundColor: "#EFF6FF",
        borderRadius: 8,
      },
      shapeType: "roundRect",
      textParagraphs: [
        { runs: [{ text: "$12.4B", style: { fontSize: 36, fontWeight: "bold", color: "#1E40AF" } }], align: "center" },
        { runs: [{ text: "Total Addressable Market", style: { fontSize: 14, color: "#475569" } }], align: "center" },
      ],
    },
    {
      type: "View",
      style: {
        position: "absolute",
        top: 110,
        left: 420,
        width: 340,
        height: 160,
        backgroundColor: "#F0FDF4",
        borderRadius: 8,
      },
      shapeType: "roundRect",
      textParagraphs: [
        { runs: [{ text: "34%", style: { fontSize: 36, fontWeight: "bold", color: "#166534" } }], align: "center" },
        { runs: [{ text: "YoY Growth Rate", style: { fontSize: 14, color: "#475569" } }], align: "center" },
      ],
    },
    {
      type: "View",
      style: {
        position: "absolute",
        top: 110,
        left: 780,
        width: 340,
        height: 160,
        backgroundColor: "#FEF3C7",
        borderRadius: 8,
      },
      shapeType: "roundRect",
      textParagraphs: [
        { runs: [{ text: "2.1M", style: { fontSize: 36, fontWeight: "bold", color: "#92400E" } }], align: "center" },
        { runs: [{ text: "Enterprise Users", style: { fontSize: 14, color: "#475569" } }], align: "center" },
      ],
    },
    {
      type: "Text",
      paragraphs: [
        {
          runs: [{ text: "The enterprise collaboration market is undergoing rapid transformation driven by three key trends:", style: { fontSize: 16, color: "#334155" } }],
          spaceBefore: 0,
          spaceAfter: 8,
        },
        {
          runs: [{ text: "AI-first workflows replacing legacy toolchains", style: { fontSize: 15, color: "#334155" } }],
          bullet: { char: "\u2022", color: "#2563EB" },
          level: 0,
          spaceBefore: 4,
        },
        {
          runs: [{ text: "Shift from document-centric to data-centric processes", style: { fontSize: 15, color: "#334155" } }],
          bullet: { char: "\u2022", color: "#2563EB" },
          level: 0,
          spaceBefore: 4,
        },
        {
          runs: [{ text: "Increasing demand for real-time, cross-platform interoperability", style: { fontSize: 15, color: "#334155" } }],
          bullet: { char: "\u2022", color: "#2563EB" },
          level: 0,
          spaceBefore: 4,
        },
      ],
      style: {
        position: "absolute",
        top: 310,
        left: 60,
        width: 1060,
        height: 280,
        fontSize: 16,
      },
    },
  ],
};

const roadmapSlide: PaperSlide = {
  backgroundColor: "#FFFFFF",
  children: [
    {
      type: "Text",
      content: "Product Roadmap",
      style: {
        position: "absolute",
        top: 30,
        left: 60,
        width: 600,
        height: 50,
        fontSize: 32,
        fontWeight: "bold",
        color: "#0F172A",
      },
    },
    // Q1
    {
      type: "View",
      style: {
        position: "absolute",
        top: 120,
        left: 60,
        width: 260,
        height: 420,
        backgroundColor: "#2563EB",
        borderRadius: 8,
      },
      shapeType: "roundRect",
      textParagraphs: [
        { runs: [{ text: "Q1 2025", style: { fontSize: 20, fontWeight: "bold", color: "#FFFFFF" } }], align: "center", spaceAfter: 12 },
        { runs: [{ text: "Core Engine", style: { fontSize: 14, fontWeight: "bold", color: "#DBEAFE" } }], spaceAfter: 4 },
        { runs: [{ text: "- Layout engine v2", style: { fontSize: 12, color: "#BFDBFE" } }], spaceAfter: 2 },
        { runs: [{ text: "- Chart rendering", style: { fontSize: 12, color: "#BFDBFE" } }], spaceAfter: 2 },
        { runs: [{ text: "- Table support", style: { fontSize: 12, color: "#BFDBFE" } }] },
      ],
    },
    // Q2
    {
      type: "View",
      style: {
        position: "absolute",
        top: 120,
        left: 340,
        width: 260,
        height: 420,
        backgroundColor: "#7C3AED",
        borderRadius: 8,
      },
      shapeType: "roundRect",
      textParagraphs: [
        { runs: [{ text: "Q2 2025", style: { fontSize: 20, fontWeight: "bold", color: "#FFFFFF" } }], align: "center", spaceAfter: 12 },
        { runs: [{ text: "Integrations", style: { fontSize: 14, fontWeight: "bold", color: "#EDE9FE" } }], spaceAfter: 4 },
        { runs: [{ text: "- API gateway", style: { fontSize: 12, color: "#DDD6FE" } }], spaceAfter: 2 },
        { runs: [{ text: "- Webhook system", style: { fontSize: 12, color: "#DDD6FE" } }], spaceAfter: 2 },
        { runs: [{ text: "- SSO / SAML", style: { fontSize: 12, color: "#DDD6FE" } }] },
      ],
    },
    // Q3
    {
      type: "View",
      style: {
        position: "absolute",
        top: 120,
        left: 620,
        width: 260,
        height: 420,
        backgroundColor: "#059669",
        borderRadius: 8,
      },
      shapeType: "roundRect",
      textParagraphs: [
        { runs: [{ text: "Q3 2025", style: { fontSize: 20, fontWeight: "bold", color: "#FFFFFF" } }], align: "center", spaceAfter: 12 },
        { runs: [{ text: "Scale", style: { fontSize: 14, fontWeight: "bold", color: "#D1FAE5" } }], spaceAfter: 4 },
        { runs: [{ text: "- Multi-region deploy", style: { fontSize: 12, color: "#A7F3D0" } }], spaceAfter: 2 },
        { runs: [{ text: "- Edge caching", style: { fontSize: 12, color: "#A7F3D0" } }], spaceAfter: 2 },
        { runs: [{ text: "- Auto-scaling", style: { fontSize: 12, color: "#A7F3D0" } }] },
      ],
    },
    // Q4
    {
      type: "View",
      style: {
        position: "absolute",
        top: 120,
        left: 900,
        width: 260,
        height: 420,
        backgroundColor: "#DC2626",
        borderRadius: 8,
      },
      shapeType: "roundRect",
      textParagraphs: [
        { runs: [{ text: "Q4 2025", style: { fontSize: 20, fontWeight: "bold", color: "#FFFFFF" } }], align: "center", spaceAfter: 12 },
        { runs: [{ text: "AI Features", style: { fontSize: 14, fontWeight: "bold", color: "#FEE2E2" } }], spaceAfter: 4 },
        { runs: [{ text: "- Smart suggestions", style: { fontSize: 12, color: "#FECACA" } }], spaceAfter: 2 },
        { runs: [{ text: "- Auto-formatting", style: { fontSize: 12, color: "#FECACA" } }], spaceAfter: 2 },
        { runs: [{ text: "- Content generation", style: { fontSize: 12, color: "#FECACA" } }] },
      ],
    },
  ],
};

const metricsSlide: PaperSlide = {
  backgroundColor: "#FFFFFF",
  children: [
    {
      type: "Text",
      content: "Key Metrics",
      style: {
        position: "absolute",
        top: 30,
        left: 60,
        width: 600,
        height: 50,
        fontSize: 32,
        fontWeight: "bold",
        color: "#0F172A",
      },
    },
    {
      type: "Chart",
      style: {
        position: "absolute",
        top: 100,
        left: 60,
        width: 1160,
        height: 520,
      },
      chartData: {
        chartType: "line",
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        series: [
          { name: "Revenue ($K)", values: [820, 910, 1050, 1180, 1340, 1520], color: "#2563EB" },
          { name: "Users (K)", values: [120, 145, 180, 210, 260, 310], color: "#059669" },
        ],
        valueAxis: { title: "Value" },
        categoryAxis: { title: "Month" },
      },
    },
  ],
};

const conclusionSlide: PaperSlide = {
  backgroundColor: "#0F172A",
  children: [
    {
      type: "Text",
      content: "Next Steps",
      style: {
        position: "absolute",
        top: 180,
        left: 120,
        width: 1040,
        height: 60,
        fontSize: 40,
        fontWeight: "bold",
        color: "#FFFFFF",
        textAlign: "center",
      },
    },
    {
      type: "Text",
      paragraphs: [
        { runs: [{ text: "1. Finalize Q2 feature scope by April 1", style: { fontSize: 20, color: "#CBD5E1" } }], spaceAfter: 8 },
        { runs: [{ text: "2. Begin enterprise pilot program", style: { fontSize: 20, color: "#CBD5E1" } }], spaceAfter: 8 },
        { runs: [{ text: "3. Schedule board review for funding round", style: { fontSize: 20, color: "#CBD5E1" } }] },
      ],
      style: {
        position: "absolute",
        top: 280,
        left: 240,
        width: 800,
        height: 200,
        textAlign: "center",
      },
    },
    {
      type: "Text",
      content: "Questions?",
      style: {
        position: "absolute",
        top: 540,
        left: 120,
        width: 1040,
        height: 40,
        fontSize: 18,
        color: "#64748B",
        textAlign: "center",
      },
    },
  ],
};

const doc: PaperDocument = {
  meta: { title: "Product Strategy 2025", author: "Strategy Team" },
  slides: [titleSlide, marketSlide, roadmapSlide, metricsSlide, conclusionSlide],
};

const pptx = await PaperEngine.render(doc);
fs.writeFileSync("multi-slide.pptx", pptx);
console.log("Wrote multi-slide.pptx");
