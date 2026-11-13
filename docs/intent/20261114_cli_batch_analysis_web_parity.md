---
title: "Intent: CLI Batch Analysis Web Parity"
type: intent
last_updated: 2026-11-14
---

# Intent: CLI Batch Analysis Web Parity

## The Goal

Bring multi-asset CLI output (`exifsense batch <path...>` and batch `exifsense scenario <name>`) to 1:1 information parity with the Web batch dashboard (`ChronologicalStoryCard` and `CombinedIntelligenceCard`). Terminal runs should produce the same enriched chronological story with live physical place names resolved from GPS coordinates (reverse geocoding) and the same four structured `Combined Analysis` evidence views, localized across English (`en`) and Indonesian (`id`), while offering an opt-in `--detailed` flag when an analyst also wants full per-asset breakdowns appended.

## The Rationale

While single-asset CLI parity is already in place, comparing `exifsense batch` against the Web dashboard reveals four structural gaps in `src/cli/runner.ts`, `src/cli/formatter.ts`, and `src/core/`:

- **Missing batch physical place names**: `processBatchAssets` in `src/cli/runner.ts` fetches road routes from OpenStreetMap Routing Machine (OSRM), but never resolves GPS coordinates into physical street or city names (reverse geocoding) via Nominatim. As a result, `Chronological Story` steps in the CLI fall back to raw coordinates even when online, unlike `ChronologicalStoryCard.tsx` in the Web UI.
- **Outdated `Combined Analysis` content and ordering**: `formatBatchOutput` prints `Combined Analysis` before `Chronological Story` and still renders the four legacy summary paragraphs from `generateCollectiveNarratives`. In the Web UI (`CombinedIntelligenceCard.tsx`), those redundant paragraphs were removed in favor of the macro lead in `ChronologicalStoryCard`, leaving `Combined Analysis` strictly as a four-part evidence inspector whose detailed tables and breakdowns (per-file Integrity Matrix, 7-column Hardware table, natural-date Timeline bounds and missing-timestamp list, and per-leg Geospatial jumps with road distances and disclaimers) are currently missing in the CLI.
- **Hardcoded English strings and unit mismatches**: `formatBatchOutput` hardcodes English headings, labels (`Yes`/`No`, `None detected`), English-only `formatDuration` units (`1d 2h 3m 4s`), raw `spreadCategory` keys, and fixed `.toFixed(2) km` formatting instead of reusing `translate()` and adaptive meter/kilometer formatting. In addition, `collective.ts` and `chronological.ts` only check `latitude`/`longitude` without falling back to `GPSLatitude`/`GPSLongitude` as `runner.ts` and `TimelineMap.tsx` do.
- **No opt-in per-asset breakdown**: Batch CLI runs omit individual asset details by design to keep output readable, yet analysts inspecting a small batch or generating an archive via `--out` currently have no flag to include each file's full single-asset report in the same output.

## What We Want

- **Batch coordinate-to-address enrichment with automatic pacing**: In `processBatchAssets`, resolve physical place names sequentially for every geotagged asset lacking `locationName` using `resolveLocationWithPacing` from `src/services/mapHelpers.ts`, degrading gracefully to numeric coordinates whenever offline or timed out.
- **Web-aligned section flow and batch anomaly visibility**: Order the batch output cleanly as batch header (`Total Assets`), cross-batch `Asset Integrity Alerts` when any asset triggers integrity warnings (preserving specific anomalies such as editing software, dimension mismatches, or `0,0` coordinates that the presence matrix does not list), `Chronological Story`, and then `Combined Analysis`, without adding a separate `TimelineMap` waypoint/link block.
- **1:1 `Combined Analysis` evidence views without redundant narrative paragraphs**: Remove the four `generateCollectiveNarratives` summary paragraphs from `formatBatchOutput` so `Combined Analysis` matches `CombinedIntelligenceCard.tsx`, and render all four structured evidence sections in both `plain` and `markdown` formats: the per-file Integrity Completeness Matrix, the 7-column Hardware Comparison table (`File Name`, `Make`, `Model`, `Software`, `Lens Model`, `Body Serial`, `Lens Serial`), Timeline & Sequence bounds (`Start of Capture` and `End of Capture` in natural date format, localized total duration, gaps, and `Photos Lacking Time Data`), and Geospatial & Movement evidence (adaptive `m`/`km` distances, localized spread/route metrics, calculation disclaimer, velocity anomaly warning, and per-leg location jumps with `via road` distances).
- **Full `en`/`id` localization and consistent GPS tag fallback**: Localize all batch section headings, table headers, status labels, and duration units through `translate()` and `src/locales/*.json`, and align `collective.ts` and `chronological.ts` to read `GPSLatitude`/`GPSLongitude` when `latitude`/`longitude` are absent.
- **Opt-in `--detailed` flag for per-asset reports**: Keep default `exifsense batch` and batch `scenario` runs concise, and add a `--detailed` CLI flag that appends the full `formatSingleOutput` breakdown for every asset in input order at the end of the batch output.

## What We Do NOT Want

- **No per-asset details by default**: Do not print individual asset narratives and 8-category raw EXIF tables in standard `exifsense batch` runs unless `--detailed` is explicitly supplied.
- **No separate map-link section**: Do not introduce a text equivalent of `TimelineMap` with Google Maps or OpenStreetMap links, since coordinates and route distances are already represented in `Chronological Story` and `Combined Analysis`.
- **No duplicate macro narratives inside `Combined Analysis`**: Do not keep `generateCollectiveNarratives` paragraphs in `formatBatchOutput` (while leaving `src/core/exporter/exporter.ts` unchanged).
- **No network crashes or hardcoded labels**: Offline environments, rate limits, or OSRM/Nominatim timeouts must never fail batch execution, and all user-facing batch text must use `src/locales/*.json` rather than hardcoded English strings.
