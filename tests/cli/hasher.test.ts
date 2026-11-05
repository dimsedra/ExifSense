import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { computeFileHashes, type FileHashResult } from '../../src/cli/hasher';
import { FileNotFoundError } from '../../src/cli/loader';

describe('BP-HASH-002: computeFileHashes', () => {
  let tempDir: string;
  let file1Path: string;
  let file2Path: string;
  let subDirPath: string;
  let subFile1Path: string;
  let subFile2Path: string;

  beforeAll(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'exifsense-hasher-test-'));

    // File 1: "Hello World"
    file1Path = path.join(tempDir, 'file1.txt');
    await fs.promises.writeFile(file1Path, 'Hello World', 'utf8');

    // File 2: "Forensic Evidence"
    file2Path = path.join(tempDir, 'file2.bin');
    await fs.promises.writeFile(file2Path, Buffer.from([0x01, 0x02, 0x03, 0x04]));

    // Subdirectory with files
    subDirPath = path.join(tempDir, 'evidence-folder');
    await fs.promises.mkdir(subDirPath);

    subFile1Path = path.join(subDirPath, 'alpha.jpg');
    await fs.promises.writeFile(subFile1Path, 'alpha-image-content', 'utf8');

    subFile2Path = path.join(subDirPath, 'beta.png');
    await fs.promises.writeFile(subFile2Path, 'beta-image-content', 'utf8');

    // Nested directory inside subDirPath to verify non-recursive behavior
    const nestedDir = path.join(subDirPath, 'nested');
    await fs.promises.mkdir(nestedDir);
    await fs.promises.writeFile(path.join(nestedDir, 'nested.jpg'), 'nested-content', 'utf8');
  });

  afterAll(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('Given a single valid file, When computed, Then returns correct FileHashResult', async () => {
    const results = await computeFileHashes([file1Path]);

    expect(results).toHaveLength(1);
    const item = results[0];
    expect(item.fileName).toBe('file1.txt');
    expect(item.filePath).toBe(path.resolve(file1Path));
    expect(item.fileSize).toBe(11); // "Hello World" is 11 bytes
    // Known SHA-256 for "Hello World" in hex uppercase
    // echo -n "Hello World" | sha256sum -> a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e
    expect(item.sha256).toBe('A591A6D40BF420404A011733CFB7B190D62C65BF0BCDA32B57B277D9AD9F146E');
    // Known SHA-1 for "Hello World" in hex uppercase
    // echo -n "Hello World" | sha1sum -> 0a4d55a8d778e5022fab701977c5d840bbc486d0
    expect(item.sha1).toBe('0A4D55A8D778E5022FAB701977C5D840BBC486D0');
  });

  it('Given multiple files, When computed, Then returns FileHashResult for each file in order', async () => {
    const results = await computeFileHashes([file1Path, file2Path]);

    expect(results).toHaveLength(2);
    expect(results[0].fileName).toBe('file1.txt');
    expect(results[1].fileName).toBe('file2.bin');
    expect(results[1].fileSize).toBe(4);
    expect(results[1].sha256).toBeDefined();
    expect(results[1].sha1).toBeDefined();
  });

  it('Given a directory path, When computed, Then resolves all files in that directory without deep recursive crawling', async () => {
    const results = await computeFileHashes([subDirPath]);

    // Should include alpha.jpg and beta.png, but NOT nested.jpg (non-recursive)
    expect(results).toHaveLength(2);
    const fileNames = results.map((r) => r.fileName).sort();
    expect(fileNames).toEqual(['alpha.jpg', 'beta.png']);
  });

  it('Given duplicate file paths, When computed, Then deduplicates and returns unique results', async () => {
    const results = await computeFileHashes([file1Path, file1Path]);

    expect(results).toHaveLength(1);
    expect(results[0].fileName).toBe('file1.txt');
  });

  it('Given a non-existent file path, When computed, Then throws FileNotFoundError', async () => {
    const nonExistent = path.join(tempDir, 'does-not-exist.jpg');
    await expect(computeFileHashes([nonExistent])).rejects.toThrow(FileNotFoundError);
  });
});
