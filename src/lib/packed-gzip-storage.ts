/**
 * localStorage stores UTF-16 strings. Base64 spends 4 UTF-16 characters per
 * 3 compressed bytes; packing 15 bits into each non-surrogate character uses
 * about 60% fewer characters, without changing any gzip byte or business data.
 */
export const PACKED_GZIP_STORAGE_PREFIX = "factu-gzip-utf16-v1:";
const OFFSET = 0x100;
const MASK = 0x7fff;

export function encodePackedGzipStorage(bytes: Uint8Array): string {
  if (bytes.length === 0) throw new Error("empty_packed_gzip");
  const chunks: string[] = [];
  let codes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    if (bits >= 15) {
      bits -= 15;
      codes.push(OFFSET + ((buffer >>> bits) & MASK));
      buffer &= (1 << bits) - 1;
    }
    if (codes.length === 8192) {
      chunks.push(String.fromCharCode(...codes));
      codes = [];
    }
  }
  if (bits > 0) codes.push(OFFSET + (buffer << (15 - bits)));
  if (codes.length > 0) chunks.push(String.fromCharCode(...codes));
  return `${PACKED_GZIP_STORAGE_PREFIX}${bytes.length.toString(36)}:${chunks.join("")}`;
}

export function decodePackedGzipStorage(raw: string): Uint8Array {
  if (!raw.startsWith(PACKED_GZIP_STORAGE_PREFIX)) {
    throw new Error("invalid_packed_gzip_prefix");
  }
  const separator = raw.indexOf(":", PACKED_GZIP_STORAGE_PREFIX.length);
  const declared = raw.slice(PACKED_GZIP_STORAGE_PREFIX.length, separator);
  const length = Number.parseInt(declared, 36);
  const packed = raw.slice(separator + 1);
  if (
    separator < 0 ||
    !Number.isSafeInteger(length) || length <= 0 ||
    length.toString(36) !== declared ||
    Math.ceil(length * 8 / 15) !== packed.length
  ) throw new Error("invalid_packed_gzip_length");

  const bytes = new Uint8Array(length);
  let written = 0;
  let buffer = 0;
  let bits = 0;
  for (let index = 0; index < packed.length; index += 1) {
    const value = packed.charCodeAt(index) - OFFSET;
    if (value < 0 || value > MASK) throw new Error("invalid_packed_gzip_character");
    buffer = (buffer << 15) | value;
    bits += 15;
    while (bits >= 8 && written < length) {
      bits -= 8;
      bytes[written++] = (buffer >>> bits) & 0xff;
      buffer &= (1 << bits) - 1;
    }
  }
  if (written !== length || buffer !== 0) throw new Error("invalid_packed_gzip_padding");
  return bytes;
}
