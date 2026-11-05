---
title: "Blueprint: CLI File Hash Inspection"
type: blueprint
parent_intent: docs/intent/20261105_cli_file_hash_inspection.md
status: Approved
last_updated: 2026-11-05
---

# Blueprint: CLI File Hash Inspection

This blueprint defines the architecture, module boundaries, data structures, and test contracts for the dedicated `exifsense hash <path...>` CLI command. It enables investigators and evaluators to quickly capture cryptographic hash manifests (SHA-256 and SHA-1) across individual files, lists of files, or directories, supporting Pilar 1 (Forensic Integrity & Read-Only Guarantee) with zero external dependencies and zero metadata parsing overhead.

## Current Code and Gaps

- Currently, `src/cli/args.ts` supports commands `single`, `batch`, `scenario`, `extract`, `help`, and `version`. There is no dedicated command for hashing.
- Single file hashing exists inside `src/cli/loader.ts` via `calculateFileHash`, but it is tied to loading full `ForensicAsset` structures (parsing EXIF, evaluating integrity alerts).
- Batch analysis (`src/cli/runner.ts`) coordinates collective intelligence, OSRM routing, and narratives, but does not output a file hash table.
- Gap: We need a direct, lightweight pipeline from file paths -> raw buffers -> SHA-256 & SHA-1 hashes -> formatted table output, without touching EXIF or network logic.

## Architecture & Module Boundaries

The implementation follows our established CLI layered architecture:

1. **Argument Parsing (`src/cli/args.ts`)**: Parses `hash` subcommand, validates positional arguments, and maps `--format` and `--out` options into `CliParsedCommand`.
2. **Hash Execution Engine (`src/cli/loader.ts` or `src/cli/hasher.ts`)**: Resolves target paths (files or directories), reads binary buffers directly, and computes cryptographic hashes via existing `calculateFileHash`.
3. **Formatter (`src/cli/formatter.ts`)**: Formats the resulting manifest array into aligned plain text or markdown tables.
4. **Runner Integration (`src/cli/runner.ts`)**: Dispatches the `hash` command, delivers text to stdout or `--out` file, and updates CLI help documentation.

## Contracts

### BP-HASH-001: CLI Arguments Parsing for 'hash'
- **Serves**: Dedicated subcommand and standard options from Intent
- **Input**: Raw CLI argument array (e.g. `['hash', 'img1.jpg', 'img2.jpg', '--format', 'markdown', '--out', 'manifest.md']`)
- **Behavior**: Recognizes `hash` command, requires at least one positional target path, extracts standard options (`locale`, `format`, `out`), and returns typed `CliParsedCommand`.
- **Output**: `{ command: 'hash', targetPaths: string[], options: CliOptions }`
- **Failure**: Throws `CliArgumentError` if no target path is supplied, or if invalid format/locale is passed.
- **Method**: TDD (`method/TDD.md`)
- **Verification**: Unit tests in `tests/cli/cli.test.ts` verifying argument parsing, missing path rejection, and flag mapping.
- **Commit**:
  - `test(cli): add unit tests for hash command argument parsing`
  - `feat(cli): add hash subcommand parsing and options validation`

### BP-HASH-002: Batch File Hash Calculation and Directory Resolution
- **Serves**: High-throughput cryptographic hashing and flexible input handling from Intent
- **Input**: Array of file and/or directory path strings
- **Behavior**: Resolves paths to absolute disk paths. If a path is a directory, scans for files within it. For each resolved file, reads the binary buffer and computes SHA-256 and SHA-1 digests using `calculateFileHash`. Does not execute EXIF extraction or integrity analysis.
- **Output**: Array of `FileHashResult`:
  ```ts
  interface FileHashResult {
    fileName: string;
    filePath: string;
    fileSize: number;
    sha256: string;
    sha1: string;
  }
  ```
- **Failure**: Throws `FileNotFoundError` if a specified file path does not exist on disk.
- **Method**: TDD (`method/TDD.md`)
- **Verification**: Unit tests in `tests/cli/hasher.test.ts` (or `tests/cli/loader.test.ts`) against single files, multiple files, and directories.
- **Commit**:
  - `test(cli): add tests for batch file hashing and directory resolution`
  - `feat(cli): implement computeFileHashes engine`

### BP-HASH-003: Tabular Plain Text and Markdown Output Formatting
- **Serves**: Dual-hash display, markdown export, and clear inspection from Intent
- **Input**: Array of `FileHashResult` and `CliOptions` (`format: 'plain' | 'markdown'`)
- **Behavior**:
  - If `format === 'plain'`: formats an aligned monospace ASCII table displaying Total Files, File Name, File Size (bytes), SHA-256, and SHA-1.
  - If `format === 'markdown'`: formats a GitHub Flavored Markdown table with header metrics and backtick-wrapped hash digests.
- **Output**: Formatted string ready for console display or file writing.
- **Failure**: Returns a graceful empty manifest header if the input array is empty.
- **Method**: TDD (`method/TDD.md`)
- **Verification**: Unit tests in `tests/cli/formatter.test.ts` verifying table columns, alignment, and markdown formatting.
- **Commit**:
  - `test(cli): add unit tests for hash manifest table formatting`
  - `feat(cli): implement formatHashOutput for plain and markdown tables`

### BP-HASH-004: End-to-End CLI Runner Execution and Documentation
- **Serves**: Seamless runner integration, stdout and `--out` file writing from Intent
- **Input**: Full CLI invocation string via `runCli(['hash', ...])`
- **Behavior**: Dispatches the command to compute hashes, formats output, writes to file if `--out` is specified or prints to `process.stdout`, returns `CliExecutionResult` with `exitCode: 0`. Updates `HELP_TEXT` to include `exifsense hash <path...>`.
- **Output**: `{ success: true, exitCode: 0, outputText: string }`
- **Failure**: Returns `{ success: false, exitCode: 1, errorText: string }` if a file is missing or invalid.
- **Method**: Integration/E2E (`method/INTEGRATION_E2E.md`)
- **Verification**: Integration tests in `tests/cli/cli.test.ts` invoking `runCli(['hash', ...])` with stdout inspection and disk file delivery verification.
- **Commit**:
  - `test(cli): add integration tests for hash subcommand execution and output delivery`
  - `feat(cli): wire hash command in runner and update CLI help documentation`

## Non-Goals

- **No automated diff/compare engine**: Do not add automated diff comparisons (`sha compare`) or database state between runs. The analyst runs `exifsense hash` before and after to observe immutability.
- **No EXIF or metadata parsing**: Do not parse EXIF headers, camera make/model, or timestamps during this command.
- **No geospatial or OSRM network calls**: Zero network requests are made; hashing is 100% local and instantaneous.
- **No recursive directory tree traversal**: Directory scanning remains local to the specified folder without uncontrolled deep recursive crawling.
