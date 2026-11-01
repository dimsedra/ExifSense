import fs from 'node:fs';
import path from 'node:path';
import { parseCliArgs, type CliParsedCommand } from './args';
import { loadAssetSource, resolveScenario, extractBaseline } from './loader';
import { formatSingleOutput, formatBatchOutput } from './formatter';
import { evaluateCollectiveIntelligence } from '../core/forensics/collective';
import { generateChronologicalBatchStory } from '../core/narratives/chronological';
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
  exifsense scenario <name> [options]       Run a preset simulation scenario
  exifsense extract <image-path> [out-json] Extract raw EXIF metadata into JSON
  exifsense --help                          Show this help message
  exifsense --version                       Show version

Options:
  --locale <en|id|ar>       Narrative language (default: en)
  --format <plain|markdown> Output formatting (default: plain)
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
    const outputText = formatSingleOutput(asset, command.options);
    await deliverOutput(outputText, command.options.out);
    return { success: true, exitCode: 0, outputText };
  }

  if (command.command === 'batch') {
    const assets = await Promise.all(
      command.targetPaths.map((p) => loadAssetSource(p))
    );
    const outputText = processBatchAssets(assets, command.options);
    await deliverOutput(outputText, command.options.out);
    return { success: true, exitCode: 0, outputText };
  }

  if (command.command === 'scenario') {
    const result = await resolveScenario(command.scenarioName);
    let outputText = '';
    if (Array.isArray(result)) {
      outputText = processBatchAssets(result, command.options);
    } else {
      outputText = formatSingleOutput(result, command.options);
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

function processBatchAssets(
  assets: ForensicAsset[],
  options: { locale: 'en' | 'id' | 'ar'; format: 'plain' | 'markdown'; out?: string }
): string {
  const collective = evaluateCollectiveIntelligence(assets);
  const story = generateChronologicalBatchStory(assets, {
    locale: options.locale,
    format: options.format === 'markdown' ? 'markdown' : 'plain',
  });
  return formatBatchOutput(assets, collective, story, options);
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
