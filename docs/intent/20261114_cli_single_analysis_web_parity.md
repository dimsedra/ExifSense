---
title: "Intent: CLI Single-Asset Web Parity"
type: intent
last_updated: 2026-11-14
---

# Intent: CLI Single-Asset Web Parity

## The Goal

Bring the CLI single-asset analysis (`exifsense single <path>` and single-asset `exifsense scenario <name>`) to 1:1 information parity with the Web dashboard single-asset view. When inspecting a single photo or JSON metadata fixture from the terminal, the CLI should output the exact same file summary, integrity alerts, all 7 forensic narrative sections, live physical place name resolution from coordinates (reverse geocoding) via OpenStreetMap Nominatim, and all 8 categorized raw EXIF metadata groups formatted identically to the Web interface.

## The Rationale

Although the Web interface and the CLI already share the same core forensic and narrative domain engines in `src/core/`, their single-asset outputs currently diverge in four concrete ways that break side-by-side comparison during research evaluation and manual verification:

- **Missing physical place names in CLI**: Neither `src/cli/loader.ts` nor `src/cli/runner.ts` calls the coordinate-to-address lookup (`reverseGeocode`) in `src/services/mapHelpers.ts`, even though that helper relies solely on standard HTTP fetching (`fetch`) and runs cleanly in Node.js. As a result, single-asset geospatial narratives in the CLI always fall back to generic remote-location phrasing instead of resolving the actual street or city name as the Web dashboard does.
- **Hidden Geospatial section when GPS is absent**: In `src/cli/formatter.ts`, `formatSingleOutput` omits the Geospatial section whenever latitude or longitude is missing, whereas `ExpertAnalysisTabs.tsx` in the Web UI always displays all 7 narrative sections so an analyst explicitly sees when GPS coordinates are unavailable.
- **Missing 8-category raw metadata breakdown**: While `loadImageAsset` and `mapRawObjectToAsset` already group EXIF tags into 8 categories via `categorizeExif`, `formatSingleOutput` does not render them at all. Terminal users who want raw tags must invoke `exifsense extract`, which prints flat JSON rather than the grouped, human-readable labels and formatted values shown in the Web UI.
- **File summary and input mismatch**: The Web file card (`AssetPreviewCard.tsx`) displays `File Date` alongside file hashes and type, while the CLI header omits `File Date`. Additionally, `ExpertAnalysisTabs.tsx` passes the complete `exifData` object to each narrative generator, whereas `formatSingleOutput` passes only the single category slice, which risks subtle divergence if a narrative ever inspects tags outside that single group.

## What We Want

- **Full 7-section narrative parity**: Always render all 7 forensic narrative sections (`Integrity`, `Geospatial`, `Hardware`, `Exposure`, `Optics`, `Quality`, and `Timeline`) in `exifsense single` and single-asset `scenario` runs, passing the full `exifData` dictionary to each generator just as `ExpertAnalysisTabs.tsx` does and explicitly showing the missing-GPS narrative when coordinates are absent.
- **Always-on physical place name lookup with automatic pacing**: Resolve GPS coordinates into physical place names via Nominatim by default whenever coordinates exist, without imposing arbitrary file-count caps. Because Nominatim's public API enforces strict request-rate limits, lookups must pace automatically across sequential calls and degrade gracefully to coordinates or generic phrasing if the network is offline or slow so analysis never crashes.
- **Complete 8-category raw EXIF metadata output**: Print all 8 standardized forensic categories (`Device Hardware`, `Exposure Settings`, `Optics & Lens`, `Image Quality`, `Timeline & Date`, `Geospatial`, `Standards & Info`, and `Miscellaneous`) in both `plain` and `markdown` output formats, reusing `formatLabel` and `formatExifValue` from `src/core/forensics/metadata.ts` for exact formatting parity with the Web UI.
- **Explicit empty-category visibility**: Always print the section heading for all 8 metadata categories even when a category has zero recorded tags, displaying the localized empty-category message (`no_metadata_tags`) just like the Web UI tabs do so analysts can immediately verify the absence of tags in any domain.
- **Basic file information parity**: Include `File Date` (formatted for the active `--locale`) alongside `File Name`, `File Size`, `Format`, `Dimensions`, `SHA-256`, and `SHA-1` in the single-asset summary header.
- **Single source of truth for logic and translations**: Reuse `src/core/forensics/metadata.ts`, `src/core/narratives/narratives.ts`, `src/locales/*.json`, and `src/services/mapHelpers.ts` directly rather than duplicating formatting rules or translation strings inside `src/cli/`.

## What We Do NOT Want

- **No batch parity changes in this Intent**: Aligning `exifsense batch` with `CombinedIntelligenceCard` and `ChronologicalStoryCard` (such as batch-wide reverse geocoding and jump tables) is intentionally out of scope here and will be handled in a separate, follow-up Intent once single-asset parity is in place.
- **No network-induced crashes**: Offline environments, HTTP errors, rate-limit responses, or slow Nominatim timeouts must never abort or fail `exifsense single`; coordinate-only fallback output must always succeed.
- **No omission of empty metadata categories**: Do not hide or skip empty groups among the 8 raw metadata categories, because explicitly showing an empty group confirms absence of data.
- **No duplicated CLI formatting logic**: Do not re-implement tag label formatting, value formatting, or localized labels inside `src/cli/formatter.ts` when shared domain helpers already exist.
