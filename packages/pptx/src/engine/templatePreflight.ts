import type {
  PaperNode,
  PaperSlide,
  PlaceholderRef,
} from "../types/ast.js";
import type { TemplatePreflightReport } from "../quality/report.js";
import type { TemplateIndex } from "../template/parser.js";
import { mapSlideToLayout } from "../template/layoutMapper.js";

function collectPlaceholderRefs(node: PaperNode, refs: PlaceholderRef[]): void {
  const placeholder = (node as { placeholder?: PlaceholderRef }).placeholder;
  if (placeholder) refs.push(placeholder);
  if ("children" in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      collectPlaceholderRefs(child, refs);
    }
  }
}

function getCompatiblePlaceholderTypes(type: PlaceholderRef["type"]): string[] {
  switch (type) {
    case "title":
      return ["title", "ctrTitle"];
    case "ctrTitle":
      return ["ctrTitle", "title"];
    case "subTitle":
      return ["subTitle", "body"];
    case "body":
      return ["body", "subTitle"];
    case "pic":
    case "chart":
    case "tbl":
    case "dgm":
    case "media":
    case "clipArt":
      return [type, "obj"];
    case "obj":
      return ["obj", "pic", "chart", "tbl", "dgm", "media", "clipArt"];
    default:
      return type ? [type] : [];
  }
}

function placeholderRefMatches(
  ref: PlaceholderRef,
  placeholders: Array<{ idx?: string; type?: string }>,
): boolean {
  const compatibleTypes = getCompatiblePlaceholderTypes(ref.type);
  if (ref.idx !== undefined) {
    const byIdx = placeholders.some((placeholder) => placeholder.idx === String(ref.idx));
    if (byIdx) return true;
  }
  if (compatibleTypes.length > 0) {
    return placeholders.some((placeholder) => (
      placeholder.type !== undefined && compatibleTypes.includes(placeholder.type)
    ));
  }
  return false;
}

export function buildTemplatePreflightReport(
  slides: PaperSlide[],
  templateIndex: TemplateIndex,
): TemplatePreflightReport {
  const unsafeLayouts = new Set<string>();
  let placeholderRefs = 0;
  let matchedPlaceholderRefs = 0;
  let missingPlaceholderCount = 0;

  for (const slide of slides) {
    const mapped = mapSlideToLayout(slide, templateIndex);
    if (slide.layoutName && !mapped) {
      unsafeLayouts.add(slide.layoutName);
    }

    const refs: PlaceholderRef[] = [];
    for (const child of slide.children ?? []) {
      collectPlaceholderRefs(child, refs);
    }
    placeholderRefs += refs.length;
    if (!mapped) continue;
    const matchedRefs = refs.filter((ref) => placeholderRefMatches(ref, mapped.placeholders)).length;
    matchedPlaceholderRefs += matchedRefs;
    missingPlaceholderCount += refs.length - matchedRefs;
  }

  const placeholderCoverage = placeholderRefs === 0 ? 1 : matchedPlaceholderRefs / placeholderRefs;
  const roundedCoverage = Math.round(placeholderCoverage * 1000) / 1000;
  const templateSupportLevel = unsafeLayouts.size > 0 || missingPlaceholderCount > 0
    ? "unsafe"
    : roundedCoverage >= 0.98
      ? "certified"
      : "supported";
  const expectedFallbackRisk = unsafeLayouts.size > 0 || missingPlaceholderCount > 0
    ? "high"
    : roundedCoverage >= 0.98
      ? "low"
      : "medium";

  return {
    templateSupportLevel,
    unsafeLayouts: [...unsafeLayouts].sort(),
    placeholderCoverage: roundedCoverage,
    expectedFallbackRisk,
    missingPlaceholderCount,
  };
}
