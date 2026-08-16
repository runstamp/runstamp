/**
 * Standard Helvetica character widths from Adobe's AFM (Adobe Font Metrics) data.
 * Values are in units per 1000 em. Divide by 1000 and multiply by fontSize to get points.
 *
 * Source: Adobe PDF specification, Appendix D — Standard Type 1 Fonts (Helvetica).
 */
const HELVETICA_WIDTHS: Record<number, number> = {
  32: 278, // space
  33: 278, // exclam
  34: 355, // quotedbl
  35: 556, // numbersign
  36: 556, // dollar
  37: 889, // percent
  38: 667, // ampersand
  39: 191, // quotesingle
  40: 333, // parenleft
  41: 333, // parenright
  42: 389, // asterisk
  43: 584, // plus
  44: 278, // comma
  45: 333, // hyphen
  46: 278, // period
  47: 278, // slash
  48: 556, // zero
  49: 556, // one
  50: 556, // two
  51: 556, // three
  52: 556, // four
  53: 556, // five
  54: 556, // six
  55: 556, // seven
  56: 556, // eight
  57: 556, // nine
  58: 278, // colon
  59: 278, // semicolon
  60: 584, // less
  61: 584, // equal
  62: 584, // greater
  63: 556, // question
  64: 1015, // at
  65: 667, // A
  66: 667, // B
  67: 722, // C
  68: 722, // D
  69: 667, // E
  70: 611, // F
  71: 778, // G
  72: 722, // H
  73: 278, // I
  74: 500, // J
  75: 667, // K
  76: 556, // L
  77: 833, // M
  78: 722, // N
  79: 778, // O
  80: 667, // P
  81: 778, // Q
  82: 722, // R
  83: 667, // S
  84: 611, // T
  85: 722, // U
  86: 667, // V
  87: 944, // W
  88: 667, // X
  89: 667, // Y
  90: 611, // Z
  91: 278, // bracketleft
  92: 278, // backslash
  93: 278, // bracketright
  94: 469, // asciicircum
  95: 556, // underscore
  96: 333, // grave
  97: 556, // a
  98: 556, // b
  99: 500, // c
  100: 556, // d
  101: 556, // e
  102: 278, // f
  103: 556, // g
  104: 556, // h
  105: 222, // i
  106: 222, // j
  107: 500, // k
  108: 222, // l
  109: 833, // m
  110: 556, // n
  111: 556, // o
  112: 556, // p
  113: 556, // q
  114: 333, // r
  115: 500, // s
  116: 278, // t
  117: 556, // u
  118: 500, // v
  119: 722, // w
  120: 500, // x
  121: 500, // y
  122: 500, // z
  123: 334, // braceleft
  124: 260, // bar
  125: 334, // braceright
  126: 584, // asciitilde
  160: 278, // nbspace
  161: 333, // exclamdown
  162: 556, // cent
  163: 556, // sterling
  164: 556, // currency
  165: 556, // yen
  166: 260, // brokenbar
  167: 556, // section
  168: 333, // dieresis
  169: 737, // copyright
  170: 370, // ordfeminine
  171: 556, // guillemotleft
  172: 584, // logicalnot
  173: 333, // softhyphen
  174: 737, // registered
  175: 333, // macron
  176: 400, // degree
  177: 584, // plusminus
  178: 333, // twosuperior
  179: 333, // threesuperior
  180: 333, // acute
  181: 556, // mu
  182: 537, // paragraph
  183: 278, // periodcentered / bullet
  184: 333, // cedilla
  185: 333, // onesuperior
  186: 365, // ordmasculine
  187: 556, // guillemotright
  188: 834, // onequarter
  189: 834, // onehalf
  190: 834, // threequarters
  191: 611, // questiondown
  192: 667, // Agrave
  193: 667, // Aacute
  194: 667, // Acircumflex
  195: 667, // Atilde
  196: 667, // Adieresis
  197: 667, // Aring
  198: 1000, // AE
  199: 722, // Ccedilla
  200: 667, // Egrave
  201: 667, // Eacute
  202: 667, // Ecircumflex
  203: 667, // Edieresis
  204: 278, // Igrave
  205: 278, // Iacute
  206: 278, // Icircumflex
  207: 278, // Idieresis
  208: 722, // Eth
  209: 722, // Ntilde
  210: 778, // Ograve
  211: 778, // Oacute
  212: 778, // Ocircumflex
  213: 778, // Otilde
  214: 778, // Odieresis
  215: 584, // multiply
  216: 778, // Oslash
  217: 722, // Ugrave
  218: 722, // Uacute
  219: 722, // Ucircumflex
  220: 722, // Udieresis
  221: 667, // Yacute
  222: 667, // Thorn
  223: 611, // germandbls
  224: 556, // agrave
  225: 556, // aacute
  226: 556, // acircumflex
  227: 556, // atilde
  228: 556, // adieresis
  229: 556, // aring
  230: 889, // ae
  231: 500, // ccedilla
  232: 556, // egrave
  233: 556, // eacute
  234: 556, // ecircumflex
  235: 556, // edieresis
  236: 278, // igrave
  237: 278, // iacute
  238: 278, // icircumflex
  239: 278, // idieresis
  240: 556, // eth
  241: 556, // ntilde
  242: 556, // ograve
  243: 556, // oacute
  244: 556, // ocircumflex
  245: 556, // otilde
  246: 556, // odieresis
  247: 584, // divide
  248: 611, // oslash
  249: 556, // ugrave
  250: 556, // uacute
  251: 556, // ucircumflex
  252: 556, // udieresis
  253: 500, // yacute
  254: 556, // thorn
  255: 500, // ydieresis
  8226: 350, // bullet (Unicode)
  8211: 556, // endash
  8212: 1000, // emdash
  8216: 222, // quoteleft
  8217: 222, // quoteright
  8220: 333, // quotedblleft
  8221: 333, // quotedblright
  8230: 1000, // ellipsis
};

const DEFAULT_HELVETICA_WIDTH = 556;

/**
 * Measure the width of a text string rendered in Helvetica at the given font size.
 * No kerning applied — matches the PDF output which uses simple (text) Tj operators.
 * PDF viewers may apply their own kerning when rendering, but our measurement must
 * match what we tell the viewer (individual glyph advances without kerning).
 */
export function measureHelveticaText(text: string, fontSize: number): number {
  let totalWidth = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    totalWidth += HELVETICA_WIDTHS[code] ?? DEFAULT_HELVETICA_WIDTH;
  }
  return (totalWidth / 1000) * fontSize;
}

/**
 * Approximate the width of a single character rendered in Helvetica at the given font size.
 * Used for per-character width estimation in phase6 (TOC, page numbers).
 */
export function approxHelveticaCharWidth(char: string, fontSize: number): number {
  const code = char.charCodeAt(0);
  const glyphWidth = HELVETICA_WIDTHS[code] ?? DEFAULT_HELVETICA_WIDTH;
  return (glyphWidth / 1000) * fontSize;
}
