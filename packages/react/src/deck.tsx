import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  AstDeckNode,
  AstDeckSlide,
  DeckController,
  DeckDocument,
  DeckOptions,
  DeckProviderProps,
  DeckRenderModel,
  DeckRenderState,
  DeckSource,
  DeclarativeDeckSlide,
} from "./types.js";

const DeckContext = createContext<DeckController | null>(null);

const EMPTY_DOCUMENT: DeckDocument = {
  title: "Untitled deck",
  slides: [{ layout: "title", title: "Untitled deck" }],
};

function isController(source: DeckSource): source is DeckController {
  return "document" in source && typeof source.setCurrentSlide === "function";
}

function clampSlide(index: number, count: number): number {
  return Math.max(0, Math.min(Math.max(0, count - 1), Math.trunc(index)));
}

function useLocalDeck(document: DeckDocument, options?: DeckOptions): DeckController {
  const slideCount = document.slides.length;
  const [requestedSlide, setRequestedSlide] = useState(() =>
    clampSlide(options?.initialSlide ?? 0, slideCount),
  );
  const currentSlide = clampSlide(requestedSlide, slideCount);

  useEffect(() => {
    if (requestedSlide !== currentSlide) setRequestedSlide(currentSlide);
  }, [currentSlide, requestedSlide]);

  const setCurrentSlide = useCallback(
    (index: number) => setRequestedSlide(clampSlide(index, slideCount)),
    [slideCount],
  );
  const previous = useCallback(
    () => setRequestedSlide((index) => clampSlide(index - 1, slideCount)),
    [slideCount],
  );
  const next = useCallback(
    () => setRequestedSlide((index) => clampSlide(index + 1, slideCount)),
    [slideCount],
  );
  const first = useCallback(() => setRequestedSlide(0), []);
  const last = useCallback(
    () => setRequestedSlide(Math.max(0, slideCount - 1)),
    [slideCount],
  );

  return useMemo(
    () => ({
      document,
      currentSlide,
      slideCount,
      canPrevious: currentSlide > 0,
      canNext: currentSlide < slideCount - 1,
      setCurrentSlide,
      previous,
      next,
      first,
      last,
    }),
    [
      document,
      currentSlide,
      slideCount,
      setCurrentSlide,
      previous,
      next,
      first,
      last,
    ],
  );
}

/**
 * Create deck navigation state. When called with no source it consumes the
 * nearest DeckProvider, making the same hook useful for headless descendants.
 */
export function useDeck(source?: DeckSource, options?: DeckOptions): DeckController {
  const context = useContext(DeckContext);
  const local = useLocalDeck(
    source && !isController(source) ? source : EMPTY_DOCUMENT,
    options,
  );

  if (source) return isController(source) ? source : local;
  if (context) return context;
  throw new Error("useDeck() requires a deck argument or a parent <DeckProvider>.");
}

export function DeckProvider({ deck, children }: DeckProviderProps) {
  const controller = useDeck(deck);
  return createElement(DeckContext.Provider, { value: controller }, children);
}

function textFromUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) {
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("");
}

export function isDeclarativeDeckSlide(
  slide: DeclarativeDeckSlide | AstDeckSlide,
): slide is DeclarativeDeckSlide {
  return "layout" in slide && typeof slide.layout === "string";
}

function findAstTitle(nodes: AstDeckNode[]): string {
  for (const node of nodes) {
    const fields = node as unknown as {
      content?: unknown;
      textContent?: unknown;
      children?: AstDeckNode[];
    };
    const text = textFromUnknown(fields.content) || textFromUnknown(fields.textContent);
    if (text) return text;
    if (fields.children) {
      const nested = findAstTitle(fields.children);
      if (nested) return nested;
    }
  }
  return "Untitled slide";
}

export function getSlideTitle(
  slide: DeclarativeDeckSlide | AstDeckSlide,
  index: number,
): string {
  if (isDeclarativeDeckSlide(slide)) {
    return "title" in slide && slide.title ? slide.title : "Key metrics";
  }
  return findAstTitle(slide.children) || `Slide ${index + 1}`;
}

export function createDeckRenderModel(
  slide: DeclarativeDeckSlide | AstDeckSlide,
  index: number,
): DeckRenderModel {
  if (isDeclarativeDeckSlide(slide)) {
    const base = {
      kind: slide.layout,
      title: getSlideTitle(slide, index),
      subtitle: "subtitle" in slide ? slide.subtitle : undefined,
      eyebrow: slide.layout === "title" ? slide.eyebrow : undefined,
      bullets: slide.layout === "bullets" ? slide.bullets : [],
      metrics: slide.layout === "kpi-row" ? slide.metrics : [],
      chart: slide.layout === "chart" ? slide.chart : undefined,
      comparison: slide.layout === "comparison" ? slide : undefined,
      timeline: slide.layout === "timeline" ? slide : undefined,
      astNodes: [],
    } satisfies DeckRenderModel;
    return base;
  }

  return {
    kind: "ast",
    title: getSlideTitle(slide, index),
    bullets: [],
    metrics: [],
    astNodes: slide.children,
  };
}

/** Derive a stable, markup-agnostic model for the active slide. */
export function useDeckRender(source?: DeckSource, slideIndex?: number): DeckRenderState {
  const deck = useDeck(source);
  const resolvedIndex = clampSlide(slideIndex ?? deck.currentSlide, deck.slideCount);

  return useMemo(() => {
    const slide = deck.document.slides[resolvedIndex];
    if (!slide) {
      throw new Error("A Runstamp deck must contain at least one slide.");
    }
    const title = getSlideTitle(slide, resolvedIndex);
    return {
      document: deck.document,
      slide,
      slideIndex: resolvedIndex,
      slideCount: deck.slideCount,
      title,
      model: createDeckRenderModel(slide, resolvedIndex),
    };
  }, [deck.document, deck.slideCount, resolvedIndex]);
}
