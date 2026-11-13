import fs from 'node:fs';
import path from 'node:path';
import { parseCliArgs, type CliOptions, type CliParsedCommand } from './args';
import { loadAssetSource, resolveScenario, extractBaseline } from './loader';
import { computeFileHashes } from './hasher';
import { formatSingleOutput, formatBatchOutput, formatHashOutput } from './formatter';
import { evaluateCollectiveIntelligence } from '../core/forensics/collective';
import { generateChronologicalBatchStory } from '../core/narratives/chronological';
import { parseExifDate, extractGpsCoordinates } from '../core/forensics/metadata';
import {
  fetchOsrmRouteDetails,
  resolveLocationWithPacing,
  type OsrmRouteDetails,
} from '../services/mapHelpers';
import type { ForensicAsset } from '../core/forensics/types';

export interface CliExecutionResult {
  success: boolean;
  exitCode: number;
  outputText?: string;
  errorText?: string;
}

const HELP_TEXT = `ExifSense CLI - Terminal-native photo metadata forensics & narrative harness

Usage:
  exifsense single <path> [options]         Analyze a single image or JSON asset
  exifsense batch <path...> [options]       Analyze multiple images or JSON assets
  exifsense hash <path...> [options]        Inspect SHA-256 and SHA-1 file hashes
  exifsense scenario <name> [options]       Run a preset simulation scenario
  exifsense extract <image-path> [out-json] Extract raw EXIF metadata into JSON
  exifsense --help                          Show this help message
  exifsense --version                       Show version

Options:
  --locale <en|id>          Narrative language (default: en)
  --format <plain|markdown> Output formatting (default: plain)
  --detailed                Include full per-asset details in batch output
  --out <path>              Write output text to file instead of stdout`;

const VERSION_TEXT = 'ExifSense CLI v1.0.0';

export async function runCli(argv: string[]): Promise<CliExecutionResult> {
  try {
    const parsed = parseCliArgs(argv);
    return await executeCommand(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    return {
      success: false,
      exitCode: 1,
      errorText: message,
    };
  }
}

async function enrichSingleAssetLocation(asset: ForensicAsset): Promise<ForensicAsset> {
  if (asset.locationName || typeof asset.locationData?.display_name === 'string') {
    return asset;
  }

  const coords = extractGpsCoordinates(asset.exifData);
  if (!coords) {
    return asset;
  }

  const locData = await resolveLocationWithPacing(coords.lat, coords.lng);
  if (!locData?.display_name) {
    return asset;
  }

  return {
    ...asset,
    locationData: locData,
    locationName: locData.display_name,
  };
}

async function executeCommand(command: CliParsedCommand): Promise<CliExecutionResult> {
  if (command.command === 'help') {
    process.stdout.write(`${HELP_TEXT}\n`);
    return { success: true, exitCode: 0, outputText: HELP_TEXT };
  }

  if (command.command === 'version') {
    process.stdout.write(`${VERSION_TEXT}\n`);
    return { success: true, exitCode: 0, outputText: VERSION_TEXT };
  }

  if (command.command === 'single') {
    const asset = await loadAssetSource(command.targetPath);
    const enriched = await enrichSingleAssetLocation(asset);
    const outputText = formatSingleOutput(enriched, command.options);
    await deliverOutput(outputText, command.options.out);
    return { success: true, exitCode: 0, outputText };
  }

  if (command.command === 'batch') {
    const assets = await Promise.all(
      command.targetPaths.map((p) => loadAssetSource(p))
    );
    const outputText = await processBatchAssets(assets, command.options);
    await deliverOutput(outputText, command.options.out);
    return { success: true, exitCode: 0, outputText };
  }

  if (command.command === 'hash') {
    const results = await computeFileHashes(command.targetPaths);
    const outputText = formatHashOutput(results, command.options);
    await deliverOutput(outputText, command.options.out);
    return { success: true, exitCode: 0, outputText };
  }

  if (command.command === 'scenario') {
    const result = await resolveScenario(command.scenarioName);
    let outputText = '';
    if (Array.isArray(result)) {
      outputText = await processBatchAssets(result, command.options);
    } else {
      const enriched = await enrichSingleAssetLocation(result);
      outputText = formatSingleOutput(enriched, command.options);
    }
    await deliverOutput(outputText, command.options.out);
    return { success: true, exitCode: 0, outputText };
  }

  if (command.command === 'extract') {
    const metadata = await extractBaseline(command.sourcePath, command.outputPath);
    const jsonString = JSON.stringify(metadata, null, 2);
    let outputText = jsonString;

    if (command.outputPath) {
      outputText = `Baseline extracted to ${command.outputPath}`;
      process.stdout.write(`${outputText}\n`);
    } else {
      process.stdout.write(`${jsonString}\n`);
    }

    return { success: true, exitCode: 0, outputText };
  }

  return { success: false, exitCode: 1, errorText: 'Unhandled command' };
}

async function resolveBatchRoadRoute(assets: ForensicAsset[]): Promise<OsrmRouteDetails | null> {
  if (assets.length < 2) {
    return null;
  }

  const geoPoints: Array<{ time: number; lat: number; lng: number }> = [];
  for (const asset of assets) {
    const coords = extractGpsCoordinates(asset.exifData);
    if (!coords) continue;

    const rawDate =
      asset.exifData?.DateTimeOriginal ||
      asset.exifData?.CreateDate ||
      asset.exifData?.DateTime;
    const parsedDate = parseExifDate(rawDate);
    geoPoints.push({
      time: parsedDate ? parsedDate.getTime() : asset.fileDate || 0,
      lat: coords.lat,
      lng: coords.lng,
    });
  }

  if (geoPoints.length < 2) {
    return null;
  }

  geoPoints.sort((a, b) => a.time - b.time);

  try {
    const waypoints = geoPoints.map((point) => ({ lat: point.lat, lng: point.lng }));
    const fetchPromise = fetchOsrmRouteDetails(waypoints);
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 3000)
    );
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch {
    return null;
  }
}

async function processBatchAssets(
  assets: ForensicAsset[],
  options: CliOptions
): Promise<string> {
  const enrichedAssets: ForensicAsset[] = [];
  for (const asset of assets) {
    enrichedAssets.push(await enrichSingleAssetLocation(asset));
  }

  const roadRouteDetails = await resolveBatchRoadRoute(enrichedAssets);
  const collective = evaluateCollectiveIntelligence(enrichedAssets);
  const story = generateChronologicalBatchStory(enrichedAssets, {
    locale: options.locale,
    format: options.format === 'markdown' ? 'markdown' : 'plain',
    totalRoadDistance: roadRouteDetails?.totalDistanceMeters,
    roadDistances: roadRouteDetails?.legDistancesMeters,
  });
  return formatBatchOutput(enrichedAssets, collective, story, options, roadRouteDetails);
}

async function deliverOutput(text: string, outPath?: string): Promise<void> {
  if (outPath) {
    const absOut = path.isAbsolute(outPath) ? outPath : path.resolve(process.cwd(), outPath);
    await fs.promises.mkdir(path.dirname(absOut), { recursive: true });
    await fs.promises.writeFile(absOut, text, 'utf8');
    process.stdout.write(`Output written to ${outPath}\n`);
    return;
  }

  process.stdout.write(`${text}\n`);
}
