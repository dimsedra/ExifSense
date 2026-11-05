import fs from 'node:fs';
import path from 'node:path';
import { calculateFileHash } from '../core/forensics/hashing';
import { FileNotFoundError } from './loader';

export interface FileHashResult {
  fileName: string;
  filePath: string;
  fileSize: number;
  sha256: string;
  sha1: string;
}

/**
 * Resolves an array of file and directory paths, reads binary buffers,
 * and computes SHA-256 and SHA-1 cryptographic hashes for each file.
 * Directory scanning is non-recursive to keep execution predictable and fast.
 */
export async function computeFileHashes(targetPaths: string[]): Promise<FileHashResult[]> {
  const resolvedFilePaths = await resolveTargetFiles(targetPaths);
  const results: FileHashResult[] = [];

  for (const filePath of resolvedFilePaths) {
    const buffer = await fs.promises.readFile(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    const [sha256, sha1] = await Promise.all([
      calculateFileHash(arrayBuffer, 'SHA-256'),
      calculateFileHash(arrayBuffer, 'SHA-1'),
    ]);

    results.push({
      fileName: path.basename(filePath),
      filePath,
      fileSize: buffer.byteLength,
      sha256,
      sha1,
    });
  }

  return results;
}

/**
 * Resolves paths into unique absolute file paths.
 * Expands directories into their direct child files without recursing into subdirectories.
 */
async function resolveTargetFiles(targetPaths: string[]): Promise<string[]> {
  const fileSet = new Set<string>();

  for (const rawPath of targetPaths) {
    const absolutePath = path.resolve(process.cwd(), rawPath);

    let stats: fs.Stats;
    try {
      stats = await fs.promises.stat(absolutePath);
    } catch {
      throw new FileNotFoundError(`Target path does not exist on disk: '${rawPath}'`);
    }

    if (!stats.isDirectory()) {
      fileSet.add(absolutePath);
      continue;
    }

    const entries = await fs.promises.readdir(absolutePath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        fileSet.add(path.join(absolutePath, entry.name));
      }
    }
  }

  return Array.from(fileSet).sort((a, b) => a.localeCompare(b));
}
