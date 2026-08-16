/**
 * Agent KPI values are formatted source strings. A digit-bearing value can be
 * treated as a metric; a value without digits is a qualitative outcome and
 * needs statement typography rather than numeric-card assumptions.
 */
export function isQualitativeKpiValue(value: string): boolean {
  return !/\d/u.test(value);
}

export interface TimelineEntryParts {
  body: string;
  prefix: string;
}

export interface ComparisonOwnership {
  left: string;
  right: string;
}

export interface ComparisonEntryParts {
  left: string;
  relation: string;
  right: string;
}

export interface RegisterEntryParts {
  anchor?: string;
  body: string;
}

const MONTH_PREFIX = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const TIMELINE_PREFIX = new RegExp(
  `^((?:${MONTH_PREFIX}\\s+\\d{4}|\\d{1,2}\\s+${MONTH_PREFIX}(?:\\s+\\d{4})?|(?:Months?|Weeks?|Days?|Phases?|Stages?|Q[1-4])\\s+[A-Za-z0-9][A-Za-z0-9./–—-]*)(?:\\s*[—–:-]))(\\s*)([\\s\\S]+)$`,
  "iu",
);

/**
 * Detects source-authored chronology from a leading date, month, phase, stage,
 * quarter, week, or day range. The returned prefix is a verbatim slice.
 */
export function parseTimelineEntry(entry: string): TimelineEntryParts | undefined {
  const match = TIMELINE_PREFIX.exec(entry);
  if (!match) return undefined;
  return {
    prefix: match[1],
    body: `${match[2]}${match[3]}`,
  };
}

export function isTimelineSequence(entries: readonly string[]): boolean {
  if (entries.length < 3) return false;
  const matches = entries.map((entry) => parseTimelineEntry(entry) !== undefined);
  const matched = matches.filter(Boolean).length;
  const lastMatched = matches.lastIndexOf(true);
  const unmatchedBeforeLastMilestone = matches.slice(0, lastMatched + 1).some((match) => !match);
  return !unmatchedBeforeLastMilestone
    && matched >= Math.max(3, Math.ceil(entries.length * 0.66));
}

/**
 * Splits a source subtitle into two owned fields only when it explicitly uses
 * Left:/Right: clauses. Both returned strings are verbatim subtitle slices.
 */
export function parseComparisonOwnership(subtitle: string | undefined): ComparisonOwnership | undefined {
  if (!subtitle) return undefined;
  const rightMarker = /\bRight:/iu.exec(subtitle);
  if (!rightMarker || !/^\s*Left:/iu.test(subtitle)) return undefined;
  const left = subtitle.slice(0, rightMarker.index).trim();
  const right = subtitle.slice(rightMarker.index).trim();
  if (left.length === 0 || right.length === 0) return undefined;
  return { left, right };
}

/**
 * Splits one comparison fact at an explicit source relation. The semicolon
 * fallback is permitted only inside a comparison that already has explicit
 * left/right ownership in its subtitle.
 */
export function parseComparisonEntry(entry: string): ComparisonEntryParts | undefined {
  const versus = /\s+([—–-]\s+(?:versus|vs\.?))\s+/iu.exec(entry);
  if (versus) {
    const rightStart = versus.index + versus[0].length;
    return {
      left: entry.slice(0, versus.index),
      relation: versus[1],
      right: entry.slice(rightStart),
    };
  }
  const semicolon = entry.indexOf("; ");
  if (semicolon > 0 && semicolon < entry.length - 2) {
    return {
      left: entry.slice(0, semicolon),
      relation: ";",
      right: entry.slice(semicolon + 2),
    };
  }
  return undefined;
}

function splitAt(entry: string, index: number, delimiterLength: number): RegisterEntryParts {
  return {
    anchor: entry.slice(0, index + delimiterLength),
    body: entry.slice(index + delimiterLength),
  };
}

/**
 * Promotes only verbatim, source-authored anchors. It never synthesizes a
 * label: eligible anchors are leading values or compact prefixes before a
 * colon, em dash, or parenthetical qualifier.
 */
export function parseRegisterEntry(entry: string): RegisterEntryParts {
  const colon = entry.indexOf(":");
  if (colon > 0 && colon <= 52) return splitAt(entry, colon, 1);

  const emDash = entry.search(/\s[—–]\s/u);
  if (emDash > 0 && emDash <= 84) {
    const parenthetical = entry.indexOf(" (");
    if (parenthetical > 0 && parenthetical < emDash && parenthetical <= 44) {
      return { anchor: entry.slice(0, parenthetical), body: entry.slice(parenthetical) };
    }
    return splitAt(entry, emDash, 3);
  }

  const leadingValue = /^(?:[$€£]\s*)?\d[\d,.]*(?:\.\d+)?(?:%|[KMBT]|\s+(?:FTEs?|days?|months?|years?))?/iu.exec(entry);
  if (leadingValue && leadingValue[0].length >= 2) {
    return {
      anchor: leadingValue[0],
      body: entry.slice(leadingValue[0].length),
    };
  }

  const clauseBreak = /;\s/u.exec(entry);
  if (clauseBreak && clauseBreak.index > 0 && clauseBreak.index <= 84) {
    return splitAt(entry, clauseBreak.index, 1);
  }

  return { body: entry };
}
