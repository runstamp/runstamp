/**
 * T2: Investment Banking Pitch Book (38 slides)
 * IB-style pitch book with dense comp tables, football field, combo charts,
 * DCF sensitivity, S&U, buyer profiles, and Gantt timeline.
 */
import type {
  PaperDocument, PaperSlide, PaperNode, PaperChart, PaperView, PaperText, PaperImage,
} from "../../../src/types/ast.js";
import {
  makeDoc, mbbTitleSlide, sectionDivider, contentSlide, financialTable,
  footballFieldChart, ganttTimeline, textNode, richText, bulletList,
  accentBar, sourceFooter, actionTitle, card, photoGrid, kpiTile, kpiGrid,
  connector, pt,
  MBB_NAVY, MBB_BLUE, WHITE, OFF_WHITE, LIGHT_GRAY, MID_GRAY, DARK_GRAY,
  GREEN, RED, AMBER, DARK_GRADIENT, CONTENT_BG,
  LOGO_PLACEHOLDER, PHOTO_PLACEHOLDER,
  IB_BLUE, TABLE_ALT_ROW,
} from "../helpers/templateHelpers.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const IB_LIGHT = "#E8EEF4";
const BANK_NAME = "Meridian Capital Partners";
const CLIENT_NAME = "Apex Industries, Inc.";
const CODENAME = "Project Atlas";
const DEAL_DATE = "March 2026";

/** Bank logo placeholder on every slide (bottom-right) */
function bankLogo(): PaperNode {
  return {
    type: "Image",
    src: LOGO_PLACEHOLDER,
    style: { position: "absolute", bottom: 16, right: 27, width: 107, height: 32 },
  } as PaperImage;
}

/** Slide number text (bottom-center) */
function slideNumber(n: number): PaperNode {
  return textNode(String(n), {
    position: "absolute", bottom: 13, left: 613, width: 53,
    fontSize: pt(8), color: MID_GRAY, textAlign: "center",
  });
}

/** Confidential footer */
function confidentialFooter(): PaperNode {
  return textNode("CONFIDENTIAL", {
    position: "absolute", bottom: 13, left: 55,
    fontSize: pt(8), color: MID_GRAY, letterSpacing: 2,
  });
}

// ---------------------------------------------------------------------------
// Slide 1: Cover Page
// ---------------------------------------------------------------------------
const coverSlide: PaperSlide = {
  type: "Slide",
  background: {
    type: "gradient",
    angle: 160,
    stops: [
      { color: "#001529", position: 0 },
      { color: "#002952", position: 50 },
      { color: IB_BLUE, position: 100 },
    ],
  },
  children: [
    accentBar("#C9A84C"),
    { type: "Image", src: LOGO_PLACEHOLDER, style: {
      position: "absolute", top: 80, left: 80, width: 160, height: 48,
    } } as PaperImage,
    textNode(BANK_NAME, {
      position: "absolute", top: 147, left: 80, width: 667,
      fontSize: pt(16), color: MID_GRAY, letterSpacing: 1,
    }),
    textNode(CODENAME, {
      position: "absolute", top: 227, left: 80, width: 1120,
      fontSize: pt(36), fontWeight: "bold", color: WHITE,
    }),
    textNode(`Confidential Discussion Materials Prepared for ${CLIENT_NAME}`, {
      position: "absolute", top: 307, left: 80, width: 933,
      fontSize: pt(16), color: MID_GRAY,
    }),
    textNode(DEAL_DATE, {
      position: "absolute", top: 360, left: 80,
      fontSize: pt(12), color: MID_GRAY,
    }),
    textNode("CONFIDENTIAL", {
      position: "absolute", bottom: 53, left: 80,
      fontSize: pt(10), fontWeight: "bold", color: "#C9A84C", letterSpacing: 3,
    }),
    bankLogo(),
  ],
};

// ---------------------------------------------------------------------------
// Slide 2: Table of Contents
// ---------------------------------------------------------------------------
const tocSlide = contentSlide(
  "Table of Contents",
  [
    financialTable(
      ["Section", "Page"],
      [
        ["I.   Executive Summary", "3"],
        ["II.  Team & Credentials", "4"],
        ["III. Market Overview", "6"],
        ["IV.  Company Overview", "9"],
        ["V.   Valuation & Transaction Analysis", "11"],
        ["VI.  Appendix", "34"],
      ],
      {
        columnWidths: [800, 133],
        alternatingRows: true,
        style: { top: 120, left: 80 },
      },
    ),
    bankLogo(),
    slideNumber(2),
  ],
);

// ---------------------------------------------------------------------------
// Slide 3: Executive Summary
// ---------------------------------------------------------------------------
const execSummarySlide = contentSlide(
  "Apex represents a compelling acquisition target at $1.6B–$2.1B implied enterprise value",
  [
    bulletList(
      [
        { text: "Situation Overview: Apex Industries is a market leader in specialty industrial components with $1.25B LTM revenue and 22.7% EBITDA margins" },
        { text: "The Company has retained Meridian Capital Partners to evaluate strategic alternatives, including a potential sale process", level: 1 },
        { text: "Valuation Range: Based on our analysis across DCF, comparable companies, and precedent transactions, we estimate an enterprise value of $1.6B–$2.1B" },
        { text: "DCF analysis: $1.65B–$1.95B (WACC: 9.0%–11.0%)", level: 1 },
        { text: "Comparable companies: $1.55B–$1.85B (12.5x–14.8x EV/EBITDA)", level: 1 },
        { text: "Precedent transactions: $1.75B–$2.10B (14.0x–16.8x EV/EBITDA)", level: 1 },
        { text: "Recommendation: We recommend pursuing a targeted dual-track process, engaging 8–10 strategic and financial buyers over a 12-week timeline" },
      ],
      { position: "absolute", top: 105, left: 67, width: 1147, fontSize: pt(10) },
    ),
    bankLogo(),
    slideNumber(3),
  ],
  "Source: Meridian Capital Partners analysis, company financials",
  { notes: "Emphasize the $1.6B–$2.1B valuation range and the dual-track process recommendation as key takeaways for the board." },
);

// ---------------------------------------------------------------------------
// Slide 4: Team Bios (Photo Grid)
// ---------------------------------------------------------------------------
const teamBiosSlide = contentSlide(
  "Meridian brings deep sector expertise with 40+ years of combined M&A experience",
  [
    photoGrid(
      [PHOTO_PLACEHOLDER, PHOTO_PLACEHOLDER, PHOTO_PLACEHOLDER, PHOTO_PLACEHOLDER, PHOTO_PLACEHOLDER, PHOTO_PLACEHOLDER],
      3,
      { top: 105, left: 67, width: 1147, height: 267, gap: 16 },
    ),
    // Team member names
    textNode("J. Harrison, MD  •  S. Chen, MD  •  R. Patel, VP  •  M. Torres, VP  •  A. Kim, Associate  •  L. Wright, Analyst", {
      position: "absolute", top: 400, left: 67, width: 1147,
      fontSize: pt(9), color: DARK_GRAY, textAlign: "center",
    }),
    bulletList(
      [
        { text: "200+ completed M&A transactions totaling $45B+ in aggregate value" },
        { text: "Sector expertise: industrials, specialty manufacturing, aerospace & defense" },
        { text: "Average managing director tenure: 18 years in investment banking" },
      ],
      { position: "absolute", top: 453, left: 67, width: 1147, fontSize: pt(10) },
    ),
    bankLogo(),
    slideNumber(4),
  ],
);

// ---------------------------------------------------------------------------
// Slide 5: League Table Rankings & Credentials
// ---------------------------------------------------------------------------
const credentialsSlide = contentSlide(
  "Meridian ranks #3 in mid-market industrials M&A by deal count over the past 5 years",
  [
    financialTable(
      ["Rank", "Advisor", "Deals", "Agg. Value ($B)"],
      [
        ["1", "Goldman Sachs", "87", "$142.5"],
        ["2", "J.P. Morgan", "74", "$128.3"],
        ["3", "Meridian Capital", "68", "$48.7"],
        ["4", "Morgan Stanley", "62", "$110.2"],
        ["5", "Lazard", "55", "$65.4"],
      ],
      {
        columnWidths: [80, 333, 133, 187],
        alternatingRows: true,
        style: { top: 105, left: 67 },
      },
    ),
    textNode("Selected Recent Transactions", {
      position: "absolute", top: 387, left: 67, width: 533,
      fontSize: pt(12), fontWeight: "bold", color: IB_BLUE,
    }),
    bulletList(
      [
        { text: "Sale of Precision Components Corp. to Honeywell — $780.0m (14.2x EBITDA)" },
        { text: "Sale of Atlas Manufacturing to PE consortium — $1.2B (12.8x EBITDA)" },
        { text: "Acquisition of Delta Systems by client — $425.0m (11.5x EBITDA)" },
      ],
      { position: "absolute", top: 427, left: 67, width: 1147, fontSize: pt(10) },
    ),
    bankLogo(),
    slideNumber(5),
  ],
  "Source: Dealogic, mid-market industrials ($100m–$2B EV), 2021–2025",
);

// ---------------------------------------------------------------------------
// Slide 6: Market Overview — Sector M&A Volume (Bar Chart, 10 years)
// ---------------------------------------------------------------------------
const sectorMASlide = contentSlide(
  "Industrial sector M&A volume recovered to pre-pandemic levels, reaching $185B in 2025",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 507 },
      chartData: {
        chartType: "bar",
        barGrouping: "clustered",
        barDirection: "col",
        categories: ["2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"],
        series: [
          {
            name: "Deal Value ($B)",
            values: [120, 135, 155, 160, 95, 140, 170, 150, 165, 185],
            color: IB_BLUE,
          },
          {
            name: "Deal Count",
            values: [280, 310, 345, 360, 210, 320, 375, 340, 365, 395],
            color: "#5B9BD5",
          },
        ],
        valueAxis: { title: "Deal Value ($B)", numberFormat: "$#,##0" },
        legend: { position: "bottom" },
        dataLabels: { showVal: false },
      },
    } as PaperChart,
    bankLogo(),
    slideNumber(6),
  ],
  "Source: Dealogic, industrial sector M&A transactions globally",
  { notes: "Highlight that 2025 deal volume exceeded the 2019 peak, signaling a strong seller's market for Apex." },
);

// ---------------------------------------------------------------------------
// Slide 7: Market Overview — Capital Markets Conditions (Line Chart)
// ---------------------------------------------------------------------------
const capitalMarketsSlide = contentSlide(
  "Favorable credit conditions support leveraged transaction structures at attractive spreads",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 507 },
      chartData: {
        chartType: "line",
        categories: ["Q1'24", "Q2'24", "Q3'24", "Q4'24", "Q1'25", "Q2'25", "Q3'25", "Q4'25", "Q1'26"],
        series: [
          { name: "Senior Secured (bps)", values: [425, 400, 390, 375, 365, 350, 340, 335, 325], color: IB_BLUE },
          { name: "High Yield (bps)", values: [550, 530, 510, 495, 480, 465, 450, 440, 430], color: RED },
          { name: "Investment Grade (bps)", values: [150, 145, 140, 135, 130, 128, 125, 122, 120], color: GREEN },
        ],
        valueAxis: { title: "Spread (bps)", numberFormat: "#,##0" },
        legend: { position: "bottom" },
      },
    } as PaperChart,
    bankLogo(),
    slideNumber(7),
  ],
  "Source: LCD, ICE BofA indices as of March 2026",
);

// ---------------------------------------------------------------------------
// Slide 8: Market Overview — Market Multiples Trend
// ---------------------------------------------------------------------------
const marketMultiplesSlide = contentSlide(
  "Industrial EV/EBITDA multiples expanded to 13.5x, driven by scarcity of quality assets",
  [
    {
      type: "Chart",
      style: { position: "absolute", top: 105, left: 55, width: 1170, height: 507 },
      chartData: {
        chartType: "line",
        categories: ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"],
        series: [
          { name: "EV/EBITDA (Industrials)", values: [10.5, 11.0, 9.2, 12.0, 12.5, 11.8, 12.8, 13.5], color: IB_BLUE },
          { name: "EV/EBITDA (S&P 500)", values: [12.8, 13.2, 14.5, 16.0, 14.2, 13.8, 14.5, 15.0], color: MID_GRAY },
          { name: "EV/Revenue (Industrials)", values: [2.2, 2.4, 1.8, 2.8, 3.0, 2.7, 3.1, 3.4], color: "#5B9BD5" },
        ],
        valueAxis: { title: "Multiple (x)", numberFormat: "0.0x" },
        legend: { position: "bottom" },
      },
    } as PaperChart,
    bankLogo(),
    slideNumber(8),
  ],
  "Source: FactSet, S&P Capital IQ as of March 2026",
);

// ---------------------------------------------------------------------------
// Slide 9: Company Overview — Business Description
// ---------------------------------------------------------------------------
const companyOverviewSlide = contentSlide(
  "Apex is a diversified industrial leader with #1 or #2 position across three core segments",
  [
    bulletList(
      [
        { text: "Founded in 1987; headquartered in Chicago, IL; ~4,200 employees across 12 facilities" },
        { text: "LTM Revenue: $1,250.0m | LTM EBITDA: $283.8m | EBITDA Margin: 22.7%" },
        { text: "Three operating segments:" },
        { text: "Precision Components (48% of revenue) — aerospace & defense fasteners, connectors", level: 1 },
        { text: "Engineered Solutions (32% of revenue) — custom industrial assemblies", level: 1 },
        { text: "Aftermarket Services (20% of revenue) — high-margin MRO and replacement parts", level: 1 },
        { text: "90%+ customer retention rate; 65% of revenue under long-term contracts" },
        { text: "Key competitive advantages: proprietary manufacturing processes, FAA/DOD certifications, switching costs" },
      ],
      { position: "absolute", top: 105, left: 67, width: 667, fontSize: pt(10) },
    ),
    {
      type: "Chart",
      style: { position: "absolute", top: 133, left: 773, width: 467, height: 373 },
      chartData: {
        chartType: "pie",
        categories: ["Precision Components", "Engineered Solutions", "Aftermarket Services"],
        series: [{
          name: "Revenue Mix",
          values: [48, 32, 20],
          pointColors: [IB_BLUE, "#5B9BD5", "#A5C8E1"],
        }],
        legend: { position: "bottom" },
        dataLabels: { showVal: true, position: "outEnd" },
      },
    } as PaperChart,
    bankLogo(),
    slideNumber(9),
  ],
  "Source: Company management, Meridian Capital Partners analysis",
  { notes: "Walk through the revenue mix pie chart and stress the high-margin Aftermarket Services segment as a key value driver." },
);

// ---------------------------------------------------------------------------
// Slide 10: Company Overview — Org Structure & End Markets
// ---------------------------------------------------------------------------
const orgStructureSlide = contentSlide(
  "Decentralized operating model enables segment-level accountability and margin optimization",
  [
    // Simple org chart via text + connectors
    card(
      [textNode("CEO — R. Mitchell", { fontSize: pt(10), fontWeight: "bold", color: WHITE, textAlign: "center" })],
      { width: 267, height: 53, bg: IB_BLUE, style: { position: "absolute", top: 113, left: 507 } },
    ),
    card(
      [textNode("Precision Components\nGM: J. Davis\nRevenue: $600.0m", { fontSize: pt(8), color: DARK_GRAY, textAlign: "center" })],
      { width: 240, height: 73, style: { position: "absolute", top: 227, left: 133 } },
    ),
    card(
      [textNode("Engineered Solutions\nGM: K. Nakamura\nRevenue: $400.0m", { fontSize: pt(8), color: DARK_GRAY, textAlign: "center" })],
      { width: 240, height: 73, style: { position: "absolute", top: 227, left: 520 } },
    ),
    card(
      [textNode("Aftermarket Services\nGM: L. Fernandez\nRevenue: $250.0m", { fontSize: pt(8), color: DARK_GRAY, textAlign: "center" })],
      { width: 240, height: 73, style: { position: "absolute", top: 227, left: 907 } },
    ),
    connector(640, 167, 640, 227, { color: IB_BLUE, width: 2 }),
    connector(253, 193, 640, 193, { color: IB_BLUE }),
    connector(253, 193, 253, 227, { color: IB_BLUE }),
    connector(1027, 193, 640, 193, { color: IB_BLUE }),
    connector(1027, 193, 1027, 227, { color: IB_BLUE }),
    // End market diversification
    textNode("End Market Diversification", {
      position: "absolute", top: 347, left: 67, width: 533,
      fontSize: pt(12), fontWeight: "bold", color: IB_BLUE,
    }),
    {
      type: "Chart",
      style: { position: "absolute", top: 380, left: 67, width: 533, height: 267 },
      chartData: {
        chartType: "pie",
        categories: ["Aerospace & Defense", "Industrial OEM", "Energy", "Transportation", "Other"],
        series: [{
          name: "End Markets",
          values: [35, 25, 18, 14, 8],
          pointColors: [IB_BLUE, "#5B9BD5", "#A5C8E1", GREEN, MID_GRAY],
        }],
        legend: { position: "right" },
        dataLabels: { showVal: true },
      },
    } as PaperChart,
    bankLogo(),
    slideNumber(10),
  ],
  "Source: Company management",
);

// ---------------------------------------------------------------------------
// Slides 11–13: Financial Analysis (Historical Income Statement)
// ---------------------------------------------------------------------------

// Slide 11: Revenue & Gross Profit
const financialsSlide1 = contentSlide(
  "Revenue grew at 12.3% CAGR over the past 5 years, with gross margins expanding 280bps",
  [
    financialTable(
      ["($m)", "FY21A", "FY22A", "FY23A", "FY24A", "FY25A", "FY21-25 CAGR"],
      [
        ["Revenue", "$780.0", "$892.0", "$1,005.0", "$1,125.0", "$1,250.0", "12.5%"],
        ["  Growth %", "—", "14.4%", "12.7%", "11.9%", "11.1%", ""],
        ["COGS", "($460.2)", "($521.8)", "($582.9)", "($641.3)", "($693.8)", ""],
        ["Gross Profit", "$319.8", "$370.2", "$422.1", "$483.8", "$556.3", "14.8%"],
        ["  Gross Margin %", "41.0%", "41.5%", "42.0%", "43.0%", "44.5%", "+350bps"],
      ],
      {
        mergedHeaderGroups: [
          { text: "", colSpan: 1 },
          { text: "Historical Financials", colSpan: 5 },
          { text: "", colSpan: 1 },
        ],
        columnWidths: [173, 120, 120, 120, 120, 120, 133],
        alternatingRows: true,
        style: { top: 105, left: 55 },
      },
    ),
    bankLogo(),
    slideNumber(11),
  ],
  "Source: Company filings, audited financial statements",
);

// Slide 12: EBITDA & Margins
const financialsSlide2 = contentSlide(
  "EBITDA margins expanded from 18.5% to 22.7%, driven by operating leverage and mix shift",
  [
    financialTable(
      ["($m)", "FY21A", "FY22A", "FY23A", "FY24A", "FY25A", "FY21-25 CAGR"],
      [
        ["Gross Profit", "$319.8", "$370.2", "$422.1", "$483.8", "$556.3", "14.8%"],
        ["SG&A", "($132.6)", "($147.2)", "($160.8)", "($174.4)", "($187.5)", ""],
        ["  SG&A % of Revenue", "17.0%", "16.5%", "16.0%", "15.5%", "15.0%", "(200bps)"],
        ["R&D", "($42.9)", "($47.3)", "($52.3)", "($56.3)", "($62.5)", ""],
        ["  R&D % of Revenue", "5.5%", "5.3%", "5.2%", "5.0%", "5.0%", "(50bps)"],
        ["EBITDA", "$144.3", "$175.7", "$209.0", "$253.1", "$283.8", "18.4%"],
        ["  EBITDA Margin %", "18.5%", "19.7%", "20.8%", "22.5%", "22.7%", "+420bps"],
        ["D&A", "($31.2)", "($35.7)", "($40.2)", "($45.0)", "($50.0)", ""],
        ["EBIT", "$113.1", "$140.0", "$168.8", "$208.1", "$233.8", "19.9%"],
        ["  EBIT Margin %", "14.5%", "15.7%", "16.8%", "18.5%", "18.7%", "+420bps"],
      ],
      {
        mergedHeaderGroups: [
          { text: "", colSpan: 1 },
          { text: "Profitability Metrics", colSpan: 5 },
          { text: "", colSpan: 1 },
        ],
        columnWidths: [187, 113, 113, 113, 113, 113, 133],
        alternatingRows: true,
        style: { top: 100, left: 55 },
      },
    ),
    bankLogo(),
    slideNumber(12),
  ],
  "Source: Company filings, audited financial statements",
);

// Slide 13: Cash Flow & Balance Sheet
const financialsSlide3 = contentSlide(
  "Strong free cash flow generation of $180m+ supports deleveraging and growth investment",
  [
    financialTable(
      ["($m)", "FY21A", "FY22A", "FY23A", "FY24A", "FY25A"],
      [
        ["EBITDA", "$144.3", "$175.7", "$209.0", "$253.1", "$283.8"],
        ["(-) Capex", "($27.3)", "($31.2)", "($35.2)", "($39.4)", "($43.8)"],
        ["  % of Revenue", "3.5%", "3.5%", "3.5%", "3.5%", "3.5%"],
        ["(-) Change in NWC", "($8.6)", "($12.4)", "($10.1)", "($13.5)", "($11.3)"],
        ["(-) Cash Taxes", "($28.3)", "($35.0)", "($42.2)", "($52.0)", "($58.5)"],
        ["Unlevered FCF", "$80.1", "$97.1", "$121.5", "$148.2", "$170.2"],
        ["  FCF Conversion", "55.5%", "55.3%", "58.1%", "58.6%", "60.0%"],
        ["", "", "", "", "", ""],
        ["Net Debt", "$280.0", "$245.0", "$210.0", "$175.0", "$140.0"],
        ["Net Debt / EBITDA", "1.9x", "1.4x", "1.0x", "0.7x", "0.5x"],
      ],
      {
        mergedHeaderGroups: [
          { text: "", colSpan: 1 },
          { text: "Cash Flow & Leverage", colSpan: 5 },
        ],
        columnWidths: [187, 147, 147, 147, 147, 147],
        alternatingRows: true,
        style: { top: 100, left: 55 },
      },
    ),
    bankLogo(),
    slideNumber(13),
  ],
  "Source: Company filings, audited financial statements",
);

// ---------------------------------------------------------------------------
// Slides 14–15: Comparable Company Analysis (dense 12co × 15col)
// ---------------------------------------------------------------------------
const compHeaders = [
  "Company", "Price", "Mkt Cap", "EV", "Rev", "EBITDA",
  "EV/Rev", "EV/EBITDA", "P/E", "EV/FCF",
  "Gross %", "EBITDA %", "Net %",
  "Rev Gr%", "EPS Gr%",
];

const compRows: (string | number)[][] = [
  ["Apex Industries", "$48.50", "$3,200", "$3,340", "$1,250", "$284", "2.7x", "11.8x", "22.5x", "19.6x", "44.5%", "22.7%", "12.8%", "11.1%", "14.2%"],
  ["Honeywell Intl", "$215.30", "$145,200", "$162,400", "$37,400", "$8,950", "4.3x", "18.1x", "28.5x", "24.2x", "38.2%", "23.9%", "14.5%", "5.8%", "8.2%"],
  ["Parker Hannifin", "$485.60", "$63,100", "$72,500", "$19,800", "$4,360", "3.7x", "16.6x", "25.8x", "21.4x", "36.5%", "22.0%", "13.2%", "7.5%", "11.5%"],
  ["Illinois Tool Wks", "$252.40", "$75,600", "$79,200", "$16,100", "$4,190", "4.9x", "18.9x", "26.2x", "23.8x", "42.8%", "26.0%", "17.5%", "3.2%", "6.8%"],
  ["Emerson Electric", "$112.80", "$65,400", "$73,800", "$17,500", "$4,025", "4.2x", "18.3x", "27.0x", "22.5x", "40.5%", "23.0%", "14.0%", "4.5%", "9.2%"],
  ["Roper Technologies", "$545.20", "$58,900", "$64,200", "$6,300", "$2,270", "10.2x", "28.3x", "35.2x", "30.1x", "68.5%", "36.0%", "22.5%", "12.0%", "15.8%"],
  ["Ametek Inc", "$175.40", "$40,800", "$43,500", "$6,800", "$1,836", "6.4x", "23.7x", "30.5x", "26.8x", "35.8%", "27.0%", "16.2%", "8.5%", "12.4%"],
  ["Fortive Corp", "$78.90", "$27,400", "$30,100", "$6,200", "$1,550", "4.9x", "19.4x", "24.8x", "20.5x", "58.2%", "25.0%", "15.8%", "6.2%", "10.5%"],
  ["Nordson Corp", "$245.80", "$14,100", "$15,800", "$2,700", "$756", "5.9x", "20.9x", "28.2x", "24.0x", "55.2%", "28.0%", "16.5%", "5.8%", "8.0%"],
  ["Watts Water Tech", "$198.50", "$6,600", "$7,100", "$2,050", "$410", "3.5x", "17.3x", "25.5x", "21.2x", "42.0%", "20.0%", "12.0%", "4.2%", "7.5%"],
  ["RBC Bearings", "$285.60", "$8,300", "$9,800", "$1,600", "$432", "6.1x", "22.7x", "32.0x", "27.5x", "42.5%", "27.0%", "14.8%", "9.8%", "13.2%"],
  ["Barnes Group", "$42.80", "$2,100", "$3,200", "$1,300", "$247", "2.5x", "13.0x", "18.5x", "15.8x", "32.8%", "19.0%", "8.5%", "3.5%", "5.2%"],
];

const compSummaryRows: (string | number)[][] = [
  ["Mean", "", "", "", "", "", "4.8x", "19.1x", "27.1x", "23.1x", "44.8%", "24.9%", "14.9%", "6.8%", "10.2%"],
  ["Median", "", "", "", "", "", "4.6x", "18.6x", "26.6x", "22.5x", "42.3%", "24.5%", "14.4%", "6.0%", "9.9%"],
  ["25th Percentile", "", "", "", "", "", "3.6x", "17.0x", "24.9x", "20.6x", "37.0%", "22.3%", "12.6%", "4.4%", "7.6%"],
  ["75th Percentile", "", "", "", "", "", "6.2x", "21.6x", "29.9x", "25.0x", "54.5%", "27.0%", "16.4%", "9.5%", "12.6%"],
];

const compTableSlide1 = contentSlide(
  "Apex trades at a discount to peers on EV/EBITDA, reflecting upside in a change-of-control scenario",
  [
    financialTable(
      compHeaders,
      [...compRows.slice(0, 6), ...compSummaryRows.slice(0, 2)],
      {
        mergedHeaderGroups: [
          { text: "Company", colSpan: 1 },
          { text: "Market Data", colSpan: 3 },
          { text: "Financials ($m)", colSpan: 2 },
          { text: "Valuation Multiples", colSpan: 4 },
          { text: "Margins", colSpan: 3 },
          { text: "Growth", colSpan: 2 },
        ],
        columnWidths: [147, 64, 69, 69, 64, 67, 61, 72, 56, 61, 61, 67, 53, 64, 64],
        alternatingRows: true,
        style: { top: 93, left: 27 },
        headerStyle: {
          fill: IB_BLUE, color: WHITE, fontWeight: "bold", fontSize: pt(8),
          textAlign: "center", padding: 4,
          borders: { bottom: { width: 2, color: IB_BLUE } },
        },
      },
    ),
    bankLogo(),
    slideNumber(14),
  ],
  "Source: FactSet, company filings as of March 2026. All multiples based on NTM estimates.",
  { notes: "Note that Apex trades at 12.2x NTM EBITDA versus the peer median of 14.1x, implying meaningful upside in a sale." },
);

const compTableSlide2 = contentSlide(
  "Comparable company analysis (cont'd) — smaller-cap peers trade at wider range of multiples",
  [
    financialTable(
      compHeaders,
      [...compRows.slice(6), ...compSummaryRows],
      {
        mergedHeaderGroups: [
          { text: "Company", colSpan: 1 },
          { text: "Market Data", colSpan: 3 },
          { text: "Financials ($m)", colSpan: 2 },
          { text: "Valuation Multiples", colSpan: 4 },
          { text: "Margins", colSpan: 3 },
          { text: "Growth", colSpan: 2 },
        ],
        columnWidths: [147, 64, 69, 69, 64, 67, 61, 72, 56, 61, 61, 67, 53, 64, 64],
        alternatingRows: true,
        style: { top: 93, left: 27 },
        headerStyle: {
          fill: IB_BLUE, color: WHITE, fontWeight: "bold", fontSize: pt(8),
          textAlign: "center", padding: 4,
          borders: { bottom: { width: 2, color: IB_BLUE } },
        },
      },
    ),
    bankLogo(),
    slideNumber(15),
  ],
  "Source: FactSet, company filings as of March 2026. All multiples based on NTM estimates.",
);

// ---------------------------------------------------------------------------
// Slides 16–17: Precedent Transactions
// ---------------------------------------------------------------------------
const precedentHeaders = ["Date", "Target", "Acquirer", "EV ($m)", "EV/Rev", "EV/EBITDA", "Premium", "Deal Type"];

const precedentSlide1 = contentSlide(
  "Precedent industrial transactions command 14.0x–16.8x EV/EBITDA with 25–40% control premiums",
  [
    financialTable(
      precedentHeaders,
      [
        ["Jan-26", "Precision Aero Corp", "Honeywell Intl", "$2,450.0", "3.8x", "16.8x", "35.2%", "Strategic"],
        ["Nov-25", "Atlas Manufacturing", "PE Consortium", "$1,200.0", "3.2x", "14.5x", "28.0%", "LBO"],
        ["Sep-25", "Omega Systems", "Parker Hannifin", "$890.0", "2.9x", "13.2x", "32.5%", "Strategic"],
        ["Jun-25", "Delta Components", "Emerson Electric", "$675.0", "3.5x", "15.0x", "30.8%", "Strategic"],
        ["Mar-25", "Sigma Industries", "KKR", "$1,850.0", "4.1x", "16.2x", "25.4%", "LBO"],
      ],
      {
        columnWidths: [87, 173, 160, 107, 80, 93, 87, 93],
        alternatingRows: true,
        style: { top: 105, left: 55 },
      },
    ),
    bankLogo(),
    slideNumber(16),
  ],
  "Source: Dealogic, company filings, press releases",
);

const precedentSlide2 = contentSlide(
  "Precedent transactions (cont'd) — median EV/EBITDA of 14.8x across 10 transactions",
  [
    financialTable(
      precedentHeaders,
      [
        ["Dec-24", "Vanguard Precision", "Danaher Corp", "$1,550.0", "3.6x", "14.8x", "27.5%", "Strategic"],
        ["Aug-24", "Pinnacle MFG", "Advent Intl", "$920.0", "2.7x", "12.8x", "22.0%", "LBO"],
        ["May-24", "Apex Dynamics", "Roper Technologies", "$2,100.0", "5.2x", "18.5x", "38.2%", "Strategic"],
        ["Jan-24", "CoreTech Systems", "Carlyle Group", "$780.0", "3.0x", "14.0x", "26.8%", "LBO"],
        ["Oct-23", "Titan Industrials", "Illinois Tool Works", "$1,350.0", "3.4x", "15.5x", "33.0%", "Strategic"],
        ["", "", "", "", "", "", "", ""],
        ["Mean", "", "", "$1,376.5", "3.5x", "15.1x", "29.9%", ""],
        ["Median", "", "", "$1,200.0", "3.4x", "14.8x", "28.8%", ""],
      ],
      {
        columnWidths: [87, 173, 160, 107, 80, 93, 87, 93],
        alternatingRows: true,
        style: { top: 105, left: 55 },
      },
    ),
    bankLogo(),
    slideNumber(17),
  ],
  "Source: Dealogic, company filings, press releases",
);

// ---------------------------------------------------------------------------
// Slides 18–19: DCF Analysis
// ---------------------------------------------------------------------------
const dcfAssumptionsSlide = contentSlide(
  "DCF base case implies $1.80B enterprise value at 10.0% WACC and 2.5% terminal growth",
  [
    textNode("Key Assumptions", {
      position: "absolute", top: 96, left: 67,
      fontSize: pt(12), fontWeight: "bold", color: IB_BLUE,
    }),
    financialTable(
      ["Assumption", "Value"],
      [
        ["WACC", "10.0%"],
        ["Terminal Growth Rate", "2.5%"],
        ["Tax Rate", "25.0%"],
        ["Capex (% of Revenue)", "3.5%"],
        ["NWC (% of Rev Change)", "10.0%"],
        ["D&A (% of Revenue)", "4.0%"],
      ],
      {
        columnWidths: [267, 160],
        style: { top: 127, left: 67 },
      },
    ),
    textNode("Projected Free Cash Flows", {
      position: "absolute", top: 96, left: 640,
      fontSize: pt(12), fontWeight: "bold", color: IB_BLUE,
    }),
    financialTable(
      ["($m)", "FY26E", "FY27E", "FY28E", "FY29E", "FY30E", "Terminal"],
      [
        ["Revenue", "$1,400.0", "$1,554.0", "$1,694.0", "$1,830.0", "$1,958.0", ""],
        ["EBITDA", "$336.0", "$388.5", "$432.0", "$476.8", "$519.8", ""],
        ["(-) Taxes", "($63.0)", "($73.5)", "($82.5)", "($92.0)", "($101.0)", ""],
        ["(-) Capex", "($49.0)", "($54.4)", "($59.3)", "($64.1)", "($68.5)", ""],
        ["(-) ΔNWC", "($15.0)", "($15.4)", "($14.0)", "($13.6)", "($12.8)", ""],
        ["UFCF", "$209.0", "$245.2", "$276.2", "$307.1", "$337.5", "$4,593.8"],
      ],
      {
        columnWidths: [93, 96, 96, 96, 96, 96, 96],
        alternatingRows: true,
        style: { top: 127, left: 560 },
        headerStyle: {
          fill: IB_BLUE, color: WHITE, fontWeight: "bold", fontSize: pt(8),
          textAlign: "center", padding: 4,
          borders: { bottom: { width: 2, color: IB_BLUE } },
        },
      },
    ),
    bankLogo(),
    slideNumber(18),
  ],
  "Source: Meridian Capital Partners DCF model, March 2026",
  { notes: "Focus on the UFCF growth trajectory and explain that terminal value accounts for approximately 65% of total enterprise value." },
);

// Slide 19: 5×5 Sensitivity Matrix
const dcfSensitivitySlide = contentSlide(
  "Implied enterprise value of $1.55B–$2.25B across WACC and terminal growth sensitivities",
  [
    financialTable(
      ["WACC \\ TGR", "1.5%", "2.0%", "2.5%", "3.0%", "3.5%"],
      [
        ["8.5%", "$2,050.0", "$2,150.0", "$2,280.0", "$2,450.0", "$2,680.0"],
        ["9.5%", "$1,780.0", "$1,860.0", "$1,960.0", "$2,080.0", "$2,240.0"],
        ["10.0%", "$1,660.0", "$1,730.0", "$1,810.0", "$1,920.0", "$2,050.0"],
        ["10.5%", "$1,560.0", "$1,620.0", "$1,690.0", "$1,780.0", "$1,890.0"],
        ["11.5%", "$1,380.0", "$1,430.0", "$1,490.0", "$1,560.0", "$1,650.0"],
      ],
      {
        mergedHeaderGroups: [
          { text: "", colSpan: 1 },
          { text: "Terminal Growth Rate", colSpan: 5 },
        ],
        alternatingRows: true,
        columnWidths: [160, 147, 147, 147, 147, 147],
        style: { top: 120, left: 105 },
      },
    ),
    textNode("Base case highlighted: WACC 10.0%, TGR 2.5% → EV of $1,810.0m", {
      position: "absolute", top: 453, left: 105, width: 800,
      fontSize: pt(10), fontWeight: "bold", color: IB_BLUE,
    }),
    bankLogo(),
    slideNumber(19),
  ],
  "Source: Meridian Capital Partners DCF model, March 2026",
);

// ---------------------------------------------------------------------------
// Slide 20: Football Field Chart
// ---------------------------------------------------------------------------
const footballFieldSlide = contentSlide(
  "Valuation across all methodologies supports an enterprise value range of $1.6B–$2.1B",
  [
    footballFieldChart([
      { label: "Comparable Companies", low: 1550, high: 1850, color: IB_BLUE },
      { label: "Precedent Transactions", low: 1750, high: 2100, color: "#2E75B6" },
      { label: "DCF Analysis", low: 1650, high: 1950, color: "#5B9BD5" },
      { label: "LBO Analysis", low: 1500, high: 1800, color: GREEN },
      { label: "52-Week Range", low: 1400, high: 1700, color: MID_GRAY },
    ], { currentPrice: 1620, currentPriceLabel: "Current: $1,620m" }),
    bankLogo(),
    slideNumber(20),
  ],
  "Source: Meridian Capital Partners analysis, FactSet",
  { notes: "Use the football field to show convergence across methodologies and anchor the discussion around the $1.8B midpoint." },
);

// ---------------------------------------------------------------------------
// Slides 21–22: Transaction Structure
// ---------------------------------------------------------------------------
const sourcesUsesSlide = contentSlide(
  "Transaction funded through balanced mix of equity and debt; total consideration of $2.1B",
  [
    financialTable(
      ["Sources", "Amount ($m)", "% Total"],
      [
        ["Revolving Credit Facility", "$75.0", "3.6%"],
        ["Term Loan B", "$750.0", "35.7%"],
        ["Senior Unsecured Notes", "$350.0", "16.7%"],
        ["Rollover Equity", "$325.0", "15.5%"],
        ["Sponsor Equity", "$600.0", "28.6%"],
        ["Total Sources", "$2,100.0", "100.0%"],
      ],
      {
        columnWidths: [233, 147, 100],
        style: { position: "absolute", top: 105, left: 55, width: 480 },
      },
    ),
    financialTable(
      ["Uses", "Amount ($m)", "% Total"],
      [
        ["Equity Purchase Price", "$1,680.0", "80.0%"],
        ["Refinance Existing Debt", "$230.0", "11.0%"],
        ["Transaction Fees", "$98.0", "4.7%"],
        ["Financing Fees", "$62.0", "3.0%"],
        ["Cash to Balance Sheet", "$30.0", "1.4%"],
        ["Total Uses", "$2,100.0", "100.0%"],
      ],
      {
        columnWidths: [247, 147, 100],
        style: { position: "absolute", top: 105, left: 680, width: 493 },
      },
    ),
    bankLogo(),
    slideNumber(21),
  ],
  "Source: Meridian Capital Partners, indicative terms subject to market conditions",
);

const proFormaSlide = contentSlide(
  "Pro forma leverage of 4.8x EBITDA with line of sight to rapid deleveraging below 3.0x by Year 3",
  [
    financialTable(
      ["Capital Structure", "Amount ($m)", "Multiple", "Rate", "Maturity"],
      [
        ["Revolving Credit Facility", "$75.0", "0.3x", "SOFR + 275bps", "2031"],
        ["Term Loan B", "$750.0", "2.6x", "SOFR + 350bps", "2033"],
        ["Senior Unsecured Notes", "$350.0", "1.2x", "7.500%", "2034"],
        ["Total Debt", "$1,175.0", "4.1x", "", ""],
        ["Rollover Equity", "$325.0", "", "", ""],
        ["Sponsor Equity", "$600.0", "", "", ""],
        ["Total Capitalization", "$2,100.0", "", "", ""],
      ],
      {
        columnWidths: [240, 133, 107, 160, 107],
        alternatingRows: true,
        style: { top: 105, left: 80 },
      },
    ),
    textNode("Pro Forma Credit Statistics", {
      position: "absolute", top: 413, left: 80, width: 533,
      fontSize: pt(12), fontWeight: "bold", color: IB_BLUE,
    }),
    financialTable(
      ["Metric", "Close", "Year 1", "Year 2", "Year 3"],
      [
        ["Total Debt / EBITDA", "4.1x", "3.6x", "3.1x", "2.6x"],
        ["Senior Secured / EBITDA", "2.9x", "2.5x", "2.1x", "1.7x"],
        ["Interest Coverage", "2.8x", "3.2x", "3.7x", "4.3x"],
        ["FCF / Debt Service", "1.4x", "1.6x", "1.9x", "2.2x"],
      ],
      {
        columnWidths: [240, 133, 133, 133, 133],
        style: { top: 447, left: 80 },
      },
    ),
    bankLogo(),
    slideNumber(22),
  ],
  "Source: Meridian Capital Partners, indicative financing terms",
);

// ---------------------------------------------------------------------------
// Slides 23–30: Potential Buyer Profiles (8 buyers, 1 per slide)
// ---------------------------------------------------------------------------
interface BuyerProfile {
  name: string;
  type: "Strategic" | "Financial Sponsor";
  description: string;
  rationale: string;
  revenue: string;
  ebitda: string;
  evEbitda: string;
  capacity: string;
  fit: string;
}

const buyers: BuyerProfile[] = [
  {
    name: "Honeywell International",
    type: "Strategic",
    description: "Diversified industrial conglomerate with $37.4B revenue. Strong aerospace & defense presence.",
    rationale: "Bolt-on to Aerospace segment; cross-sell aftermarket services to installed base of 50,000+ platforms.",
    revenue: "$37,400.0m", ebitda: "$8,950.0m", evEbitda: "18.1x",
    capacity: "$15.0B+ acquisition capacity", fit: "High",
  },
  {
    name: "Parker Hannifin",
    type: "Strategic",
    description: "Global leader in motion and control technologies with $19.8B revenue.",
    rationale: "Expand precision components portfolio; consolidate supply chain for aerospace customers.",
    revenue: "$19,800.0m", ebitda: "$4,360.0m", evEbitda: "16.6x",
    capacity: "$8.0B+ acquisition capacity", fit: "High",
  },
  {
    name: "Emerson Electric",
    type: "Strategic",
    description: "Technology and engineering company with $17.5B revenue post-portfolio rationalization.",
    rationale: "Strengthen industrial automation adjacency; Apex's aftermarket aligns with recurring revenue strategy.",
    revenue: "$17,500.0m", ebitda: "$4,025.0m", evEbitda: "18.3x",
    capacity: "$10.0B+ acquisition capacity", fit: "Medium–High",
  },
  {
    name: "Illinois Tool Works",
    type: "Strategic",
    description: "Diversified manufacturer with $16.1B revenue and industry-leading 26% EBITDA margins.",
    rationale: "Apply ITW's 80/20 operating model to Apex; margin expansion opportunity of 300–500bps.",
    revenue: "$16,100.0m", ebitda: "$4,190.0m", evEbitda: "18.9x",
    capacity: "$6.0B+ acquisition capacity", fit: "Medium",
  },
  {
    name: "KKR & Co.",
    type: "Financial Sponsor",
    description: "Leading global PE firm with $500B+ AUM and deep industrials portfolio.",
    rationale: "Platform investment for industrial roll-up strategy; Apex as cornerstone for bolt-on acquisitions.",
    revenue: "N/A (PE)", ebitda: "N/A (PE)", evEbitda: "N/A",
    capacity: "$4.0B equity check capacity", fit: "High",
  },
  {
    name: "Carlyle Group",
    type: "Financial Sponsor",
    description: "Global PE firm with $385B+ AUM; extensive aerospace & defense track record.",
    rationale: "Leverage sector expertise; operational improvement playbook from prior industrial deals.",
    revenue: "N/A (PE)", ebitda: "N/A (PE)", evEbitda: "N/A",
    capacity: "$3.5B equity check capacity", fit: "High",
  },
  {
    name: "Advent International",
    type: "Financial Sponsor",
    description: "PE firm with $90B+ AUM focused on branded industrial and business services.",
    rationale: "Aftermarket services carve-out potential; international expansion expertise.",
    revenue: "N/A (PE)", ebitda: "N/A (PE)", evEbitda: "N/A",
    capacity: "$2.5B equity check capacity", fit: "Medium–High",
  },
  {
    name: "Danaher Corporation",
    type: "Strategic",
    description: "Diversified science & technology company with $24.6B revenue; Danaher Business System.",
    rationale: "Apply DBS continuous improvement to Apex operations; engineering solutions synergies.",
    revenue: "$24,600.0m", ebitda: "$6,150.0m", evEbitda: "22.5x",
    capacity: "$12.0B+ acquisition capacity", fit: "Medium",
  },
];

function buyerProfileSlide(buyer: BuyerProfile, slideNum: number): PaperSlide {
  return contentSlide(
    `${buyer.name} — ${buyer.fit} strategic fit as a ${buyer.type.toLowerCase()} acquirer`,
    [
      card(
        [
          textNode(buyer.name, { fontSize: pt(16), fontWeight: "bold", color: IB_BLUE }),
          textNode(buyer.type, { fontSize: pt(9), color: MID_GRAY, marginTop: 3 }),
          textNode(buyer.description, { fontSize: pt(9), color: DARK_GRAY, marginTop: 11 }),
        ],
        { width: 1147, style: { position: "absolute", top: 100, left: 67 } },
      ),
      textNode("Strategic Rationale", {
        position: "absolute", top: 253, left: 67, width: 533,
        fontSize: pt(10), fontWeight: "bold", color: IB_BLUE,
      }),
      textNode(buyer.rationale, {
        position: "absolute", top: 280, left: 67, width: 1147,
        fontSize: pt(9), color: DARK_GRAY,
      }),
      financialTable(
        ["Metric", "Value"],
        [
          ["Revenue", buyer.revenue],
          ["EBITDA", buyer.ebitda],
          ["Current EV/EBITDA", buyer.evEbitda],
          ["Acquisition Capacity", buyer.capacity],
          ["Strategic Fit Assessment", buyer.fit],
        ],
        {
          columnWidths: [267, 267],
          style: { top: 347, left: 67 },
        },
      ),
      bankLogo(),
      slideNumber(slideNum),
    ],
    "Source: FactSet, company filings, Meridian Capital Partners analysis",
  );
}

const buyerSlides: PaperSlide[] = buyers.map((b, i) => buyerProfileSlide(b, 23 + i));

// ---------------------------------------------------------------------------
// Slides 31–32: Process Timeline (Gantt)
// ---------------------------------------------------------------------------
const timelineSlide1 = contentSlide(
  "Recommended 12-week dual-track process to maximize competitive tension and valuation",
  [
    textNode("Phase I: Preparation (Weeks 1–3)", {
      position: "absolute", top: 96, left: 67, width: 533,
      fontSize: pt(10), fontWeight: "bold", color: IB_BLUE,
    }),
    ganttTimeline(
      [
        { name: "Prepare CIM / Teaser", start: 0, duration: 2, color: IB_BLUE },
        { name: "Build Data Room", start: 0.5, duration: 2.5, color: IB_BLUE },
        { name: "Identify Buyer Universe", start: 0, duration: 1.5, color: "#5B9BD5" },
        { name: "Management Prep", start: 1.5, duration: 1.5, color: "#5B9BD5" },
      ],
      { top: 127, left: 67, width: 1170, rowHeight: 35 },
    ),
    textNode("Phase II: First Round (Weeks 3–7)", {
      position: "absolute", top: 300, left: 67, width: 533,
      fontSize: pt(10), fontWeight: "bold", color: IB_BLUE,
    }),
    ganttTimeline(
      [
        { name: "Distribute Teasers", start: 3, duration: 1, color: GREEN },
        { name: "Execute NDAs", start: 3.5, duration: 1.5, color: GREEN },
        { name: "Distribute CIM", start: 4, duration: 1, color: "#2E75B6" },
        { name: "Receive IOIs", start: 5, duration: 2, color: "#2E75B6" },
        { name: "Evaluate & Select", start: 6.5, duration: 0.5, color: AMBER },
      ],
      { top: 331, left: 67, width: 1170, rowHeight: 35 },
    ),
    bankLogo(),
    slideNumber(31),
  ],
  "Source: Meridian Capital Partners recommended process timeline",
);

const timelineSlide2 = contentSlide(
  "Final phase drives to definitive agreement by Week 12, with signing targeted for Q2 2026",
  [
    textNode("Phase III: Second Round (Weeks 7–10)", {
      position: "absolute", top: 96, left: 67, width: 533,
      fontSize: pt(10), fontWeight: "bold", color: IB_BLUE,
    }),
    ganttTimeline(
      [
        { name: "Mgmt Presentations", start: 7, duration: 2, color: IB_BLUE },
        { name: "Site Visits", start: 7.5, duration: 1.5, color: IB_BLUE },
        { name: "Due Diligence Access", start: 7, duration: 3, color: "#5B9BD5" },
        { name: "Receive Final Bids", start: 9, duration: 1, color: AMBER },
      ],
      { top: 127, left: 67, width: 1170, rowHeight: 35 },
    ),
    textNode("Phase IV: Negotiation & Close (Weeks 10–12)", {
      position: "absolute", top: 300, left: 67, width: 533,
      fontSize: pt(10), fontWeight: "bold", color: IB_BLUE,
    }),
    ganttTimeline(
      [
        { name: "Negotiate Terms", start: 10, duration: 1.5, color: RED },
        { name: "Board Approval", start: 11, duration: 0.5, color: RED },
        { name: "Definitive Agreement", start: 11.5, duration: 0.5, color: "#C00000" },
        { name: "Signing", start: 12, duration: 0.1, color: "#C00000" },
      ],
      { top: 331, left: 67, width: 1170, rowHeight: 35 },
    ),
    textNode("Key Milestones", {
      position: "absolute", top: 493, left: 67, width: 533,
      fontSize: pt(10), fontWeight: "bold", color: IB_BLUE,
    }),
    bulletList(
      [
        { text: "Week 3: Teaser distribution to 25+ potential buyers" },
        { text: "Week 7: IOI deadline — target 8–10 indicative offers" },
        { text: "Week 10: Final bid deadline — target 3–4 final offers" },
        { text: "Week 12: Definitive agreement execution" },
      ],
      { position: "absolute", top: 520, left: 67, width: 1147, fontSize: pt(9) },
    ),
    bankLogo(),
    slideNumber(32),
  ],
);

// ---------------------------------------------------------------------------
// Slide 33: Summary & Recommendation
// ---------------------------------------------------------------------------
const summarySlide = contentSlide(
  "Meridian recommends a targeted dual-track process to achieve $1.8B–$2.1B enterprise value",
  [
    textNode("Valuation Summary", {
      position: "absolute", top: 100, left: 67, width: 533,
      fontSize: pt(12), fontWeight: "bold", color: IB_BLUE,
    }),
    financialTable(
      ["Methodology", "Low ($m)", "Mid ($m)", "High ($m)"],
      [
        ["Comparable Companies", "$1,550.0", "$1,700.0", "$1,850.0"],
        ["Precedent Transactions", "$1,750.0", "$1,925.0", "$2,100.0"],
        ["DCF Analysis", "$1,650.0", "$1,800.0", "$1,950.0"],
        ["LBO Analysis", "$1,500.0", "$1,650.0", "$1,800.0"],
        ["Blended Range", "$1,612.5", "$1,768.8", "$1,925.0"],
      ],
      {
        columnWidths: [240, 173, 173, 173],
        alternatingRows: true,
        style: { top: 133, left: 67 },
      },
    ),
    textNode("Recommendation", {
      position: "absolute", top: 413, left: 67, width: 533,
      fontSize: pt(12), fontWeight: "bold", color: IB_BLUE,
    }),
    bulletList(
      [
        { text: "Pursue dual-track process: simultaneous outreach to strategic acquirers and financial sponsors" },
        { text: "Target 8–10 qualified buyers across strategic (5) and financial (3–5) categories" },
        { text: "Execute 12-week compressed timeline to maintain momentum and competitive tension" },
        { text: "Recommended price target: $1.8B–$2.1B (14.0x–16.5x LTM EBITDA, 25–35% control premium)" },
      ],
      { position: "absolute", top: 447, left: 67, width: 1147, fontSize: pt(10) },
    ),
    bankLogo(),
    slideNumber(33),
  ],
  undefined,
  { notes: "This is the key decision slide. Reiterate the blended valuation range and the 12-week timeline to maintain urgency." },
);

// ---------------------------------------------------------------------------
// Slides 34–38: Appendix
// ---------------------------------------------------------------------------
const appendixDivider = sectionDivider("VI", "Appendix", IB_BLUE);
(appendixDivider.children as PaperNode[]).push(bankLogo(), slideNumber(34));

// Slide 35: Detailed Model Assumptions
const appendixAssumptions = contentSlide(
  "Appendix A: Detailed DCF Model Assumptions",
  [
    financialTable(
      ["Assumption", "Base Case", "Low Case", "High Case", "Source"],
      [
        ["Revenue Growth FY26E", "12.0%", "8.0%", "15.0%", "Management guidance"],
        ["Revenue Growth FY27E", "11.0%", "6.0%", "14.0%", "Management guidance"],
        ["Revenue Growth FY28E", "9.0%", "5.0%", "12.0%", "Meridian estimate"],
        ["Revenue Growth FY29E", "8.0%", "4.0%", "10.0%", "Meridian estimate"],
        ["Revenue Growth FY30E", "7.0%", "3.0%", "9.0%", "Meridian estimate"],
        ["EBITDA Margin (terminal)", "26.5%", "24.0%", "28.0%", "Peer median + mgmt"],
        ["Capex (% of Revenue)", "3.5%", "4.0%", "3.0%", "Historical average"],
        ["NWC (% of Rev Change)", "10.0%", "12.0%", "8.0%", "Historical average"],
        ["WACC", "10.0%", "11.5%", "8.5%", "CAPM build-up"],
        ["Terminal Growth Rate", "2.5%", "1.5%", "3.5%", "GDP + inflation"],
        ["Tax Rate", "25.0%", "25.0%", "25.0%", "Statutory"],
      ],
      {
        columnWidths: [227, 133, 133, 133, 200],
        alternatingRows: true,
        style: { top: 100, left: 55 },
      },
    ),
    bankLogo(),
    slideNumber(35),
  ],
  "Source: Company management, Meridian Capital Partners analysis",
);

// Slide 36: Extended Buyer Profiles — Additional Strategics
const appendixBuyers1 = contentSlide(
  "Appendix B: Extended Buyer Universe — Additional Strategic Acquirers",
  [
    financialTable(
      ["Company", "Revenue ($m)", "EBITDA ($m)", "EV/EBITDA", "Rationale", "Fit"],
      [
        ["Roper Technologies", "$6,300.0", "$2,270.0", "28.3x", "Engineering solutions overlap", "Medium"],
        ["Fortive Corp", "$6,200.0", "$1,550.0", "19.4x", "Industrial tech adjacency", "Medium"],
        ["Ametek Inc", "$6,800.0", "$1,836.0", "23.7x", "Precision instruments synergy", "Low–Med"],
        ["Textron Inc", "$13,700.0", "$1,780.0", "12.5x", "A&D components fit", "Low–Med"],
        ["TransDigm Group", "$7,200.0", "$3,240.0", "25.8x", "Aftermarket focus alignment", "Medium"],
      ],
      {
        columnWidths: [173, 127, 120, 100, 267, 93],
        alternatingRows: true,
        style: { top: 105, left: 40 },
      },
    ),
    bankLogo(),
    slideNumber(36),
  ],
  "Source: FactSet, company filings as of March 2026",
);

// Slide 37: Extended Buyer Profiles — Additional Financial Sponsors
const appendixBuyers2 = contentSlide(
  "Appendix B (cont'd): Extended Buyer Universe — Additional Financial Sponsors",
  [
    financialTable(
      ["Sponsor", "AUM ($B)", "Industrials Deals (5yr)", "Typical Check ($m)", "Fit"],
      [
        ["Blackstone", "$1,000+", "15", "$1,500–$5,000", "Medium"],
        ["Apollo Global", "$650+", "12", "$800–$3,000", "Medium–High"],
        ["Bain Capital", "$180+", "8", "$500–$2,000", "Medium"],
        ["Warburg Pincus", "$85+", "6", "$400–$1,500", "Medium"],
        ["Leonard Green", "$55+", "4", "$300–$1,000", "Low–Med"],
      ],
      {
        columnWidths: [200, 120, 200, 200, 133],
        alternatingRows: true,
        style: { top: 105, left: 67 },
      },
    ),
    bankLogo(),
    slideNumber(37),
  ],
  "Source: Preqin, PitchBook, Meridian Capital Partners research",
);

// Slide 38: Additional Analyses — Accretion/Dilution
const appendixAccDil = contentSlide(
  "Appendix C: Illustrative Accretion / Dilution Analysis at Various Offer Prices",
  [
    financialTable(
      ["Metric", "$45.00/sh", "$48.50/sh", "$52.00/sh", "$55.00/sh", "$58.00/sh"],
      [
        ["Offer Premium", "15.4%", "24.4%", "33.3%", "41.0%", "48.7%"],
        ["Implied EV ($m)", "$1,680.0", "$1,810.0", "$1,940.0", "$2,050.0", "$2,165.0"],
        ["Implied EV/EBITDA", "13.2x", "14.2x", "15.2x", "16.1x", "17.0x"],
        ["Pro Forma EPS (Yr 1)", "$4.85", "$4.65", "$4.42", "$4.22", "$4.01"],
        ["Accretion / (Dilution)", "5.2%", "0.8%", "(4.1%)", "(8.5%)", "(13.0%)"],
        ["Breakeven Synergies ($m)", "$0.0", "$0.0", "$28.0", "$58.0", "$89.0"],
      ],
      {
        mergedHeaderGroups: [
          { text: "", colSpan: 1 },
          { text: "Offer Price per Share", colSpan: 5 },
        ],
        columnWidths: [213, 133, 133, 133, 133, 133],
        alternatingRows: true,
        style: { top: 105, left: 67 },
      },
    ),
    textNode("Note: Analysis assumes acquirer current P/E of 22.0x, 25% tax rate, $50m run-rate synergies (base case), 100% stock deal.", {
      position: "absolute", top: 453, left: 67, width: 1147,
      fontSize: pt(8), fontStyle: "italic", color: MID_GRAY,
    }),
    bankLogo(),
    slideNumber(38),
  ],
  "Source: Meridian Capital Partners analysis, illustrative only",
);

// ---------------------------------------------------------------------------
// Export — 38 slides total
// ---------------------------------------------------------------------------
export const pitchBookDeck: PaperDocument = makeDoc(
  [
    coverSlide,                // 1
    tocSlide,                  // 2
    execSummarySlide,          // 3
    teamBiosSlide,             // 4
    credentialsSlide,          // 5
    sectorMASlide,             // 6
    capitalMarketsSlide,       // 7
    marketMultiplesSlide,      // 8
    companyOverviewSlide,      // 9
    orgStructureSlide,         // 10
    financialsSlide1,          // 11
    financialsSlide2,          // 12
    financialsSlide3,          // 13
    compTableSlide1,           // 14
    compTableSlide2,           // 15
    precedentSlide1,           // 16
    precedentSlide2,           // 17
    dcfAssumptionsSlide,       // 18
    dcfSensitivitySlide,       // 19
    footballFieldSlide,        // 20
    sourcesUsesSlide,          // 21
    proFormaSlide,             // 22
    ...buyerSlides,            // 23–30
    timelineSlide1,            // 31
    timelineSlide2,            // 32
    summarySlide,              // 33
    appendixDivider,           // 34
    appendixAssumptions,       // 35
    appendixBuyers1,           // 36
    appendixBuyers2,           // 37
    appendixAccDil,            // 38
  ],
  { title: "Project Atlas — Confidential Discussion Materials" },
);
