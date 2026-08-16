export type PdfEncryptionAlgorithm = "aes-128" | "aes-256";

export interface PdfPermissionFlags {
  print?: boolean;           // bit 3, default true
  modify?: boolean;          // bit 4, default false
  copy?: boolean;            // bit 5, default false
  annotate?: boolean;        // bit 6, default false
  fillForms?: boolean;       // bit 9, default false
  extract?: boolean;         // bit 10 (accessibility), default false
  assemble?: boolean;        // bit 11, default false
  printHighQuality?: boolean;// bit 12, default true
}

export interface PdfEncryptionConfig {
  userPassword: string;
  ownerPassword?: string;       // Pro only
  permissions?: PdfPermissionFlags; // Pro only
  algorithm?: PdfEncryptionAlgorithm; // "aes-256" is Pro only, default "aes-128"
}

export interface PdfEncryptionResult {
  encryptDict: Record<string, import("../pdf-objects.js").PDFValue>;
  fileId: [Buffer, Buffer];
  encryptString(data: Buffer, objectNumber: number, generationNumber: number): Buffer;
  encryptStream(data: Buffer, objectNumber: number, generationNumber: number): Buffer;
}
