import { describe, it, expect } from 'vitest';
import { formatHashOutput } from '../../src/cli/formatter';
import type { FileHashResult } from '../../src/cli/hasher';

describe('BP-HASH-003: formatHashOutput', () => {
  const sampleResults: FileHashResult[] = [
    {
      fileName: 'photo_alpha.jpg',
      filePath: '/evidence/photo_alpha.jpg',
      fileSize: 1048576,
      sha256: 'A591A6D40BF420404A011733CFB7B190D62C65BF0BCDA32B57B277D9AD9F146E',
      sha1: '0A4D55A8D778E5022FAB701977C5D840BBC486D0',
    },
    {
      fileName: 'doc_beta.png',
      filePath: '/evidence/doc_beta.png',
      fileSize: 2048,
      sha256: 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855',
      sha1: 'DA39A3EE5E6B4B0D3255BFEF95601890AFD80709',
    },
  ];

  it('Given plain format, When formatted, Then returns aligned ASCII table with header metrics and hashes', () => {
    const output = formatHashOutput(sampleResults, { format: 'plain', locale: 'en' });

    expect(output).toContain('=== ExifSense Cryptographic Hash Manifest ===');
    expect(output).toContain('Total Files: 2');
    expect(output).toContain('File Name');
    expect(output).toContain('Size (bytes)');
    expect(output).toContain('SHA-256');
    expect(output).toContain('SHA-1');

    expect(output).toContain('photo_alpha.jpg');
    expect(output).toContain('1048576');
    expect(output).toContain('A591A6D40BF420404A011733CFB7B190D62C65BF0BCDA32B57B277D9AD9F146E');
    expect(output).toContain('0A4D55A8D778E5022FAB701977C5D840BBC486D0');

    expect(output).toContain('doc_beta.png');
    expect(output).toContain('2048');
  });

  it('Given markdown format, When formatted, Then returns Markdown table with backtick wrapped hashes', () => {
    const output = formatHashOutput(sampleResults, { format: 'markdown', locale: 'en' });

    expect(output).toContain('# ExifSense Cryptographic Hash Manifest');
    expect(output).toContain('- **Total Files**: 2');
    expect(output).toContain('| File Name | Size (bytes) | SHA-256 | SHA-1 |');
    expect(output).toContain('| --- | --- | --- | --- |');
    expect(output).toContain('| photo_alpha.jpg | 1048576 | `A591A6D40BF420404A011733CFB7B190D62C65BF0BCDA32B57B277D9AD9F146E` | `0A4D55A8D778E5022FAB701977C5D840BBC486D0` |');
    expect(output).toContain('| doc_beta.png | 2048 | `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855` | `DA39A3EE5E6B4B0D3255BFEF95601890AFD80709` |');
  });

  it('Given empty array in plain format, When formatted, Then returns graceful empty manifest header', () => {
    const output = formatHashOutput([], { format: 'plain', locale: 'en' });

    expect(output).toContain('=== ExifSense Cryptographic Hash Manifest ===');
    expect(output).toContain('Total Files: 0');
    expect(output).toContain('No files found.');
  });

  it('Given empty array in markdown format, When formatted, Then returns graceful empty manifest markdown', () => {
    const output = formatHashOutput([], { format: 'markdown', locale: 'en' });

    expect(output).toContain('# ExifSense Cryptographic Hash Manifest');
    expect(output).toContain('- **Total Files**: 0');
    expect(output).toContain('No files found.');
  });
});
