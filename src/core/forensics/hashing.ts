/**
 * Calculates a cryptographic hash of an ArrayBuffer using the Web Crypto API.
 * @param buffer ArrayBuffer of the binary data.
 * @param algorithm 'SHA-256' or 'SHA-1'.
 * @returns Hex uppercase representation of the digest.
 */
export async function calculateFileHash(
  buffer: ArrayBuffer,
  algorithm: 'SHA-256' | 'SHA-1' = 'SHA-256'
): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
