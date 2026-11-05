---
title: "Intent: CLI File Hash Inspection for Forensic Integrity"
type: intent
last_updated: 2026-11-05
---

# Intent: CLI File Hash Inspection for Forensic Integrity

## The Goal

Provide a dedicated, lightweight CLI command `exifsense hash <path...>` that calculates and outputs cryptographic hashes (SHA-256 and SHA-1) across one or more files or entire directories. This enables forensic investigators and research evaluators to quickly record baseline hashes before running batch analyses and verify file immutability (Pilar 1: Read-Only Guarantee) afterward, entirely through ExifSense CLI without external utilities.

## The Rationale

In forensic science and our research methodology (Pilar 1: Forensic Integrity & Data Confinement), proof of non-destructive processing relies on matching cryptographic hashes before and after execution.
- Currently, ExifSense displays SHA-256 and SHA-1 in the Web UI and during `exifsense single`, but lacks a direct mechanism to inspect hashes across a batch of files (such as the 736 images in the DSTL Scotland 2019 dataset).
- Running full batch analysis (`exifsense batch`) simply to see hashes introduces substantial overhead: metadata extraction, OSRM routing, reverse geocoding, and narrative generation.
- Relying on external shell tools like `sha256sum` fragments the research workflow and reduces the self-containment of ExifSense as an all-in-one forensic tool.
- A dedicated hashing command gives analysts a fast, isolated way to inspect and archive file hashes at any stage of an investigation.

## What We Want

- **Dedicated subcommand**: Intuitive `exifsense hash <path...>` command that focuses solely on computing file hashes.
- **Flexible path inputs**: Support for individual image paths, multiple paths, glob patterns, or directory paths (automatically resolving image files within the folder).
- **Dual hash display**: Display both SHA-256 (forensic standard) and SHA-1 (legacy parity) alongside file name and file size.
- **Standard output options**: Support for `--format plain|markdown` and `--out <path>` so analysts can write baseline hash manifests directly to an evidence logbook.
- **High throughput**: Streamlined byte-level hashing using existing local cryptographic helpers without triggering metadata parsing or geospatial lookups.

## What We Do NOT Want

- **No automated diff/compare engine**: Do not build complex `sha compare` commands or stateful comparison databases. The analyst simply executes the command twice (pre-analysis baseline and post-analysis verification), preserving full parity with the Web UI.
- **No unnecessary pipeline overhead**: Do not trigger EXIF parsing, OSRM requests, or template-based NLG when computing hashes. Keep this command purely focused on cryptographic file integrity.
