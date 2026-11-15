---
title: "ADR-002: Exclude Metadata Sanitization From ExifSense CLI and Use Standalone ExifTool for Research Datasets"
type: adr
status: Accepted
date: 2026-11-15
deciders: [Eds]
tags: [cli, sanitization, architecture, dependencies, research]
parent_prd: null
parent_srs: null
supersedes: null
superseded_by: null
---

# ADR-002: Exclude Metadata Sanitization From ExifSense CLI and Use Standalone ExifTool for Research Datasets

## Context

We evaluated carrying over ExifSense Web's metadata sanitization feature into the ExifSense CLI (`packages/exifsense-cli`), driven primarily by the need to prepare research test scenarios where sample photos have specific metadata categories removed selectively across multiple image extensions.

In the current codebase, `src/core/sanitizer/sanitizer.ts` relies on `piexifjs` for selective JPEG metadata removal, while non-JPEG formats and full-strip presets (`max-privacy`) fall back to browser-only DOM and Canvas APIs (`document.createElement('canvas')`, `new Image()`, `URL.createObjectURL`). Meanwhile, `exifsense-cli` is packaged as a zero-dependency standalone Node.js bundle built by `rolldown`, and its analysis pipeline (`src/cli/loader.ts`) shares `exifr` with the Web client (`src/services/ingestionCoordinator.ts`) to guarantee 1:1 parity in tag names, types, and forensic narratives.

## Decision

We will not implement metadata sanitization in the ExifSense CLI, keeping `exifsense-cli` focused strictly on read-only forensic inspection, chronological narrative generation, and hash verification. For preparing selectively sanitized multi-format test datasets for research scenarios, we will install and run standalone `exiftool` directly on the host operating system outside the ExifSense codebase.

## Alternatives Considered

One alternative was adding `sharp` to the CLI for multi-format full stripping (JPEG, PNG, WebP, GIF, TIFF, AVIF) while keeping `piexifjs` for selective JPEG stripping. We rejected this because `sharp` does not support selective tag-category stripping across formats and its standard prebuilt binaries exclude HEIC due to codec patent licensing, while still introducing native binary packaging and `--external sharp` bundler configuration.

A second alternative was adopting `exiftool-vendored` inside the CLI, either solely for sanitization alongside `exifr` or as a full replacement for `exifr` in the CLI. Running both `exifr` and `exiftool-vendored` creates awkward tool overlap for a single CLI package and adds Perl/ExifTool binary overhead solely to support test-dataset preparation. Replacing `exifr` entirely in the CLI with `exiftool-vendored` would break out-of-the-box output compatibility with `src/core/forensics/metadata.ts` and `integrity.ts`, add background process startup and teardown (`exiftool.end()`) overhead to fast read-only commands, and risk silent analysis drift between `exifsense-cli` and the browser-only ExifSense Web client.

A third alternative was writing pure-JavaScript binary chunk strippers for JPEG, PNG, and WebP. We rejected this because maintaining custom binary parsers across container formats adds unnecessary implementation surface and still cannot preserve pixel orientation when stripping EXIF orientation tags without a pixel-decoding engine.

## Consequences

ExifSense CLI remains a lightweight, zero-dependency standalone bundle with no native binary dependencies, no changes to `rolldown` or Vercel static Web build pipelines, and guaranteed 1:1 analytical parity with ExifSense Web via `exifr`. Preparing research test images with selective metadata removal becomes faster and more capable because host-installed `exiftool` handles every format (including HEIC and RAW) with industry-standard precision.

On the trade-off side, ExifSense CLI users cannot sanitize image metadata from the terminal through `exifsense`, and metadata sanitization remains a Web-only feature unless a future product requirement justifies revisiting CLI write capabilities.

## Verification & Related Context

This decision is reflected by keeping `packages/exifsense-cli/package.json` free of image-mutation dependencies (`sharp`, `exiftool-vendored`), keeping `src/core/sanitizer/` scoped to the Web application, and keeping `src/cli/loader.ts` on `exifr` for read-only analysis.

- Web Sanitizer Implementation: `src/core/sanitizer/sanitizer.ts`
- CLI Package Manifest: `packages/exifsense-cli/package.json`
