/**
 * Content Density Regression Tests
 *
 * Validates that text-heavy slide patterns (bullets, statement, prose) render
 * with sufficient visible content. These patterns previously produced 1.5–4%
 * density due to missing height constraints on absolute-positioned text nodes.
 *
 * Threshold: 8% minimum content density (non-background pixels).
 * Title slides with large text typically render at 30–50%+.
 * Bullet/prose slides should render at 10–25% with proper constraints.
 */
import { describe, it, expect } from "vitest";
import { PNG } from "pngjs";
import { compileAgentSlide } from "../src/interpreter/interpreter.js";
import { runLayout } from "../src/layout/index.js";
import { renderSlideToBuffer } from "../src/renderer/index.js";
import { DEFAULT_SLIDE_WIDTH_PX, DEFAULT_SLIDE_HEIGHT_PX } from "../src/ooxml/constants.js";

let canvasAvailable = false;
try {
  await import("@napi-rs/canvas");
  canvasAvailable = true;
} catch {
  // @napi-rs/canvas not installed
}

const W = DEFAULT_SLIDE_WIDTH_PX;
const H = DEFAULT_SLIDE_HEIGHT_PX;
const MIN_DENSITY = 8; // percent

function measureDensity(pngBuffer: Buffer): number {
  const png = PNG.sync.read(pngBuffer);
  const { width, height, data } = png;

  // Detect background from top-left corner
  const bgR = data[0], bgG = data[1], bgB = data[2];
  const TOLERANCE = 30;
  const STEP = 4;
  let sampled = 0, nonBg = 0;

  for (let y = 0; y < height; y += STEP) {
    for (let x = 0; x < width; x += STEP) {
      const idx = (y * width + x) * 4;
      const dr = data[idx] - bgR, dg = data[idx + 1] - bgG, db = data[idx + 2] - bgB;
      if (Math.sqrt(dr * dr + dg * dg + db * db) > TOLERANCE) nonBg++;
      sampled++;
    }
  }

  return sampled > 0 ? Math.round((nonBg / sampled) * 1000) / 10 : 0;
}

async function renderAgentSlide(
  pattern: string,
  content: Record<string, unknown>,
  accentColor = "#1E3A5F",
): Promise<Buffer> {
  const slide = compileAgentSlide(
    { pattern, content } as Parameters<typeof compileAgentSlide>[0],
    accentColor,
  );
  const layout = await runLayout(slide, W, H);
  const buf = await renderSlideToBuffer(layout, { width: W, height: H });
  if (!buf) throw new Error(`Canvas render returned null for pattern "${pattern}"`);
  return buf;
}

describe.skipIf(!canvasAvailable)("Content Density — text-heavy patterns", () => {
  it("bullets: 15 bullet points render above minimum density", async () => {
    const buf = await renderAgentSlide("bullets", {
      title: "Key Findings from Q4 Analysis",
      subtitle: "Financial Performance Review",
      bulletPoints: Array.from({ length: 15 }, (_, i) =>
        `Finding ${i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod`
      ),
    });
    const density = measureDensity(buf);
    expect(density, `Bullet slide density ${density}% is below ${MIN_DENSITY}%`).toBeGreaterThanOrEqual(MIN_DENSITY);
  });

  it("bullets: prose paragraphs render above minimum density", async () => {
    const buf = await renderAgentSlide("bullets", {
      title: "Executive Summary",
      prose: [
        "The quarterly results demonstrate sustained growth across all key segments. Revenue increased 23% year-over-year, driven primarily by enterprise adoption of the core platform.",
        "Operating margins expanded to 34%, reflecting improved unit economics and disciplined cost management. Customer acquisition costs decreased 15% while lifetime value increased 28%.",
        "International expansion contributed 31% of total revenue, up from 22% in the prior quarter. The EMEA region showed particular strength with 45% growth.",
        "Product development velocity increased with 3 major releases during the quarter. Customer satisfaction scores reached an all-time high of 4.7/5.0.",
      ],
    });
    const density = measureDensity(buf);
    expect(density, `Prose slide density ${density}% is below ${MIN_DENSITY}%`).toBeGreaterThanOrEqual(MIN_DENSITY);
  });

  it("statement: bold statement + prose render above minimum density", async () => {
    const buf = await renderAgentSlide("statement", {
      title: "Our platform processes 2.3 billion transactions daily with 99.997% uptime",
      subtitle: "Infrastructure at scale requires rethinking every assumption",
      prose: [
        "The journey to hyperscale required a complete rewrite of our distributed consensus layer. We replaced the original Raft-based approach with a custom CRDT mesh that reduces cross-datacenter latency by 73%.",
        "Our observability stack now processes 4TB of telemetry data per hour, enabling real-time anomaly detection that catches 94% of incidents before they impact customers.",
      ],
    });
    const density = measureDensity(buf);
    expect(density, `Statement slide density ${density}% is below ${MIN_DENSITY}%`).toBeGreaterThanOrEqual(MIN_DENSITY);
  });

  it("bullets: mixed bullets and prose render above minimum density", async () => {
    const buf = await renderAgentSlide("bullets", {
      title: "Strategic Priorities",
      subtitle: "H1 2026 Roadmap",
      bulletPoints: [
        "Expand enterprise sales team from 12 to 25 account executives across 3 new regions",
        "Launch self-serve onboarding reducing time-to-value from 14 days to 48 hours",
        "Achieve SOC 2 Type II and ISO 27001 certifications by end of Q2",
        "Ship native mobile SDK supporting iOS 17+ and Android 14+",
        "Integrate with 15 additional CRM and ERP platforms",
      ],
      prose: [
        "These priorities were determined through extensive customer feedback sessions and competitive analysis. Each initiative maps directly to our three-year strategic plan.",
      ],
    });
    const density = measureDensity(buf);
    expect(density, `Mixed slide density ${density}% is below ${MIN_DENSITY}%`).toBeGreaterThanOrEqual(MIN_DENSITY);
  });

  it("comparison: two-column bullets render above minimum density", async () => {
    const buf = await renderAgentSlide("comparison", {
      title: "Current vs Proposed Architecture",
      subtitle: "Migration benefits analysis",
      bulletPoints: [
        "Monolithic deployment with 45-minute build times",
        "Single database handling 50K queries/sec",
        "Manual scaling requiring 2-hour lead time",
        "Centralized logging with 24-hour retention",
        "Microservices with 3-minute incremental deploys",
        "Sharded database cluster handling 500K queries/sec",
        "Auto-scaling with sub-minute response time",
        "Distributed tracing with 30-day retention",
      ],
    });
    const density = measureDensity(buf);
    expect(density, `Comparison slide density ${density}% is below ${MIN_DENSITY}%`).toBeGreaterThanOrEqual(MIN_DENSITY);
  });
});
