/**
 * Trace Magic–compatible SQL ID (`getMD5Hash`).
 * MD5 of ASCII(sql + NUL), then 13 chars from alphabet over bytes 8–15.
 */

const ALPHABET = "0123456789abcdfghjkmnpqrstuvwxyz";

/** Compact MD5 (RFC 1321) for short SQL strings in Options / unit tests. */
export function md5Bytes(message: Uint8Array): Uint8Array {
  const originalLen = message.length;
  const bitLen = BigInt(originalLen) * 8n;
  const withOne = originalLen + 1;
  const padLen = (withOne % 64 <= 56 ? 56 : 120) - (withOne % 64);
  const total = withOne + padLen + 8;
  const bytes = new Uint8Array(total);
  bytes.set(message);
  bytes[originalLen] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(total - 8, Number(bitLen & 0xffffffffn), true);
  view.setUint32(total - 4, Number(bitLen >> 32n), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) K[i] = Math.floor(2 ** 32 * Math.abs(Math.sin(i + 1))) >>> 0;
  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];

  const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));

  for (let offset = 0; offset < total; offset += 64) {
    const M = new Uint32Array(16);
    for (let i = 0; i < 16; i++) M[i] = view.getUint32(offset + i * 4, true);
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl(F, S[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return out;
}

/** Match Trace Magic `getMD5Hash` for ASCII SQL text. */
export function traceMagicSqlId(sql: string): string {
  const ascii = new Uint8Array(sql.length + 1);
  for (let i = 0; i < sql.length; i++) {
    const code = sql.charCodeAt(i);
    ascii[i] = code < 128 ? code : 0x3f; // '?' for non-ASCII (desktop used Encoding.ASCII)
  }
  ascii[sql.length] = 0;
  const hash = md5Bytes(ascii);
  const num = BigInt(hash[8]) | (BigInt(hash[9]) << 8n) | (BigInt(hash[10]) << 16n) | (BigInt(hash[11]) << 24n);
  const num2 = BigInt(hash[12]) | (BigInt(hash[13]) << 8n) | (BigInt(hash[14]) << 16n) | (BigInt(hash[15]) << 24n);
  const num3 = (num << 32n) + num2;
  let text = "";
  for (let i = 0; i <= 12; i++) {
    const idx = Number((num3 >> BigInt(i * 5)) % 32n);
    text = ALPHABET[idx] + text;
  }
  return text;
}
