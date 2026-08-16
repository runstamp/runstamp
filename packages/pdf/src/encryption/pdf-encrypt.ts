import { createCipheriv, createHash, randomBytes } from "node:crypto";
import {
  PDFDictionary,
  PDFName,
  PDFNumber,
  PDFRaw,
  type PDFValue,
} from "../pdf-objects.js";
import { computePermissionFlags } from "./permissions.js";
import type { PdfEncryptionConfig, PdfEncryptionResult } from "./types.js";

// Standard 32-byte PDF password padding constant (ISO 32000-1 §7.6.3.3 / Table 3.19).
// The trailing 22 bytes were transcribed incorrectly in an earlier revision; every
// spec-compliant reader (qpdf, poppler, pypdf) rejected the resulting /U because the
// derived encryption key disagreed.
const PDF_PASSWORD_PADDING = Buffer.from([
  0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41,
  0x64, 0x00, 0x4E, 0x56, 0xFF, 0xFA, 0x01, 0x08,
  0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80,
  0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A,
]);

function md5(data: Buffer): Buffer {
  return createHash("md5").update(data).digest();
}

function sha256(data: Buffer): Buffer {
  return createHash("sha256").update(data).digest();
}

/**
 * Algorithm 2.B from ISO 32000-2 §7.6.4.3.3.
 * Derives a 32-byte intermediate key from a password, salt, and optional U value.
 * The result is used to compute /U, /UE, /O, /OE values for R=6 encryption.
 */
function algorithm2B(password: Buffer, salt: Buffer, udata: Buffer): Buffer {
  let K = createHash("sha256").update(password).update(salt).update(udata).digest();
  // Round counter is 1-indexed per the spec (and per qpdf / pypdf reference
  // implementations) — the termination check uses (round - 32), so an
  // off-by-one here makes the engine produce a /U or file key that
  // intermittently disagrees with spec-compliant readers.
  for (let round = 1; round <= 1024; round++) {
    // K1 is the concatenation of (password || K || udata) repeated 64 times.
    const block = Buffer.concat([password, K, udata]);
    const K1 = Buffer.alloc(block.length * 64);
    for (let i = 0; i < 64; i++) {
      block.copy(K1, i * block.length);
    }

    // E = AES-128-CBC(key=K[0..16], iv=K[16..32]).encrypt(K1) with no padding.
    const cipher = createCipheriv("aes-128-cbc", K.subarray(0, 16), K.subarray(16, 32));
    cipher.setAutoPadding(false);
    const E = Buffer.concat([cipher.update(K1), cipher.final()]);

    // Sum of the first 16 bytes of E modulo 3 selects the next hash function.
    // 256 ≡ 1 (mod 3), so the integer-mod-3 of the BE-128-bit value equals
    // the sum-of-bytes mod 3.
    let sum = 0;
    for (let i = 0; i < 16; i++) sum += E[i];
    const remainder = sum % 3;
    if (remainder === 0) K = createHash("sha256").update(E).digest();
    else if (remainder === 1) K = createHash("sha384").update(E).digest();
    else K = createHash("sha512").update(E).digest();

    if (round >= 64 && E[E.length - 1] <= round - 32) {
      break;
    }
  }
  return K.subarray(0, 32);
}

function padPassword(password: string): Buffer {
  const pwd = Buffer.from(password, "latin1");
  return Buffer.concat([pwd, PDF_PASSWORD_PADDING]).subarray(0, 32);
}

/**
 * RC4 stream cipher — used ONLY for V4 owner/user hash derivation,
 * never for content encryption.
 */
function rc4(key: Buffer, data: Buffer): Buffer {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 0xFF;
    [s[i], s[j]] = [s[j], s[i]];
  }
  const result = Buffer.alloc(data.length);
  let x = 0;
  j = 0;
  for (let i = 0; i < data.length; i++) {
    x = (x + 1) & 0xFF;
    j = (j + s[x]) & 0xFF;
    [s[x], s[j]] = [s[j], s[x]];
    result[i] = data[i] ^ s[(s[x] + s[j]) & 0xFF];
  }
  return result;
}

function hexPdfRaw(buf: Buffer): PDFRaw {
  return new PDFRaw(Buffer.from(`<${buf.toString("hex").toUpperCase()}>`, "ascii"));
}

// ---------------------------------------------------------------------------
// AES-128 (V4, R4)
// ---------------------------------------------------------------------------

function createAes128Encryption(config: PdfEncryptionConfig, permissionInt: number): PdfEncryptionResult {
  const fileId: [Buffer, Buffer] = [randomBytes(16), randomBytes(16)];

  const paddedUser = padPassword(config.userPassword);
  const paddedOwner = padPassword(config.ownerPassword ?? config.userPassword);

  // Compute O value (owner hash)
  let ownerKey = md5(paddedOwner);
  for (let i = 0; i < 50; i++) {
    ownerKey = md5(ownerKey).subarray(0, 16);
  }
  let ownerHash = rc4(ownerKey, paddedUser);
  for (let i = 1; i <= 19; i++) {
    const xorKey = Buffer.alloc(ownerKey.length);
    for (let b = 0; b < ownerKey.length; b++) {
      xorKey[b] = ownerKey[b] ^ i;
    }
    ownerHash = rc4(xorKey, ownerHash);
  }

  // Compute encryption key (16 bytes)
  const permBytes = Buffer.alloc(4);
  permBytes.writeInt32LE(permissionInt, 0);

  let encKey = md5(Buffer.concat([paddedUser, ownerHash, permBytes, fileId[0]]));
  for (let i = 0; i < 50; i++) {
    encKey = md5(encKey).subarray(0, 16);
  }

  // Compute U value (user hash)
  const uBase = md5(Buffer.concat([PDF_PASSWORD_PADDING, fileId[0]]));
  let userHash = rc4(encKey, uBase);
  for (let i = 1; i <= 19; i++) {
    const xorKey = Buffer.alloc(encKey.length);
    for (let b = 0; b < encKey.length; b++) {
      xorKey[b] = encKey[b] ^ i;
    }
    userHash = rc4(xorKey, userHash);
  }
  // Pad U to 32 bytes
  userHash = Buffer.concat([userHash, Buffer.alloc(16)]).subarray(0, 32);

  // Build encrypt dictionary
  const encryptDict: Record<string, PDFValue> = {
    CF: new PDFDictionary({
      StdCF: new PDFDictionary({
        AuthEvent: new PDFName("DocOpen"),
        CFM: new PDFName("AESV2"),
        Length: new PDFNumber(16),
      }),
    }),
    Filter: new PDFName("Standard"),
    Length: new PDFNumber(128),
    O: hexPdfRaw(ownerHash),
    P: new PDFNumber(permissionInt),
    R: new PDFNumber(4),
    StmF: new PDFName("StdCF"),
    StrF: new PDFName("StdCF"),
    U: hexPdfRaw(userHash),
    V: new PDFNumber(4),
  };

  // Per-object key derivation for AES-128
  function deriveObjectKey(objNum: number, genNum: number): Buffer {
    const objBytes = Buffer.alloc(3);
    objBytes.writeUIntLE(objNum, 0, 3);
    const genBytes = Buffer.alloc(2);
    genBytes.writeUIntLE(genNum, 0, 2);
    const salt = Buffer.from([0x73, 0x41, 0x6C, 0x54]); // "sAlT"
    const hash = md5(Buffer.concat([encKey, objBytes, genBytes, salt]));
    return hash.subarray(0, Math.min(encKey.length + 5, 16));
  }

  function encryptAes128(data: Buffer, objNum: number, genNum: number): Buffer {
    const key = deriveObjectKey(objNum, genNum);
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-128-cbc", key, iv);
    cipher.setAutoPadding(true);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  return {
    encryptDict,
    encryptStream: encryptAes128,
    encryptString: encryptAes128,
    fileId,
  };
}

// ---------------------------------------------------------------------------
// AES-256 (V5, R6)
// ---------------------------------------------------------------------------

function createAes256Encryption(config: PdfEncryptionConfig, permissionInt: number): PdfEncryptionResult {
  const fileId: [Buffer, Buffer] = [randomBytes(16), randomBytes(16)];
  const fileEncryptionKey = randomBytes(32);

  // Normalize passwords (UTF-8, truncate to 127 bytes)
  const userPwd = Buffer.from(config.userPassword, "utf8").subarray(0, 127);
  const ownerPwd = Buffer.from(config.ownerPassword ?? config.userPassword, "utf8").subarray(0, 127);

  // Generate salts
  const userValidationSalt = randomBytes(8);
  const userKeySalt = randomBytes(8);
  const ownerValidationSalt = randomBytes(8);
  const ownerKeySalt = randomBytes(8);

  const empty = Buffer.alloc(0);

  // /U = (Algorithm 2.B(pwd, validationSalt, "")) || validationSalt || keySalt   (48 bytes)
  const uHash = algorithm2B(userPwd, userValidationSalt, empty);
  const U = Buffer.concat([uHash, userValidationSalt, userKeySalt]);

  // /UE = AES-256-CBC(key=Algorithm 2.B(pwd, userKeySalt, ""), iv=zeros, no pad).encrypt(fileKey)
  const ueKey = algorithm2B(userPwd, userKeySalt, empty);
  const ueIv = Buffer.alloc(16);
  const ueCipher = createCipheriv("aes-256-cbc", ueKey, ueIv);
  ueCipher.setAutoPadding(false);
  const UE = Buffer.concat([ueCipher.update(fileEncryptionKey), ueCipher.final()]);

  // /O = (Algorithm 2.B(ownerPwd, ownerValidationSalt, U)) || ownerValidationSalt || ownerKeySalt
  const oHash = algorithm2B(ownerPwd, ownerValidationSalt, U);
  const O = Buffer.concat([oHash, ownerValidationSalt, ownerKeySalt]);

  // /OE = AES-256-CBC(key=Algorithm 2.B(ownerPwd, ownerKeySalt, U), iv=zeros, no pad).encrypt(fileKey)
  const oeKey = algorithm2B(ownerPwd, ownerKeySalt, U);
  const oeIv = Buffer.alloc(16);
  const oeCipher = createCipheriv("aes-256-cbc", oeKey, oeIv);
  oeCipher.setAutoPadding(false);
  const OE = Buffer.concat([oeCipher.update(fileEncryptionKey), oeCipher.final()]);

  // Perms (16 bytes)
  const permsBlock = Buffer.alloc(16);
  permsBlock.writeInt32LE(permissionInt, 0);
  permsBlock[4] = 0xFF;
  permsBlock[5] = 0xFF;
  permsBlock[6] = 0xFF;
  permsBlock[7] = 0xFF;
  permsBlock[8] = 0x54; // 'T'
  permsBlock[9] = 0x61; // 'a'
  permsBlock[10] = 0x64; // 'd'
  permsBlock[11] = 0x62; // 'b'
  // bytes 12-15 remain 0
  const permsCipher = createCipheriv("aes-256-ecb", fileEncryptionKey, null);
  permsCipher.setAutoPadding(false);
  const Perms = Buffer.concat([permsCipher.update(permsBlock), permsCipher.final()]);

  // Build encrypt dictionary
  const encryptDict: Record<string, PDFValue> = {
    CF: new PDFDictionary({
      StdCF: new PDFDictionary({
        AuthEvent: new PDFName("DocOpen"),
        CFM: new PDFName("AESV3"),
        Length: new PDFNumber(32),
      }),
    }),
    Filter: new PDFName("Standard"),
    Length: new PDFNumber(256),
    O: hexPdfRaw(O),
    OE: hexPdfRaw(OE),
    P: new PDFNumber(permissionInt),
    Perms: hexPdfRaw(Perms),
    R: new PDFNumber(6),
    StmF: new PDFName("StdCF"),
    StrF: new PDFName("StdCF"),
    U: hexPdfRaw(U),
    UE: hexPdfRaw(UE),
    V: new PDFNumber(5),
  };

  // Per-object encryption for AES-256: use fileEncryptionKey directly (no per-object derivation)
  function encryptAes256(data: Buffer, _objNum: number, _genNum: number): Buffer {
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-cbc", fileEncryptionKey, iv);
    cipher.setAutoPadding(true);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  return {
    encryptDict,
    encryptStream: encryptAes256,
    encryptString: encryptAes256,
    fileId,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createEncryption(config: PdfEncryptionConfig): PdfEncryptionResult {
  const permissionInt = computePermissionFlags(config.permissions);

  if (config.algorithm === "aes-256") {
    return createAes256Encryption(config, permissionInt);
  }

  return createAes128Encryption(config, permissionInt);
}
