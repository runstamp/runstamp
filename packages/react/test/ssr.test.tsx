import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DeckProvider,
  DeckThumbnails,
  DeckToolbar,
  DeckViewer,
  FidelityBadge,
  useDeck,
  useDeckRender,
  type DeclarativeDocument,
} from "../src/index.js";

const deckDocument: DeclarativeDocument = {
  title: "SSR deck",
  slides: [
    { layout: "title", title: "Machine to paper", subtitle: "No client boundary required" },
    {
      layout: "kpi-row",
      title: "Operating review",
      metrics: [
        { label: "ARR", value: "$18.4m", delta: "+28% YoY" },
        { label: "NRR", value: "121%", delta: "+6 pts" },
      ],
    },
  ],
};

function HeadlessConsumer() {
  const deck = useDeck();
  const render = useDeckRender();
  return <output>{deck.currentSlide}:{render.title}:{render.slideCount}</output>;
}

describe("React server rendering", () => {
  it("renders the default viewer without browser globals", () => {
    const html = renderToString(<DeckViewer deck={deckDocument} theme="dark" />);
    expect(html).toContain("data-runstamp-theme=\"dark\"");
    expect(html).toContain("Machine to paper");
  });

  it("coordinates headless consumers through DeckProvider", () => {
    const html = renderToStaticMarkup(
      <DeckProvider deck={deckDocument}>
        <HeadlessConsumer />
      </DeckProvider>,
    );
    expect(html).toContain("0:Machine to paper:2");
  });

  it("renders thumbnails, toolbar, and fidelity status accessibly", () => {
    const html = renderToStaticMarkup(
      <DeckProvider deck={deckDocument}>
        <DeckThumbnails />
        <DeckToolbar fidelity={{ status: "passed", platform: "PowerPoint for Mac" }} />
        <FidelityBadge status="pending" />
      </DeckProvider>,
    );
    expect(html).toContain("aria-current=\"page\"");
    expect(html).toContain("Office validated");
    expect(html).toContain("Validation pending");
    expect(html).toContain("01 / 02");
  });
});
