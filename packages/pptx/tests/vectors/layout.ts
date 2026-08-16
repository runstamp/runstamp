import type { PaperDocument } from "../../src/types/ast.js";

/**
 * Layout test vectors (#13–#22)
 *
 * Each vector is a single-slide PaperDocument on a standard 960x540 canvas.
 * Children use distinct backgroundColor values so layout positions are
 * visually verifiable when rendered.
 */
export const layoutVectors: Record<string, PaperDocument> = {
  // ── #13 ─────────────────────────────────────────────────────────────────
  // flexDirection: "row" with 3 children
  "layout-row": {
    type: "Document",
    meta: { title: "layout-row" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540, flexDirection: "row" },
        children: [
          {
            type: "View",
            style: { width: 200, height: 200, backgroundColor: "#E74C3C" },
          },
          {
            type: "View",
            style: { width: 200, height: 200, backgroundColor: "#2ECC71" },
          },
          {
            type: "View",
            style: { width: 200, height: 200, backgroundColor: "#3498DB" },
          },
        ],
      },
    ],
  },

  // ── #14 ─────────────────────────────────────────────────────────────────
  // flexDirection: "column" with 3 children
  "layout-column": {
    type: "Document",
    meta: { title: "layout-column" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540, flexDirection: "column" },
        children: [
          {
            type: "View",
            style: { width: 300, height: 120, backgroundColor: "#E74C3C" },
          },
          {
            type: "View",
            style: { width: 300, height: 120, backgroundColor: "#F39C12" },
          },
          {
            type: "View",
            style: { width: 300, height: 120, backgroundColor: "#9B59B6" },
          },
        ],
      },
    ],
  },

  // ── #15 ─────────────────────────────────────────────────────────────────
  // justifyContent: "center" — children clustered in the center of main axis
  "layout-justify-center": {
    type: "Document",
    meta: { title: "layout-justify-center" },
    slides: [
      {
        type: "Slide",
        style: {
          width: 960,
          height: 540,
          flexDirection: "row",
          justifyContent: "center",
        },
        children: [
          {
            type: "View",
            style: { width: 150, height: 150, backgroundColor: "#1ABC9C" },
          },
          {
            type: "View",
            style: { width: 150, height: 150, backgroundColor: "#E67E22" },
          },
          {
            type: "View",
            style: { width: 150, height: 150, backgroundColor: "#8E44AD" },
          },
        ],
      },
    ],
  },

  // ── #16 ─────────────────────────────────────────────────────────────────
  // justifyContent: "space-between" — children spread with equal gaps
  "layout-justify-space-between": {
    type: "Document",
    meta: { title: "layout-justify-space-between" },
    slides: [
      {
        type: "Slide",
        style: {
          width: 960,
          height: 540,
          flexDirection: "row",
          justifyContent: "space-between",
        },
        children: [
          {
            type: "View",
            style: { width: 180, height: 180, backgroundColor: "#C0392B" },
          },
          {
            type: "View",
            style: { width: 180, height: 180, backgroundColor: "#27AE60" },
          },
          {
            type: "View",
            style: { width: 180, height: 180, backgroundColor: "#2980B9" },
          },
        ],
      },
    ],
  },

  // ── #17 ─────────────────────────────────────────────────────────────────
  // alignItems: "center" — children centered on cross axis
  "layout-align-center": {
    type: "Document",
    meta: { title: "layout-align-center" },
    slides: [
      {
        type: "Slide",
        style: {
          width: 960,
          height: 540,
          flexDirection: "row",
          alignItems: "center",
        },
        children: [
          {
            type: "View",
            style: { width: 200, height: 100, backgroundColor: "#D35400" },
          },
          {
            type: "View",
            style: { width: 200, height: 200, backgroundColor: "#16A085" },
          },
          {
            type: "View",
            style: { width: 200, height: 60, backgroundColor: "#7F8C8D" },
          },
        ],
      },
    ],
  },

  // ── #18 ─────────────────────────────────────────────────────────────────
  // Uniform + individual padding
  "layout-padding": {
    type: "Document",
    meta: { title: "layout-padding" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540, flexDirection: "column" },
        children: [
          // Uniform padding on all sides
          {
            type: "View",
            style: {
              width: 400,
              height: 200,
              padding: 40,
              backgroundColor: "#2C3E50",
              flexDirection: "row",
            },
            children: [
              {
                type: "View",
                style: {
                  width: 100,
                  height: 100,
                  backgroundColor: "#E74C3C",
                },
              },
            ],
          },
          // Individual padding per side
          {
            type: "View",
            style: {
              width: 400,
              height: 200,
              paddingTop: 10,
              paddingRight: 60,
              paddingBottom: 30,
              paddingLeft: 20,
              backgroundColor: "#34495E",
              flexDirection: "row",
            },
            children: [
              {
                type: "View",
                style: {
                  width: 100,
                  height: 100,
                  backgroundColor: "#F1C40F",
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ── #19 ─────────────────────────────────────────────────────────────────
  // Individual margin values on children
  "layout-margin": {
    type: "Document",
    meta: { title: "layout-margin" },
    slides: [
      {
        type: "Slide",
        style: {
          width: 960,
          height: 540,
          flexDirection: "column",
          backgroundColor: "#ECF0F1",
        },
        children: [
          {
            type: "View",
            style: {
              width: 200,
              height: 100,
              marginTop: 20,
              marginLeft: 50,
              backgroundColor: "#E74C3C",
            },
          },
          {
            type: "View",
            style: {
              width: 200,
              height: 100,
              marginTop: 30,
              marginRight: 40,
              marginBottom: 10,
              marginLeft: 100,
              backgroundColor: "#3498DB",
            },
          },
          {
            type: "View",
            style: {
              width: 200,
              height: 100,
              margin: 25,
              backgroundColor: "#2ECC71",
            },
          },
        ],
      },
    ],
  },

  // ── #20 ─────────────────────────────────────────────────────────────────
  // Percentage-based widths on children
  "layout-percent-width": {
    type: "Document",
    meta: { title: "layout-percent-width" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540, flexDirection: "row" },
        children: [
          {
            type: "View",
            style: {
              width: "50%" as `${number}%`,
              height: 200,
              backgroundColor: "#8E44AD",
            },
          },
          {
            type: "View",
            style: {
              width: "50%" as `${number}%`,
              height: 200,
              backgroundColor: "#F39C12",
            },
          },
        ],
      },
    ],
  },

  // ── #21 ─────────────────────────────────────────────────────────────────
  // Absolute positioning with top/left
  "layout-absolute-position": {
    type: "Document",
    meta: { title: "layout-absolute-position" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          // Relatively-positioned background
          {
            type: "View",
            style: {
              width: 960,
              height: 540,
              backgroundColor: "#BDC3C7",
            },
          },
          // Absolute: top-left corner
          {
            type: "View",
            style: {
              position: "absolute",
              top: 20,
              left: 20,
              width: 150,
              height: 150,
              backgroundColor: "#E74C3C",
            },
          },
          // Absolute: offset toward center
          {
            type: "View",
            style: {
              position: "absolute",
              top: 200,
              left: 400,
              width: 160,
              height: 160,
              backgroundColor: "#2ECC71",
            },
          },
          // Absolute: bottom-right area
          {
            type: "View",
            style: {
              position: "absolute",
              top: 350,
              left: 750,
              width: 140,
              height: 140,
              backgroundColor: "#3498DB",
            },
          },
        ],
      },
    ],
  },

  // ── #22 ─────────────────────────────────────────────────────────────────
  // 5 levels of nested Views
  "layout-deep-nesting": {
    type: "Document",
    meta: { title: "layout-deep-nesting" },
    slides: [
      {
        type: "Slide",
        style: { width: 960, height: 540 },
        children: [
          // Level 1
          {
            type: "View",
            style: {
              width: 800,
              height: 450,
              padding: 20,
              backgroundColor: "#2C3E50",
            },
            children: [
              // Level 2
              {
                type: "View",
                style: {
                  width: 640,
                  height: 350,
                  padding: 20,
                  backgroundColor: "#8E44AD",
                },
                children: [
                  // Level 3
                  {
                    type: "View",
                    style: {
                      width: 480,
                      height: 250,
                      padding: 20,
                      backgroundColor: "#2980B9",
                    },
                    children: [
                      // Level 4
                      {
                        type: "View",
                        style: {
                          width: 320,
                          height: 150,
                          padding: 20,
                          backgroundColor: "#27AE60",
                        },
                        children: [
                          // Level 5
                          {
                            type: "View",
                            style: {
                              width: 160,
                              height: 80,
                              backgroundColor: "#F39C12",
                            },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};
