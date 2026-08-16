/**
 * XML utility functions for DOCX generation.
 *
 * The canonical escaper lives in ../ooxml/xml-escape.ts (it also strips
 * invalid XML control characters and lone surrogates). Re-exported here so
 * the package has exactly one escapeXml implementation.
 */
export { escapeXml } from '../ooxml/xml-escape.js';
