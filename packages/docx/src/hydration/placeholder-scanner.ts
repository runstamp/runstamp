/**
 * Placeholder Scanner for DOCX Template Hydration
 *
 * Scans OOXML document.xml (and headers/footers) for Mustache-style
 * placeholders like {{client_name}} or {{pricing_table}}.
 *
 * Key challenge: Word often splits placeholder text across multiple
 * <w:r> (run) elements due to spellcheck, formatting, or editing history.
 * For example, "{{client_name}}" might be stored as:
 *   <w:r><w:t>{{</w:t></w:r>
 *   <w:r><w:t>client_</w:t></w:r>
 *   <w:r><w:t>name}}</w:t></w:r>
 *
 * This scanner normalizes adjacent runs before scanning.
 */

/** A located placeholder within the OOXML structure */
export interface PlaceholderMatch {
  /** The placeholder key (without braces), e.g. "client_name" */
  key: string;
  /** The full placeholder text, e.g. "{{client_name}}" */
  fullMatch: string;
  /** The XML file path within the DOCX zip (e.g. "word/document.xml") */
  filePath: string;
  /** The marker syntax used by this placeholder. */
  syntax: "mustache" | "office";
}

/** Regex pattern for Mustache-style placeholders */
const MUSTACHE_PLACEHOLDER_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}\}/g;
const OFFICE_PLACEHOLDER_PATTERN = /\{d\.([a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?::format\(([^{}]*)\))?\}/g;

/**
 * Scan XML content for placeholders.
 *
 * This operates on raw XML strings. Before scanning, it normalizes
 * split runs by concatenating adjacent <w:t> content.
 */
export function scanForPlaceholders(
  xmlContent: string,
  filePath: string,
  syntax: "mustache" | "office" | "auto" = "auto",
): PlaceholderMatch[] {
  const matches: PlaceholderMatch[] = [];

  // First, normalize split runs in the XML
  const normalized = normalizeRunSplits(xmlContent);

  if (syntax === "auto" || syntax === "mustache") {
    let match: RegExpExecArray | null;
    const regex = new RegExp(MUSTACHE_PLACEHOLDER_PATTERN.source, "g");

    while ((match = regex.exec(normalized)) !== null) {
      matches.push({
        key: match[1],
        fullMatch: match[0],
        filePath,
        syntax: "mustache",
      });
    }
  }

  if (syntax === "auto" || syntax === "office") {
    let match: RegExpExecArray | null;
    const regex = new RegExp(OFFICE_PLACEHOLDER_PATTERN.source, "g");

    while ((match = regex.exec(normalized)) !== null) {
      matches.push({
        key: match[1],
        fullMatch: match[0],
        filePath,
        syntax: "office",
      });
    }
  }

  return matches;
}

/**
 * Sibling elements Word commonly emits *between* runs that split a
 * placeholder across multiple <w:r> boundaries. These are all void or
 * bookmark-pair elements that do not carry rendered text, so dropping
 * them between runs of a to-be-hydrated placeholder is safe — the
 * placeholder text is about to be replaced with data anyway.
 */
const RUN_INTERRUPTER_PATTERN = /<w:(?:proofErr|bookmarkStart|bookmarkEnd|commentRangeStart|commentRangeEnd)\b[^>]*\/>/;

const RUN_INTERRUPTER_SEQUENCE = new RegExp(
  `(</w:r>\\s*)(?:${RUN_INTERRUPTER_PATTERN.source}\\s*)+(<w:r\\b)`,
  'g',
);

/**
 * Drop interrupter siblings that appear between adjacent runs.
 *
 * Word emits <w:proofErr>, <w:bookmarkStart>, <w:commentRangeStart>
 * (and their matching End variants) as paragraph-level siblings. If
 * they land in the middle of a placeholder like
 *   <w:r>{{</w:r><w:proofErr/><w:r>customer_name</w:r><w:proofErr/><w:r>}}</w:r>
 * the regex scanner can't merge the surrounding runs, so the
 * placeholder becomes invisible.
 *
 * Removing these specific elements is safe because they carry no
 * rendered text and bookmarks are only anchor metadata — when the
 * bookmark targets are gone, Word silently tolerates the orphan.
 * Within a placeholder span, the original text is about to be
 * overwritten anyway.
 */
function stripInterruptersBetweenRuns(xml: string): string {
  let prev: string;
  let current = xml;
  do {
    prev = current;
    current = current.replace(RUN_INTERRUPTER_SEQUENCE, '$1$2');
  } while (current !== prev);
  return current;
}

const RUN_ELEMENT_PATTERN = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/;

const UNCLOSED_PLACEHOLDER_RUN_PATTERN = new RegExp(
  // Opening run that ends with unmatched `{{` in its <w:t>.
  // Char classes exclude `<` so the text can't run past the <w:t>
  // closing tag — critical, otherwise `[^}]*` happily consumes across
  // element boundaries up to the next literal `}`.
  //
  // The rPr block uses a lookahead-guarded `(?!</?w:r\b)` so the lazy
  // `[\s\S]*?` cannot extend across run boundaries when the engine
  // backtracks looking for the trailing `}}`. Without that guard, the
  // engine swallows intermediate runs into $5 (final-open) when the
  // run after $1 has no `}}` of its own — silently dropping their
  // text from the merge. The `\b` boundary lets `<w:rFonts>`, `<w:rsidR=...>`,
  // and other tags whose names start with `w:r` still match.
  `(<w:r(?:\\s[^>]*)?>(?:<w:rPr>(?:(?!</?w:r\\b)[\\s\\S])*?</w:rPr>)?<w:t(?:\\s[^>]*)?>)` + // $1 = open
  `([^<]*?\\{\\{[^<}]*)` +                                                   // $2 = text with unclosed {{
  `(</w:t></w:r>)` +                                                         // $3 = close
  // Zero or more intermediate siblings: runs OR plain whitespace. (Interrupters
  // were stripped earlier.) Capture the full middle span.
  `((?:\\s*${RUN_ELEMENT_PATTERN.source})*?)` +                              // $4 = middle runs
  // Final run whose <w:t> contains the closing }}
  `(\\s*<w:r(?:\\s[^>]*)?>(?:<w:rPr>(?:(?!</?w:r\\b)[\\s\\S])*?</w:rPr>)?<w:t(?:\\s[^>]*)?>)` + // $5 = final open
  `([^<]*?\\}\\}[^<]*)` +                                                    // $6 = text with }}
  `(</w:t></w:r>)`,                                                          // $7 = final close
  'g',
);

/**
 * Merge runs across a placeholder span even when their rPr differ.
 *
 * Case: a placeholder name is bisected by a formatting span, e.g.
 *   <w:r><w:t>{{customer_</w:t></w:r>
 *   <w:r><w:rPr><w:b/></w:rPr><w:t>display</w:t></w:r>
 *   <w:r><w:t>_name}}</w:t></w:r>
 *
 * The safe-merge pass above refuses because rPr differs. But a
 * placeholder is *always* replaced wholesale — the inner formatting
 * is cosmetic on soon-to-be-discarded text. Keep the first run's rPr
 * (the paragraph's lead formatting), replace its text with the full
 * concatenation, and drop the intermediate + trailing runs.
 */
function mergeRunsAcrossPlaceholders(xml: string): string {
  let prev: string;
  let current = xml;
  do {
    prev = current;
    current = current.replace(
      UNCLOSED_PLACEHOLDER_RUN_PATTERN,
      (fullMatch, open, textWithOpen, _close, middle, _finalOpen, textWithClose, finalClose) => {
        const middleText = extractTextFromRunBlock(middle);
        const merged = `${textWithOpen}${middleText}${textWithClose}`;
        // Only collapse if the result actually contains a complete placeholder —
        // prevents misfires on templates that legitimately hold `{{` literals
        // outside a placeholder syntax.
        if (!/\{\{[a-zA-Z_][a-zA-Z0-9_]*(?:\[[0-9]+\]|\.[a-zA-Z_][a-zA-Z0-9_]*)*\}\}/.test(merged)) {
          return fullMatch;
        }
        return `${open}${merged}${finalClose}`;
      },
    );
  } while (current !== prev);
  return current;
}

/**
 * Concatenate the <w:t> text content across a sequence of <w:r> blocks.
 */
function extractTextFromRunBlock(runsXml: string): string {
  let out = '';
  const textPattern = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  let match: RegExpExecArray | null;
  while ((match = textPattern.exec(runsXml)) !== null) {
    out += match[1];
  }
  return out;
}

/**
 * Normalize split runs in OOXML.
 *
 * Three passes, each idempotent:
 *
 * 1. `stripInterruptersBetweenRuns` — drops <w:proofErr>, <w:bookmarkStart>,
 *    <w:commentRangeStart> (and End variants) that Word injects mid-placeholder.
 *    Runs either side of the interrupter become true neighbours.
 * 2. Adjacent same-rPr merge (the original regex) — the common case.
 * 3. `mergeRunsAcrossPlaceholders` — when a `{{` opens in one run and
 *    `}}` closes in a later run, collapse the whole span into one run
 *    regardless of intermediate formatting. Only runs when a complete
 *    placeholder name is detected in the merged text; otherwise leaves
 *    the document untouched.
 *
 * Together, these cover the split-placeholder pathologies enumerated
 * in `__tests__/split-placeholder-corpus.test.ts`.
 */
export function normalizeRunSplits(xml: string): string {
  let current = stripInterruptersBetweenRuns(xml);

  // Adjacent-run merge with identical rPr — the original fast path.
  current = current.replace(
    /(<w:r(?:\s[^>]*)?>(?:<w:rPr>(?:(?!<\/?w:r\b)[\s\S])*?<\/w:rPr>)?<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t><\/w:r>)(\s*<w:r(?:\s[^>]*)?>(?:<w:rPr>(?:(?!<\/?w:r\b)[\s\S])*?<\/w:rPr>)?<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t><\/w:r>)/g,
    (fullMatch, openTag1, text1, _closeTag1, openTag2, text2, closeTag2) => {
      const rPr1 = extractRunProperties(openTag1);
      const rPr2 = extractRunProperties(openTag2);
      if (rPr1 === rPr2) {
        return `${openTag1}${text1}${text2}${closeTag2}`;
      }
      return fullMatch;
    },
  );

  current = mergeRunsAcrossPlaceholders(current);
  return current;
}

/**
 * Extract the <w:rPr>...</w:rPr> block from a run opening tag sequence.
 * Returns empty string if no run properties exist.
 */
function extractRunProperties(runOpenSequence: string): string {
  const match = runOpenSequence.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
  return match ? match[1].trim() : '';
}

/**
 * Replace a placeholder in XML content with new text or OOXML fragment.
 *
 * For simple text replacement, the placeholder text within <w:t> is replaced.
 * For complex replacements (tables, images), the entire parent <w:p> paragraph
 * is replaced with the OOXML fragment.
 */
export function replacePlaceholderInXml(
  xml: string,
  key: string,
  replacement: string,
  isComplexReplacement: boolean
): string {
  const placeholder = `{{${key}}}`;

  if (isComplexReplacement) {
    // Replace the entire paragraph containing the placeholder
    // Find <w:p ...>...<w:t>...{{key}}...</w:t>...</w:p> and replace the whole <w:p>
    const escapedPlaceholder = escapeRegex(placeholder);
    const paragraphPattern = new RegExp(
      `<w:p(?:\\s[^>]*)?>(?:(?!<\\/w:p>)[\\s\\S])*?${escapedPlaceholder}(?:(?!<\\/w:p>)[\\s\\S])*?<\\/w:p>`,
      'g'
    );

    return xml.replace(paragraphPattern, replacement);
  }

  // Simple text replacement — just replace the placeholder text
  return xml.split(placeholder).join(replacement);
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get all OOXML parts in a DOCX that may contain placeholders.
 */
export function getScannableParts(): string[] {
  return [
    'word/document.xml',
    'word/header1.xml',
    'word/header2.xml',
    'word/header3.xml',
    'word/footer1.xml',
    'word/footer2.xml',
    'word/footer3.xml',
  ];
}
