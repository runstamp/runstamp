/**
 * SecurePDF - Pro Utility
 * =======================
 * PDF security and manipulation utilities using pdf-lib.
 *
 * This module provides enterprise-grade PDF operations:
 * - Password protection (user & owner passwords)
 * - Permission restrictions (print, copy, modify)
 * - PDF merging (combine multiple PDFs)
 * - Metadata manipulation
 * - Digital signatures (basic)
 * - PDF/A compliance helpers
 *
 * Uses pdf-lib - the most popular JavaScript PDF manipulation library
 * with 100% pure JS implementation (no native dependencies).
 *
 * @example
 * ```ts
 * import { SecurePDF, SecurePDFError } from "@runstamp/pro";
 *
 * // Add password protection (throws if encryption unavailable)
 * try {
 *   const secured = await SecurePDF.protect(pdfBytes, {
 *     userPassword: "viewer123",
 *     ownerPassword: "admin456",
 *     permissions: {
 *       printing: "low-resolution",
 *       modifying: false,
 *       copying: false,
 *     }
 *   });
 * } catch (error) {
 *   if (error instanceof SecurePDFError) {
 *     console.error("Encryption failed:", error.code);
 *   }
 * }
 *
 * // Opt-out of strict mode (NOT RECOMMENDED - security risk)
 * const maybeSecured = await SecurePDF.protect(pdfBytes, {
 *   userPassword: "viewer123",
 *   requireEncryption: false, // Returns unencrypted if encryption unavailable
 * });
 *
 * // Merge multiple PDFs
 * const merged = await SecurePDF.merge([pdf1, pdf2, pdf3]);
 * ```
 *
 * IMPORTANT: This utility requires pdf-lib as a peer dependency.
 * Install with: pnpm add pdf-lib
 */

// Note: pdf-lib types - user must install pdf-lib separately
// import { PDFDocument, StandardFonts } from "pdf-lib";

export interface ProtectOptions {
  /** Password required to open/view the PDF */
  userPassword?: string;
  /** Password required for full access (modify, print, etc.) */
  ownerPassword?: string;
  /** Permission restrictions */
  permissions?: PDFPermissions;
  /**
   * Throw an error if pdf-lib doesn't support encryption
   * When true (default), throws SecurePDFError if encryption is unavailable
   * When false, returns unencrypted PDF with a warning (SECURITY RISK)
   *
   * @default true
   */
  requireEncryption?: boolean;
}

/**
 * Error thrown when SecurePDF operations fail
 */
export class SecurePDFError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "SecurePDFError";
    this.code = code;
    this.details = details;
  }
}

export interface PDFPermissions {
  /** Allow printing: false | 'low-resolution' | 'high-resolution' */
  printing?: false | "low-resolution" | "high-resolution";
  /** Allow content modification */
  modifying?: boolean;
  /** Allow copying text/images */
  copying?: boolean;
  /** Allow adding annotations */
  annotating?: boolean;
  /** Allow form filling */
  fillingForms?: boolean;
  /** Allow content extraction for accessibility */
  contentAccessibility?: boolean;
  /** Allow document assembly (insert, rotate, delete pages) */
  documentAssembly?: boolean;
}

export interface MergeOptions {
  /** Document metadata for the merged PDF */
  metadata?: PDFMetadata;
  /** Add page numbers to the merged document */
  addPageNumbers?: boolean;
  /** Page number format */
  pageNumberFormat?: "numeric" | "roman" | "alpha";
  /** Page number position */
  pageNumberPosition?:
    | "bottom-center"
    | "bottom-right"
    | "top-center"
    | "top-right";
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export interface WatermarkOptions {
  /** Watermark text */
  text: string;
  /** Font size (default: 48) */
  fontSize?: number;
  /** Text color in hex (default: #888888) */
  color?: string;
  /** Opacity 0-1 (default: 0.3) */
  opacity?: number;
  /** Rotation angle in degrees (default: -45) */
  rotation?: number;
  /** Position: center, tile, or custom */
  position?: "center" | "tile";
  /** Apply to which pages: 'all' | 'first' | 'last' | number[] */
  pages?: "all" | "first" | "last" | number[];
}

export interface SignatureOptions {
  /** Signer name */
  name: string;
  /** Reason for signing */
  reason?: string;
  /** Location of signing */
  location?: string;
  /** Contact info */
  contactInfo?: string;
  /** Date of signing (default: now) */
  date?: Date;
  /** Visual signature image (base64 or URL) */
  signatureImage?: string;
  /** Position of visual signature */
  position?: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * SecurePDF - Enterprise PDF Security and Manipulation
 *
 * Provides a high-level API for common PDF operations.
 * All methods work with PDF bytes (Uint8Array) and return modified PDF bytes.
 */
export class SecurePDF {
  /**
   * Check if pdf-lib supports encryption
   *
   * @returns Promise<boolean> - true if encryption is supported
   *
   * @example
   * ```ts
   * if (await SecurePDF.supportsEncryption()) {
   *   const secured = await SecurePDF.protect(pdfBytes, { userPassword: "test" });
   * }
   * ```
   */
  static async supportsEncryption(): Promise<boolean> {
    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      // @ts-expect-error - encrypt may not be in all pdf-lib types
      return typeof pdfDoc.encrypt === "function";
    } catch {
      return false;
    }
  }

  /**
   * Get the installed pdf-lib version
   *
   * @returns Promise<string | null> - version string or null if unavailable
   */
  static async getPdfLibVersion(): Promise<string | null> {
    try {
      // Try to get version from package.json import
      // Note: This may not work in all bundler configurations
      const pdfLib = await import("pdf-lib");
      // @ts-expect-error - version may not be exported
      return pdfLib.version || pdfLib.VERSION || null;
    } catch {
      return null;
    }
  }

  /**
   * Add password protection and permission restrictions to a PDF
   *
   * @param pdfBytes - Source PDF as Uint8Array
   * @param options - Protection options
   * @returns Protected PDF as Uint8Array
   *
   * @example
   * ```ts
   * const secured = await SecurePDF.protect(pdfBytes, {
   *   userPassword: "viewonly123",
   *   ownerPassword: "fullaccess456",
   *   permissions: {
   *     printing: "low-resolution",
   *     copying: false,
   *   }
   * });
   * ```
   */
  static async protect(
    pdfBytes: Uint8Array,
    options: ProtectOptions,
  ): Promise<Uint8Array> {
    // Dynamic import to avoid bundling if not used
    const { PDFDocument } = await import("pdf-lib");

    const pdfDoc = await PDFDocument.load(pdfBytes);

    // pdf-lib's encrypt method
    // Note: Full encryption requires pdf-lib's encryption features
    // which may need additional setup for AES-256 encryption

    const encryptOptions: Record<string, unknown> = {};

    if (options.userPassword) {
      encryptOptions.userPassword = options.userPassword;
    }

    if (options.ownerPassword) {
      encryptOptions.ownerPassword = options.ownerPassword;
    }

    if (options.permissions) {
      const perms = options.permissions;

      // Map our permissions to pdf-lib format
      encryptOptions.permissions = {
        printing:
          perms.printing === false
            ? "none"
            : perms.printing || "high-resolution",
        modifying: perms.modifying ?? true,
        copying: perms.copying ?? true,
        annotating: perms.annotating ?? true,
        fillingForms: perms.fillingForms ?? true,
        contentAccessibility: perms.contentAccessibility ?? true,
        documentAssembly: perms.documentAssembly ?? true,
      };
    }

    // Note: pdf-lib 1.17+ supports encrypt method
    // For older versions, this might need a polyfill
    // @ts-expect-error - encrypt may not be in all pdf-lib types
    if (typeof pdfDoc.encrypt === "function") {
      // @ts-expect-error - encrypt may not be in all pdf-lib types
      await pdfDoc.encrypt(encryptOptions);
    } else {
      const message =
        "SecurePDF: pdf-lib version does not support encryption. " +
        "Please upgrade to pdf-lib 1.17+ or use a PDF encryption library.";

      // Default to throwing - silent failures are a security risk
      // Users must explicitly opt-out with requireEncryption: false
      if (options.requireEncryption !== false) {
        throw new SecurePDFError(
          message,
          "ENCRYPTION_NOT_SUPPORTED",
          { pdfLibVersion: await SecurePDF.getPdfLibVersion() }
        );
      }

      // User explicitly requested silent fallback (requireEncryption: false)
      console.warn(
        message +
          " Returning unencrypted PDF because requireEncryption was set to false."
      );
    }

    return pdfDoc.save();
  }

  /**
   * Merge multiple PDFs into a single document
   *
   * @param pdfBytesList - Array of PDF byte arrays
   * @param options - Merge options
   * @returns Merged PDF as Uint8Array
   *
   * @example
   * ```ts
   * const merged = await SecurePDF.merge([
   *   coverPagePdf,
   *   contentPdf,
   *   appendixPdf
   * ], {
   *   metadata: { title: "Complete Report" },
   *   addPageNumbers: true
   * });
   * ```
   */
  static async merge(
    pdfBytesList: Uint8Array[],
    options: MergeOptions = {},
  ): Promise<Uint8Array> {
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");

    if (pdfBytesList.length === 0) {
      throw new SecurePDFError("SecurePDF.merge: No PDFs provided", "NO_PDFS_PROVIDED");
    }

    if (pdfBytesList.length === 1) {
      return pdfBytesList[0];
    }

    const mergedPdf = await PDFDocument.create();

    // Copy pages from each source PDF
    for (const pdfBytes of pdfBytesList) {
      const sourcePdf = await PDFDocument.load(pdfBytes);
      const pageIndices = sourcePdf.getPageIndices();
      const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);

      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    }

    // Set metadata
    if (options.metadata) {
      const meta = options.metadata;
      if (meta.title) mergedPdf.setTitle(meta.title);
      if (meta.author) mergedPdf.setAuthor(meta.author);
      if (meta.subject) mergedPdf.setSubject(meta.subject);
      if (meta.keywords) mergedPdf.setKeywords(meta.keywords);
      if (meta.creator) mergedPdf.setCreator(meta.creator);
      if (meta.producer) mergedPdf.setProducer(meta.producer);
      if (meta.creationDate) mergedPdf.setCreationDate(meta.creationDate);
      if (meta.modificationDate)
        mergedPdf.setModificationDate(meta.modificationDate);
    }

    // Add page numbers if requested
    if (options.addPageNumbers) {
      const pages = mergedPdf.getPages();
      const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
      const fontSize = 10;

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const pageNumber = formatPageNumber(i + 1, options.pageNumberFormat);

        // Calculate position
        let x: number;
        let y: number;

        switch (options.pageNumberPosition) {
          case "bottom-right":
            x = width - 50;
            y = 30;
            break;
          case "top-center":
            x = width / 2;
            y = height - 30;
            break;
          case "top-right":
            x = width - 50;
            y = height - 30;
            break;
          case "bottom-center":
          default:
            x = width / 2;
            y = 30;
            break;
        }

        page.drawText(pageNumber, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
    }

    return mergedPdf.save();
  }

  /**
   * Add a watermark to a PDF
   *
   * @param pdfBytes - Source PDF as Uint8Array
   * @param options - Watermark options
   * @returns Watermarked PDF as Uint8Array
   *
   * @example
   * ```ts
   * const watermarked = await SecurePDF.watermark(pdfBytes, {
   *   text: "CONFIDENTIAL",
   *   opacity: 0.2,
   *   rotation: -45,
   *   position: "center"
   * });
   * ```
   */
  static async watermark(
    pdfBytes: Uint8Array,
    options: WatermarkOptions,
  ): Promise<Uint8Array> {
    const { PDFDocument, rgb, StandardFonts, degrees } =
      await import("pdf-lib");

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const {
      text,
      fontSize = 48,
      color = "#888888",
      opacity = 0.3,
      rotation = -45,
      position = "center",
      pages: targetPages = "all",
    } = options;

    // Parse color
    const hexColor = color.replace("#", "");
    const r = parseInt(hexColor.slice(0, 2), 16) / 255;
    const g = parseInt(hexColor.slice(2, 4), 16) / 255;
    const b = parseInt(hexColor.slice(4, 6), 16) / 255;

    // Determine which pages to watermark
    let pageIndices: number[];
    if (targetPages === "all") {
      pageIndices = pages.map((_, i) => i);
    } else if (targetPages === "first") {
      pageIndices = [0];
    } else if (targetPages === "last") {
      pageIndices = [pages.length - 1];
    } else {
      pageIndices = targetPages.map((p) => p - 1); // Convert to 0-indexed
    }

    for (const pageIndex of pageIndices) {
      if (pageIndex < 0 || pageIndex >= pages.length) continue;

      const page = pages[pageIndex];
      const { width, height } = page.getSize();

      if (position === "center") {
        // Single centered watermark
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const centerX = width / 2 - textWidth / 2;
        const centerY = height / 2;

        page.drawText(text, {
          x: centerX,
          y: centerY,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          opacity,
          rotate: degrees(rotation),
        });
      } else if (position === "tile") {
        // Tiled watermark pattern
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const spacing = Math.max(textWidth, fontSize * 3);

        for (let x = 0; x < width + spacing; x += spacing * 1.5) {
          for (let y = 0; y < height + spacing; y += spacing) {
            page.drawText(text, {
              x,
              y,
              size: fontSize,
              font,
              color: rgb(r, g, b),
              opacity,
              rotate: degrees(rotation),
            });
          }
        }
      }
    }

    return pdfDoc.save();
  }

  /**
   * Set or update PDF metadata
   *
   * @param pdfBytes - Source PDF as Uint8Array
   * @param metadata - Metadata to set
   * @returns Modified PDF as Uint8Array
   */
  static async setMetadata(
    pdfBytes: Uint8Array,
    metadata: PDFMetadata,
  ): Promise<Uint8Array> {
    const { PDFDocument } = await import("pdf-lib");

    const pdfDoc = await PDFDocument.load(pdfBytes);

    if (metadata.title) pdfDoc.setTitle(metadata.title);
    if (metadata.author) pdfDoc.setAuthor(metadata.author);
    if (metadata.subject) pdfDoc.setSubject(metadata.subject);
    if (metadata.keywords) pdfDoc.setKeywords(metadata.keywords);
    if (metadata.creator) pdfDoc.setCreator(metadata.creator);
    if (metadata.producer) pdfDoc.setProducer(metadata.producer);
    if (metadata.creationDate) pdfDoc.setCreationDate(metadata.creationDate);
    if (metadata.modificationDate)
      pdfDoc.setModificationDate(metadata.modificationDate);

    return pdfDoc.save();
  }

  /**
   * Extract pages from a PDF
   *
   * @param pdfBytes - Source PDF as Uint8Array
   * @param pageNumbers - Array of page numbers to extract (1-indexed)
   * @returns New PDF with only the extracted pages
   */
  static async extractPages(
    pdfBytes: Uint8Array,
    pageNumbers: number[],
  ): Promise<Uint8Array> {
    const { PDFDocument } = await import("pdf-lib");

    const sourcePdf = await PDFDocument.load(pdfBytes);
    const extractedPdf = await PDFDocument.create();

    // Convert to 0-indexed
    const pageIndices = pageNumbers.map((p) => p - 1);

    const copiedPages = await extractedPdf.copyPages(sourcePdf, pageIndices);
    for (const page of copiedPages) {
      extractedPdf.addPage(page);
    }

    return extractedPdf.save();
  }

  /**
   * Split a PDF into multiple single-page PDFs
   *
   * @param pdfBytes - Source PDF as Uint8Array
   * @returns Array of single-page PDFs
   */
  static async split(pdfBytes: Uint8Array): Promise<Uint8Array[]> {
    const { PDFDocument } = await import("pdf-lib");

    const sourcePdf = await PDFDocument.load(pdfBytes);
    const pageCount = sourcePdf.getPageCount();
    const result: Uint8Array[] = [];

    for (let i = 0; i < pageCount; i++) {
      const singlePagePdf = await PDFDocument.create();
      const [copiedPage] = await singlePagePdf.copyPages(sourcePdf, [i]);
      singlePagePdf.addPage(copiedPage);
      result.push(await singlePagePdf.save());
    }

    return result;
  }

  /**
   * Add a visual signature to a PDF
   *
   * Note: This adds a VISUAL signature only (image + metadata).
   * For cryptographic digital signatures that provide legal validity,
   * use a dedicated signing service like DocuSign, Adobe Sign, or
   * a library that supports PKCS#7 signing (e.g., node-signpdf).
   *
   * @param pdfBytes - Source PDF as Uint8Array
   * @param options - Signature options
   * @returns Signed PDF as Uint8Array
   *
   * @example
   * ```ts
   * const signed = await SecurePDF.sign(pdfBytes, {
   *   name: "John Doe",
   *   reason: "Document approval",
   *   location: "New York, NY",
   *   position: { page: 1, x: 400, y: 50, width: 150, height: 50 }
   * });
   * ```
   */
  static async sign(
    pdfBytes: Uint8Array,
    options: SignatureOptions,
  ): Promise<Uint8Array> {
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    const { name, reason, location, contactInfo, date, signatureImage, position } = options;
    const signingDate = date || new Date();

    // Add signature to specified page (default: last page)
    const pageIndex = (position?.page ?? pages.length) - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) {
      throw new SecurePDFError(
        `Invalid page number: ${position?.page}. PDF has ${pages.length} pages.`,
        "INVALID_PAGE",
        { requestedPage: position?.page, totalPages: pages.length }
      );
    }

    const page = pages[pageIndex];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 10;
    const lineHeight = fontSize * 1.4;

    // Default position if not specified
    const { width: pageWidth } = page.getSize();
    const sigX = position?.x ?? pageWidth - 200;
    const sigY = position?.y ?? 80;
    const sigWidth = position?.width ?? 180;
    const sigHeight = position?.height ?? 60;

    // Draw signature box border
    page.drawRectangle({
      x: sigX,
      y: sigY,
      width: sigWidth,
      height: sigHeight,
      borderColor: rgb(0.6, 0.6, 0.6),
      borderWidth: 0.5,
    });

    // Draw signature image if provided
    if (signatureImage) {
      try {
        let imageBytes: Uint8Array;
        if (signatureImage.startsWith("data:image/png")) {
          // Base64 PNG
          const base64Data = signatureImage.split(",")[1];
          imageBytes = Uint8Array.from(Buffer.from(base64Data, 'base64').toString('binary'), c => c.charCodeAt(0));
          const pngImage = await pdfDoc.embedPng(imageBytes);
          page.drawImage(pngImage, {
            x: sigX + 5,
            y: sigY + sigHeight - 35,
            width: sigWidth - 10,
            height: 30,
          });
        } else if (signatureImage.startsWith("data:image/jpeg") || signatureImage.startsWith("data:image/jpg")) {
          // Base64 JPEG
          const base64Data = signatureImage.split(",")[1];
          imageBytes = Uint8Array.from(Buffer.from(base64Data, 'base64').toString('binary'), c => c.charCodeAt(0));
          const jpgImage = await pdfDoc.embedJpg(imageBytes);
          page.drawImage(jpgImage, {
            x: sigX + 5,
            y: sigY + sigHeight - 35,
            width: sigWidth - 10,
            height: 30,
          });
        }
      } catch (imgError) {
        // Continue without image if embedding fails
        console.warn("SecurePDF.sign: Failed to embed signature image:", imgError);
      }
    }

    // Draw signature text
    let textY = sigY + sigHeight - (signatureImage ? 45 : 15);

    // Signed by line
    page.drawText(`Signed by: ${name}`, {
      x: sigX + 5,
      y: textY,
      size: fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    textY -= lineHeight;

    // Date line
    page.drawText(`Date: ${signingDate.toLocaleDateString()}`, {
      x: sigX + 5,
      y: textY,
      size: fontSize - 1,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    textY -= lineHeight;

    // Reason line (if provided)
    if (reason) {
      page.drawText(`Reason: ${reason}`, {
        x: sigX + 5,
        y: textY,
        size: fontSize - 1,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    // Add signature metadata to document
    const existingKeywords = pdfDoc.getKeywords() || "";
    const sigMetadata = [
      existingKeywords,
      `sig:name=${name}`,
      `sig:date=${signingDate.toISOString()}`,
      reason ? `sig:reason=${reason}` : "",
      location ? `sig:location=${location}` : "",
      contactInfo ? `sig:contact=${contactInfo}` : "",
    ].filter(Boolean).join(",");
    pdfDoc.setKeywords([sigMetadata]);

    return pdfDoc.save();
  }

  /**
   * Get PDF document info
   *
   * @param pdfBytes - PDF as Uint8Array
   * @returns Document information
   */
  static async getInfo(pdfBytes: Uint8Array): Promise<{
    pageCount: number;
    metadata: PDFMetadata;
    pagesSizes: Array<{ width: number; height: number }>;
  }> {
    const { PDFDocument } = await import("pdf-lib");

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    return {
      pageCount: pdfDoc.getPageCount(),
      metadata: {
        title: pdfDoc.getTitle(),
        author: pdfDoc.getAuthor(),
        subject: pdfDoc.getSubject(),
        keywords: pdfDoc
          .getKeywords()
          ?.split(",")
          .map((k) => k.trim()),
        creator: pdfDoc.getCreator(),
        producer: pdfDoc.getProducer(),
        creationDate: pdfDoc.getCreationDate(),
        modificationDate: pdfDoc.getModificationDate(),
      },
      pagesSizes: pages.map((page) => {
        const { width, height } = page.getSize();
        return { width, height };
      }),
    };
  }
}

// Helper function to format page numbers
function formatPageNumber(
  pageNum: number,
  format?: "numeric" | "roman" | "alpha",
): string {
  switch (format) {
    case "roman":
      return toRoman(pageNum);
    case "alpha":
      return toAlpha(pageNum);
    case "numeric":
    default:
      return String(pageNum);
  }
}

function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  let result = "";
  for (const [value, symbol] of romanNumerals) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
}

function toAlpha(num: number): string {
  let result = "";
  while (num > 0) {
    num--;
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
}

export default SecurePDF;
