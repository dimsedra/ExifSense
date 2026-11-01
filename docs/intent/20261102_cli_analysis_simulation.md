---
title: "Intent: CLI Analysis and Simulation Harness"
type: intent
last_updated: 2026-11-02
---

# Intent: CLI Analysis and Simulation Harness

## The Goal
Provide a fast, terminal-native way to run ExifSense's single and batch analysis engines directly through a custom CLI command (`exifsense`), completely bypassing the browser UI. This enables rapid stress testing of core invariants, missing metadata edge cases, and narrative generation quality using real and simulated metadata.

## The Rationale
Manually testing edge cases through the web UI—such as missing GPS coordinates, stripped timestamps, software tampering flags, or extreme exposure values—is slow and tedious. It requires crafting binary image files and repeatedly dragging them into the browser. Furthermore, verifying narrative text quality and ensuring invariants do not break during code changes requires an automated, repeatable harness that produces instant feedback in milliseconds.

## What We Want
- **Global CLI executable**: A first-class `exifsense` command that can be run from any terminal directory (such as home `~` or arbitrary project folders).
- **Flexible input sources**: The CLI must accept either real image files (extracting metadata on the fly) or custom JSON metadata files from any path on the filesystem.
- **Tracked simulation scenarios on disk**: Curated edge-case scenarios stored as plain, human-readable JSON files in `tests/fixtures/scenarios/`. These act as both quick CLI presets and permanent regression proof during automated test runs.
- **Ground truth from real images**: Use the real DSTL Scotland geotagged photos in `Downloads/archive/` as a realistic metadata baseline, extracting clean baseline JSON templates without checking bulky image binaries into the repository.
- **Comprehensive core coverage**: Ability to test both single-asset analysis (hardware, exposure, optics, quality, timeline, geospatial, integrity alerts) and batch collective analysis (hardware consistency, timeline jumps, travel route distances, chronological story steps).
- **Clear terminal output**: Clean, readable plain text terminal output showing detected integrity alerts and full narrative paragraphs.

## What We Do NOT Want
- **No binary bloat in git**: Do not check large image files from `Downloads/archive/` into the Git repository. Keep the repo lightweight by storing only compact JSON metadata fixtures.
- **No heavy external CLI libraries**: Avoid adding heavy command-line frameworks (like Commander or Yargs) when modern Node built-in utilities (`node:util.parseArgs`) can do the job simply.
- **No test pollution in production code**: Keep all simulation data, test fixtures, and scenario files inside `tests/`, never in `src/`.
- **No volatile-only mocks**: Do not rely solely on ephemeral in-memory objects that disappear after a session. Keep our core edge cases recorded in versioned JSON scenario files so they serve as lasting proof.
