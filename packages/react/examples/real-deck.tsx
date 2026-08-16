import { DeckThumbnails, DeckToolbar, DeckViewer, useDeck } from "@runstamp/react";
import type { DeclarativeDocument } from "@runstamp/react";
import "@runstamp/react/styles.css";

export const quarterlyReview: DeclarativeDocument = {
  version: "1.0",
  title: "Northstar Q2 review",
  slides: [
    {
      layout: "title",
      title: "Q2 moved the growth curve",
      subtitle: "Board review · 10 August 2026",
    },
    {
      layout: "kpi-row",
      title: "The operating system is compounding",
      metrics: [
        { label: "ARR", value: "$18.4m", delta: "+28% YoY", trend: "up" },
        { label: "Net retention", value: "121%", delta: "+6 pts", trend: "up" },
        { label: "Gross margin", value: "78%", delta: "+3 pts", trend: "up" },
        { label: "Runway", value: "31 mo", delta: "at plan", trend: "flat" },
      ],
    },
    {
      layout: "chart",
      title: "Expansion became the growth engine",
      subtitle: "Quarterly recurring revenue, USD millions",
      chart: {
        kind: "bar",
        series: [{
          name: "ARR",
          dataPoints: [
            { category: "Q3", value: 11.2 },
            { category: "Q4", value: 13.1 },
            { category: "Q1", value: 15.7 },
            { category: "Q2", value: 18.4 },
          ],
        }],
      },
    },
  ],
};

export function QuarterlyReview() {
  const deck = useDeck(quarterlyReview);
  return (
    <div className="deck-example">
      <DeckToolbar
        deck={deck}
        fileName="northstar-q2-review"
        fidelity={{ status: "passed", platform: "PowerPoint for Windows" }}
        pptx="/api/decks/northstar-q2-review.pptx"
        pdf="/api/decks/northstar-q2-review.pdf"
      />
      <div className="deck-example__workspace">
        <DeckThumbnails deck={deck} />
        <DeckViewer deck={deck} />
      </div>
    </div>
  );
}
