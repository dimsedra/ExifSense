import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseCliArgs, CliArgumentError } from '../../src/cli/args';
import {
  loadAssetSource,
  resolveScenario,
  extractBaseline,
  FileNotFoundError,
  InvalidJsonError,
  UnsupportedFormatError,
  ScenarioNotFoundError,
} from '../../src/cli/loader';
import { runCli } from '../../src/cli/runner';
import { createFixtureJpegWithExif } from '../fixtures/sample_jpeg';

describe('CLI Analysis and Simulation Harness', () => {
  let tempDir: string;
  let sampleJpegPath: string;
  let corruptJsonPath: string;
  let nonImageBinPath: string;

  beforeAll(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'exifsense-cli-test-'));

    // Create a real JPEG with EXIF tags for testing
    const jpegBytes = createFixtureJpegWithExif({
      make: 'Google',
      model: 'Pixel 6',
      software: 'Camera App 1.0',
      dateTimeOriginal: '2023:05:10 14:30:00',
      latitude: [55, 51],
      longitude: [4, 25],
    });
    sampleJpegPath = path.join(tempDir, 'sample.jpg');
    await fs.promises.writeFile(sampleJpegPath, Buffer.from(jpegBytes));

    // Create corrupt JSON
    corruptJsonPath = path.join(tempDir, 'corrupt.json');
    await fs.promises.writeFile(corruptJsonPath, '{ invalid json content', 'utf8');

    // Create non-image binary file
    nonImageBinPath = path.join(tempDir, 'plain.bin');
    await fs.promises.writeFile(nonImageBinPath, Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]));
  });

  afterAll(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  // ==========================================
  // BP-CLI-001: CLI Argument Parsing
  // ==========================================
  describe('BP-CLI-001: parseCliArgs', () => {
    it('Given empty arguments, When parsed, Then returns help command', () => {
      const result = parseCliArgs([]);
      expect(result.command).toBe('help');
    });

    it('Given --help flag, When parsed, Then returns help command', () => {
      const result = parseCliArgs(['--help']);
      expect(result.command).toBe('help');
    });

    it('Given --version flag, When parsed, Then returns version command', () => {
      const result = parseCliArgs(['--version']);
      expect(result.command).toBe('version');
    });

    it('Given single command with path, When parsed, Then returns single command with default options', () => {
      const result = parseCliArgs(['single', 'test.jpg']);
      expect(result.command).toBe('single');
      if (result.command === 'single') {
        expect(result.targetPath).toBe('test.jpg');
        expect(result.options.locale).toBe('en');
        expect(result.options.format).toBe('plain');
        expect(result.options.out).toBeUndefined();
      }
    });

    it('Given single command with custom flags, When parsed, Then populates options correctly', () => {
      const result = parseCliArgs([
        'single',
        'test.jpg',
        '--locale',
        'id',
        '--format',
        'markdown',
        '--out',
        'report.md',
      ]);
      expect(result.command).toBe('single');
      if (result.command === 'single') {
        expect(result.targetPath).toBe('test.jpg');
        expect(result.options.locale).toBe('id');
        expect(result.options.format).toBe('markdown');
        expect(result.options.out).toBe('report.md');
      }
    });

    it('Given batch command with multiple files, When parsed, Then returns all target paths', () => {
      const result = parseCliArgs(['batch', 'file1.jpg', 'file2.jpg', 'file3.json']);
      expect(result.command).toBe('batch');
      if (result.command === 'batch') {
        expect(result.targetPaths).toEqual(['file1.jpg', 'file2.jpg', 'file3.json']);
      }
    });

    it('Given scenario command with preset name, When parsed, Then returns scenario name', () => {
      const result = parseCliArgs(['scenario', 'missing-gps']);
      expect(result.command).toBe('scenario');
      if (result.command === 'scenario') {
        expect(result.scenarioName).toBe('missing-gps');
      }
    });

    it('Given extract command with output path, When parsed, Then returns source and output paths', () => {
      const result = parseCliArgs(['extract', 'source.jpg', 'out.json']);
      expect(result.command).toBe('extract');
      if (result.command === 'extract') {
        expect(result.sourcePath).toBe('source.jpg');
        expect(result.outputPath).toBe('out.json');
      }
    });

    it('Given unknown command, When parsed, Then throws CliArgumentError', () => {
      expect(() => parseCliArgs(['destroy', 'file.jpg'])).toThrow(CliArgumentError);
    });

    it('Given single command without target path, When parsed, Then throws CliArgumentError', () => {
      expect(() => parseCliArgs(['single'])).toThrow(CliArgumentError);
    });

    it('Given batch command without target paths, When parsed, Then throws CliArgumentError', () => {
      expect(() => parseCliArgs(['batch'])).toThrow(CliArgumentError);
    });

    it('Given scenario command without scenario name, When parsed, Then throws CliArgumentError', () => {
      expect(() => parseCliArgs(['scenario'])).toThrow(CliArgumentError);
    });

    it('Given extract command without source image, When parsed, Then throws CliArgumentError', () => {
      expect(() => parseCliArgs(['extract'])).toThrow(CliArgumentError);
    });

    it('Given unsupported locale flag, When parsed, Then throws CliArgumentError', () => {
      expect(() => parseCliArgs(['single', 'test.jpg', '--locale', 'fr'])).toThrow(CliArgumentError);
    });

    it('Given unsupported format flag, When parsed, Then throws CliArgumentError', () => {
      expect(() => parseCliArgs(['single', 'test.jpg', '--format', 'pdf'])).toThrow(CliArgumentError);
    });
  });

  // ==========================================
  // BP-CLI-002: Universal Asset Loader
  // ==========================================
  describe('BP-CLI-002: loadAssetSource', () => {
    it('Given a valid binary image file, When loaded, Then extracts EXIF and computes hashes', async () => {
      const asset = await loadAssetSource(sampleJpegPath);
      expect(asset.fileName).toBe('sample.jpg');
      expect(asset.fileSize).toBeGreaterThan(0);
      expect(asset.sha256).toMatch(/^[0-9A-F]{64}$/);
      expect(asset.sha1).toMatch(/^[0-9A-F]{40}$/);
      expect(asset.exifData).toBeDefined();
      expect(asset.categorizedExif['Device Hardware']).toBeDefined();
    });

    it('Given a valid JSON scenario file, When loaded, Then parses asset structure and evaluates integrity', async () => {
      const asset = await loadAssetSource('tests/fixtures/scenarios/baseline.json');
      expect(asset.fileName).toBe('000.jpg');
      expect(asset.fileSize).toBeGreaterThan(0);
      expect(asset.exifData.Make).toBe('LGE');
      expect(asset.exifData.Model).toBe('Nexus 5X');
      expect(asset.integrityAlerts).toBeDefined();
    });

    it('Given a non-existent file path, When loaded, Then throws FileNotFoundError', async () => {
      await expect(loadAssetSource('/non/existent/file.jpg')).rejects.toThrow(FileNotFoundError);
    });

    it('Given a corrupt JSON file, When loaded, Then throws InvalidJsonError', async () => {
      await expect(loadAssetSource(corruptJsonPath)).rejects.toThrow(InvalidJsonError);
    });

    it('Given a non-image binary file, When loaded, Then throws UnsupportedFormatError', async () => {
      await expect(loadAssetSource(nonImageBinPath)).rejects.toThrow(UnsupportedFormatError);
    });
  });

  // ==========================================
  // BP-CLI-003: Preset Scenario Resolver
  // ==========================================
  describe('BP-CLI-003: resolveScenario', () => {
    it('Given a single-asset scenario name (missing-gps), When resolved, Then returns single ForensicAsset', async () => {
      const result = await resolveScenario('missing-gps');
      expect(Array.isArray(result)).toBe(false);
      const asset = result as import('../../src/core/forensics/types').ForensicAsset;
      expect(asset.fileName).toBe('000.jpg');
      expect(asset.exifData.latitude).toBeUndefined();
    });

    it('Given a single-asset scenario with tampered software, When resolved, Then includes software integrity alert', async () => {
      const result = await resolveScenario('tampered-software');
      expect(Array.isArray(result)).toBe(false);
      const asset = result as import('../../src/core/forensics/types').ForensicAsset;
      expect(asset.exifData.Software).toBe('Adobe Photoshop 2024');
      const hasSoftwareAlert = asset.integrityAlerts.some((a) => a.type === 'editing_software');
      expect(hasSoftwareAlert).toBe(true);
    });

    it('Given a batch scenario name (travel-sequence), When resolved, Then returns array of ForensicAssets', async () => {
      const result = await resolveScenario('travel-sequence');
      expect(Array.isArray(result)).toBe(true);
      const assets = result as import('../../src/core/forensics/types').ForensicAsset[];
      expect(assets.length).toBe(5);
      expect(assets[0].fileName).toBe('000.jpg');
      expect(assets[4].fileName).toBe('004.jpg');
    });

    it('Given a batch scenario name with time jump anomaly, When resolved, Then returns assets with timeline difference', async () => {
      const result = await resolveScenario('time-jump-anomaly');
      expect(Array.isArray(result)).toBe(true);
      const assets = result as import('../../src/core/forensics/types').ForensicAsset[];
      expect(assets.length).toBe(5);
    });

    it('Given a non-existent scenario name, When resolved, Then throws ScenarioNotFoundError listing available scenarios', async () => {
      await expect(resolveScenario('unknown-future-scenario')).rejects.toThrow(
        ScenarioNotFoundError
      );
    });
  });

  // ==========================================
  // BP-CLI-004: Execution Runner
  // ==========================================
  describe('BP-CLI-004: runCli', () => {
    it('Given help flag, When executed, Then returns success with help text', async () => {
      const result = await runCli(['--help']);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.outputText).toContain('Usage:');
    });

    it('Given version flag, When executed, Then returns success with version text', async () => {
      const result = await runCli(['--version']);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.outputText).toContain('ExifSense CLI v');
    });

    it('Given single command on a valid JPEG, When executed, Then outputs forensic sections', async () => {
      const result = await runCli(['single', sampleJpegPath]);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.outputText).toContain('=== ExifSense Forensic Analysis ===');
      expect(result.outputText).toContain('SHA-256');
      expect(result.outputText).toContain('--- Forensic Narrative ---');
    });

    it('Given batch command on scenario files, When executed, Then outputs collective analysis and chronological story', async () => {
      const result = await runCli([
        'batch',
        'tests/fixtures/scenarios/baseline.json',
        'tests/fixtures/scenarios/single/tampered-software.json',
      ]);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.outputText).toContain('=== ExifSense Collective Intelligence Analysis ===');
      expect(result.outputText).toContain('Total Assets: 2');
      expect(result.outputText).toContain('--- Combined Analysis ---');
      expect(result.outputText).toContain('--- Chronological Story ---');
    });

    it('Given scenario command on travel-sequence, When executed, Then outputs movement details and story steps', async () => {
      const result = await runCli(['scenario', 'travel-sequence']);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.outputText).toContain('Total Assets: 5');
      expect(result.outputText).toContain('--- Combined Analysis ---');
      expect(result.outputText).toContain('Total Path Distance');
      expect(result.outputText).toContain('[Step 1]');
      expect(result.outputText).toContain('[Step 5]');
    });

    it('Given scenario command with --out flag, When executed, Then writes output to destination file', async () => {
      const outFilePath = path.join(tempDir, 'output.txt');
      const result = await runCli(['scenario', 'missing-gps', '--out', outFilePath]);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(outFilePath)).toBe(true);
      const fileContent = await fs.promises.readFile(outFilePath, 'utf8');
      expect(fileContent).toContain('=== ExifSense Forensic Analysis ===');
    });

    it('Given single command with --format markdown, When executed, Then formats with markdown headers', async () => {
      const result = await runCli(['single', sampleJpegPath, '--format', 'markdown']);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.outputText).toContain('# ExifSense Forensic Analysis');
    });

    it('Given invalid arguments, When executed, Then returns exitCode 1 and errorText', async () => {
      const result = await runCli(['non-existent-command']);
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.errorText).toBeDefined();
    });

    it('Given missing file to single command, When executed, Then returns exitCode 1 and errorText', async () => {
      const result = await runCli(['single', '/non/existent/missing.jpg']);
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.errorText).toContain('File not found');
    });
  });

  // ==========================================
  // BP-CLI-005: Baseline Extraction
  // ==========================================
  describe('BP-CLI-005: extractBaseline', () => {
    it('Given an image with EXIF, When baseline extracted, Then returns complete metadata object', async () => {
      const metadata = await extractBaseline(sampleJpegPath);
      expect(metadata).toBeDefined();
      expect(metadata.Make).toBe('Google');
      expect(metadata.Model).toBe('Pixel 6');
    });

    it('Given destination file path, When extracted, Then writes formatted JSON to disk', async () => {
      const destPath = path.join(tempDir, 'extracted.json');
      const metadata = await extractBaseline(sampleJpegPath, destPath);
      expect(fs.existsSync(destPath)).toBe(true);
      const diskContent = JSON.parse(await fs.promises.readFile(destPath, 'utf8'));
      expect(diskContent.Make).toBe('Google');
      expect(diskContent.Model).toBe('Pixel 6');
      expect(diskContent).toEqual(JSON.parse(JSON.stringify(metadata)));
    });

    it('Given non-existent image path, When extracted, Then throws FileNotFoundError', async () => {
      await expect(extractBaseline('/non/existent/source.jpg')).rejects.toThrow(
        FileNotFoundError
      );
    });
  });
});
