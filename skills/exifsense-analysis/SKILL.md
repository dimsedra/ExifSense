---
name: exifsense-analysis
description: Use when I ask you to analyze image EXIF metadata, check photo integrity or tampering alerts, compute SHA-256/SHA-1 forensic hashes, reconstruct a chronological travel narrative across multiple photos, or extract raw EXIF JSON using exifsense-cli.
---

# ExifSense Analysis

Use this skill whenever I ask you to inspect photo metadata, evaluate image authenticity, trace capture timelines and GPS movement across multiple photos, or verify file hashes from the command line.

Your job is to run `exifsense` via the standalone `exifsense-cli` package rather than guessing metadata from filenames, parsing raw binary headers manually, or cloning the full ExifSense web application.

## How to Run the CLI

Requires Node.js 20 or newer.

Check if `exifsense` is already available on my machine (`exifsense --version`). If it is not installed globally, run it directly with `npx` without installing the web app:

```bash
npx --yes --package=exifsense-cli exifsense <command>
```

If I ask you to install it permanently on my machine, install only the CLI package:

```bash
npm install -g exifsense-cli
```

## Choosing the Right Command

Pick the subcommand that matches what I asked you to do:

- **Inspect one photo or metadata JSON (`single`)**: Use when I want integrity alerts, SHA-256/SHA-1 hashes, all 7 forensic narratives (integrity, geospatial, hardware, exposure, optics, quality, timeline), and the 8 categorized EXIF metadata groups for a single asset.
  ```bash
  exifsense single photo.jpg
  ```
- **Analyze a sequence of photos (`batch`)**: Use when I give you two or more photos and want collective integrity checks, hardware comparison, timeline bounds and gaps, geospatial displacement and road-route estimates, and a chronological story. Add `--detailed` when I also want the full per-asset breakdown appended at the end.
  ```bash
  exifsense batch photo1.jpg photo2.jpg photo3.jpg
  exifsense batch photo1.jpg photo2.jpg --detailed
  ```
- **Verify file immutability (`hash`)**: Use when I only need SHA-256 and SHA-1 digests (for example before and after copying or processing files). Unlike `single` and `batch`, `hash` accepts directory paths and scans direct child files non-recursively.
  ```bash
  exifsense hash photo1.jpg photo2.jpg
  exifsense hash path/to/folder/
  ```
- **Export raw metadata (`extract`)**: Use when I want a clean JSON dump of raw EXIF tags, optionally saved to a file you can inspect or re-feed into `single` or `batch` later.
  ```bash
  exifsense extract photo.jpg metadata.json
  ```

## Flags You Can Pass

- `--locale <en|id>`: Set narrative and table output language to English (`en`, default) or Indonesian (`id`). Match the language I asked for.
- `--format <plain|markdown>`: Use `markdown` when I ask for a Markdown report or when writing a report file with `--out`. Defaults to `plain`.
- `--detailed`: Append per-asset single analyses (`ASSET 1` through `ASSET N`) after the batch summary. Only applies to `batch`.
- `--out <path>`: Write the report directly to a file instead of printing to standard output.

## Practical Constraints to Keep in Mind

- **Pass file paths, not folders, to `single` and `batch`**: `single` and `batch` expect image files (verified by binary signature) or `.json` asset files. If I point you to a directory for batch analysis, expand the image files first (for example `exifsense batch photos/*.jpg`) instead of passing the folder path directly.
- **Online enrichment vs. offline fallback**: When online, `single` and `batch` reverse-geocode GPS coordinates via Nominatim and `batch` estimates driving distance via OSRM. When offline or rate-limited, both fall back cleanly to numeric coordinates and straight-line great-circle displacement without failing.
- **Non-zero exit codes**: Missing files, invalid JSON, unsupported file formats, or unsupported flags exit with code `1` and print an `Error:` message to stderr. Report that exact error to me instead of guessing what the photo contains.
