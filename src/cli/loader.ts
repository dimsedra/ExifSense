import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import exifr from 'exifr';
import { detectFileType } from '../core/forensics/signature';
import { calculateFileHash, generateForensicId } from '../core/forensics/hashing';
import { categorizeExif } from '../core/forensics/metadata';
import { evaluateSingleAssetIntegrity } from '../core/forensics/integrity';
import type { ForensicAsset, SingleAssetInput } from '../core/forensics/types';

export class FileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileNotFoundError';
  }
}

export class InvalidJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidJsonError';
  }
}

export class UnsupportedFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFormatError';
  }
}

export class ScenarioNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScenarioNotFoundError';
  }
}

function resolveScenariosDirectory(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));

  const candidateFromBin = path.resolve(currentDir, '../tests/fixtures/scenarios');
  if (fs.existsSync(candidateFromBin)) {
    return candidateFromBin;
  }

  const candidateFromSrc = path.resolve(currentDir, '../../tests/fixtures/scenarios');
  if (fs.existsSync(candidateFromSrc)) {
    return candidateFromSrc;
  }

  const candidateFromCwd = path.resolve(process.cwd(), 'tests/fixtures/scenarios');
  if (fs.existsSync(candidateFromCwd)) {
    return candidateFromCwd;
  }

  return candidateFromBin;
}

function mapRawObjectToAsset(
  raw: Record<string, unknown>,
  fallbackFileName: string,
  contentBytes?: number,
  fallbackSha256?: string,
  fallbackSha1?: string
): ForensicAsset {
  const fileName = (typeof raw.fileName === 'string' && raw.fileName) ? raw.fileName : fallbackFileName;
  const fileSize = typeof raw.fileSize === 'number' ? raw.fileSize : (contentBytes ?? 0);
  const fileDate = typeof raw.fileDate === 'number' ? raw.fileDate : Date.now();
  const fileType = typeof raw.fileType === 'string' ? raw.fileType : 'image/jpeg';
  const exifData = (raw.exifData && typeof raw.exifData === 'object')
    ? (raw.exifData as Record<string, unknown>)
    : raw;

  const actualWidth = typeof raw.actualWidth === 'number' ? raw.actualWidth : null;
  const actualHeight = typeof raw.actualHeight === 'number' ? raw.actualHeight : null;
  const sha256 = typeof raw.sha256 === 'string' ? raw.sha256 : (fallbackSha256 ?? '0000000000000000000000000000000000000000000000000000000000000000');
  const sha1 = typeof raw.sha1 === 'string' ? raw.sha1 : (fallbackSha1 ?? '0000000000000000000000000000000000000000');
  const id = typeof raw.id === 'string' ? raw.id : generateForensicId();

  const categorizedExif = categorizeExif(exifData);
  const singleInput: SingleAssetInput = {
    fileName,
    fileSize,
    fileDate,
    exifData,
    actualWidth,
    actualHeight,
  };
  const integrityAlerts = evaluateSingleAssetIntegrity(singleInput);

  return {
    id,
    fileName,
    fileSize,
    fileType,
    fileDate,
    sha256,
    sha1,
    actualWidth,
    actualHeight,
    exifData,
    categorizedExif,
    integrityAlerts,
  };
}

function resolveFsPath(targetPath: string): string {
  if (targetPath.startsWith('~/') || targetPath === '~') {
    return path.join(os.homedir(), targetPath.slice(1));
  }
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }
  return path.resolve(process.cwd(), targetPath);
}

export async function loadAssetSource(resolvedPath: string): Promise<ForensicAsset> {
  const absPath = resolveFsPath(resolvedPath);

  try {
    await fs.promises.stat(absPath);
  } catch {
    throw new FileNotFoundError(`File not found: ${resolvedPath}`);
  }

  const ext = path.extname(absPath).toLowerCase();
  if (ext === '.json') {
    return loadJsonAsset(absPath, resolvedPath);
  }

  return loadImageAsset(absPath, resolvedPath);
}

async function loadJsonAsset(absPath: string, displayPath: string): Promise<ForensicAsset> {
  const contentBuffer = await fs.promises.readFile(absPath);
  const contentString = contentBuffer.toString('utf8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(contentString);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new InvalidJsonError(`Invalid JSON in ${displayPath}: ${message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new InvalidJsonError(`JSON in ${displayPath} must be an object representing an asset.`);
  }

  const arrayBuf = contentBuffer.buffer.slice(
    contentBuffer.byteOffset,
    contentBuffer.byteOffset + contentBuffer.byteLength
  );
  const [sha256, sha1] = await Promise.all([
    calculateFileHash(arrayBuf, 'SHA-256'),
    calculateFileHash(arrayBuf, 'SHA-1'),
  ]);

  return mapRawObjectToAsset(
    parsed as Record<string, unknown>,
    path.basename(absPath),
    contentBuffer.byteLength,
    sha256,
    sha1
  );
}

async function loadImageAsset(absPath: string, displayPath: string): Promise<ForensicAsset> {
  const fileBuffer = await fs.promises.readFile(absPath);
  const signature = detectFileType(new Uint8Array(fileBuffer.subarray(0, 16)));

  if (!signature.isValid) {
    throw new UnsupportedFormatError(`Unsupported image format for '${displayPath}'.`);
  }

  const arrayBuf = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  );
  const [sha256, sha1] = await Promise.all([
    calculateFileHash(arrayBuf, 'SHA-256'),
    calculateFileHash(arrayBuf, 'SHA-1'),
  ]);

  let rawExif: Record<string, unknown> = {};
  try {
    const parsed = await exifr.parse(fileBuffer, true);
    if (parsed && typeof parsed === 'object') {
      rawExif = parsed;
    }
  } catch {
    // Parse error leaves rawExif empty
  }

  const stat = await fs.promises.stat(absPath);
  const fileName = path.basename(absPath);
  const fileSize = stat.size;
  const fileDate = Math.floor(stat.mtimeMs);
  const fileType = signature.mimeType || 'image/jpeg';
  const id = generateForensicId();

  const widthVal = rawExif.ImageWidth ?? rawExif.PixelXDimension ?? rawExif.ExifImageWidth;
  const heightVal = rawExif.ImageHeight ?? rawExif.PixelYDimension ?? rawExif.ExifImageHeight;
  const actualWidth = typeof widthVal === 'number' ? widthVal : null;
  const actualHeight = typeof heightVal === 'number' ? heightVal : null;

  const categorizedExif = categorizeExif(rawExif);
  const singleInput: SingleAssetInput = {
    fileName,
    fileSize,
    fileDate,
    exifData: rawExif,
    actualWidth,
    actualHeight,
  };
  const integrityAlerts = evaluateSingleAssetIntegrity(singleInput);

  return {
    id,
    fileName,
    fileSize,
    fileType,
    fileDate,
    sha256,
    sha1,
    actualWidth,
    actualHeight,
    exifData: rawExif,
    categorizedExif,
    integrityAlerts,
  };
}

function collectAvailableScenarios(dir: string, baseDir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectAvailableScenarios(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push(relPath.replace(/\.json$/, ''));
    }
  }

  return results;
}

export async function resolveScenario(
  scenarioName: string
): Promise<ForensicAsset | ForensicAsset[]> {
  const scenariosDir = resolveScenariosDirectory();
  const cleanName = scenarioName.replace(/\.json$/, '');

  const candidatePaths = [
    path.join(scenariosDir, `${cleanName}.json`),
    path.join(scenariosDir, 'single', `${cleanName}.json`),
    path.join(scenariosDir, 'batch', `${cleanName}.json`),
    path.join(scenariosDir, cleanName),
  ];

  let resolvedFile: string | null = null;
  for (const cand of candidatePaths) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      resolvedFile = cand;
      break;
    }
  }

  if (!resolvedFile) {
    const available = collectAvailableScenarios(scenariosDir, scenariosDir);
    throw new ScenarioNotFoundError(
      `Scenario '${scenarioName}' not found. Available scenarios: ${available.join(', ')}`
    );
  }

  const contentBuffer = await fs.promises.readFile(resolvedFile);
  let parsed: unknown;
  try {
    parsed = JSON.parse(contentBuffer.toString('utf8'));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new InvalidJsonError(`Invalid JSON in scenario '${scenarioName}': ${message}`);
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item, index) => {
      const fallbackName = `${path.basename(resolvedFile!, '.json')}_${index + 1}.jpg`;
      return mapRawObjectToAsset(item as Record<string, unknown>, fallbackName);
    });
  }

  if (parsed && typeof parsed === 'object') {
    return mapRawObjectToAsset(
      parsed as Record<string, unknown>,
      path.basename(resolvedFile, '.json') + '.jpg'
    );
  }

  throw new InvalidJsonError(`Scenario '${scenarioName}' must contain an object or array of objects.`);
}

export async function extractBaseline(
  sourceImagePath: string,
  destinationJsonPath?: string
): Promise<Record<string, unknown>> {
  const absSource = resolveFsPath(sourceImagePath);

  try {
    await fs.promises.stat(absSource);
  } catch {
    throw new FileNotFoundError(`Source image not found: ${sourceImagePath}`);
  }

  const fileBuffer = await fs.promises.readFile(absSource);
  let rawExif: Record<string, unknown> = {};
  try {
    const parsed = await exifr.parse(fileBuffer, true);
    if (parsed && typeof parsed === 'object') {
      rawExif = parsed;
    }
  } catch {
    // empty metadata
  }

  if (destinationJsonPath) {
    const absDest = resolveFsPath(destinationJsonPath);
    await fs.promises.mkdir(path.dirname(absDest), { recursive: true });
    await fs.promises.writeFile(absDest, JSON.stringify(rawExif, null, 2), 'utf8');
  }

  return rawExif;
}
