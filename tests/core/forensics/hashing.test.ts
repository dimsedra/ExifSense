import { describe, it, expect } from 'vitest';
import { calculateFileHash, generateForensicId } from '../../../src/core/forensics/hashing.ts';

describe('Cryptographic Hashing (REQ-HASH-001)', () => {
  it('computes NIST-compliant SHA-256 uppercase hash for "abc"', async () => {
    const encoder = new TextEncoder();
    const buffer = encoder.encode('abc').buffer;
    const hash = await calculateFileHash(buffer, 'SHA-256');
    expect(hash).toBe('BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD');
  });

  it('computes NIST-compliant SHA-1 uppercase hash for "abc"', async () => {
    const encoder = new TextEncoder();
    const buffer = encoder.encode('abc').buffer;
    const hash = await calculateFileHash(buffer, 'SHA-1');
    expect(hash).toBe('A9993E364706816ABA3E25717850C26C9CD0D89D');
  });

  it('computes correct hashes for empty buffers', async () => {
    const emptyBuffer = new ArrayBuffer(0);
    const sha256 = await calculateFileHash(emptyBuffer, 'SHA-256');
    expect(sha256).toBe('E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855');

    const sha1 = await calculateFileHash(emptyBuffer, 'SHA-1');
    expect(sha1).toBe('DA39A3EE5E6B4B0D3255BFEF95601890AFD80709');
  });

  describe('Forensic Session Identifier (REQ-HASH-002)', () => {
    it('generates ID matching regex pattern ES-[TIMESTAMP_BASE36]-[RANDOM_3]', () => {
      const id = generateForensicId();
      expect(id).toMatch(/^ES-[0-9A-Z]+-[0-9A-Z]{3}$/);
    });

    it('anchors timestamp component deterministically when provided', () => {
      const fixedTimestamp = 1700000000000;
      const expectedBase36 = fixedTimestamp.toString(36).toUpperCase();
      const id = generateForensicId(fixedTimestamp);
      expect(id.startsWith(`ES-${expectedBase36}-`)).toBe(true);
      expect(id.length).toBe(`ES-${expectedBase36}-`.length + 3);
    });

    it('generates unique IDs across sequential invocations', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateForensicId()));
      expect(ids.size).toBe(100);
    });
  });
});
