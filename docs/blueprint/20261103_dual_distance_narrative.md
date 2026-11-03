---
title: "Blueprint: Dual-Distance Narrative (Displacement and Road Route)"
type: blueprint
parent_intent: docs/intent/20261103_dual_distance_displacement_and_road_route.md
status: Approved
last_updated: 2026-11-03
---

# Blueprint: Dual-Distance Narrative (Displacement and Road Route)

This specification translates [Intent: Dual-Distance Narrative (Displacement vs Road Route)](../intent/20261103_dual_distance_displacement_and_road_route.md) into concrete technical contracts, preserving architectural boundaries so that `src/core/narratives/chronological.ts` remains a pure, synchronous domain module while both Web and CLI consumers leverage OSRM network routing with graceful offline fallbacks.

## Current Code
- In `src/services/mapHelpers.ts`, `fetchOsrmRoute` queries `https://router.project-osrm.org/route/v1/driving/...` but only extracts `geometry: GeoJSON.GeoJsonObject`. It discards `routes[0].legs` and route distance metrics.
- In `src/core/narratives/chronological.ts`, `buildSubsequentStep` calculates distance strictly via `calculateDistance` (Haversine formula), interpolating `{distance}` as a single value into `chrono_step_location` or `chrono_step_gps`.
- In `src/components/dashboard/ChronologicalStoryCard.tsx`, story generation is executed synchronously during render without road route metrics.
- In `src/cli/runner.ts`, `processBatchAssets` generates the story synchronously and currently performs no network I/O.

## Design
```
                       [ Input: Assets with GPS ]
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   [ Web: ChronologicalStoryCard ]             [ CLI: runner.ts ]
              │                                         │
              └───────────────┬─────────────────────────┘
                              │
                              ▼
            fetchOsrmRouteDetails(waypoints)
             (Boundary: I/O + In-Memory Cache)
                              │
             ┌────────────────┴────────────────┐
             ▼ (Success)                       ▼ (Offline/Error)
   [ legDistancesMeters[] ]                    [ null / [] ]
             │                                       │
             └────────────────┬──────────────────────┘
                              │
                              ▼
            generateChronologicalBatchStory(assets, {
              roadDistances: legDistancesMeters
            })
            (Core Domain: Pure, Synchronous)
                              │
                              ▼
         "approximately 16.3 km in straight-line displacement
              (or ~21.5 km via road route) from 731.jpg"
```

1. **Boundary I/O Layer (`src/services/mapHelpers.ts`)**:
   Provides `fetchOsrmRouteDetails(waypoints)` returning both overall route info and individual `legDistancesMeters: number[]`. Works universally across Web (browser `fetch`) and Node CLI (Node 18+ global `fetch`).
2. **Core Domain Layer (`src/core/narratives/chronological.ts`)**:
   Remains strictly pure and synchronous. Accepts optional `roadDistances?: number[]` mapping to transitions between GPS-enabled waypoints. Formats the displacement and road distance according to active locale templates.
3. **Consumers (`ChronologicalStoryCard.tsx` and `cli/runner.ts`)**:
   Resolve road route asynchronously at the boundary before passing resolved distances into the narrative generator. If offline, timed out, or unroutable, they supply no road distances and the narrative cleanly renders straight-line displacement only.

## Contracts

### BP-DUALDIST-001: OSRM Route Leg Distance Extraction
- **Serves**: Resolving individual segment transit distances along the road network without redundant API calls.
- **Input**: `waypoints: Array<{ lat: number; lng: number }>`
- **Behavior**:
  - Builds coordinates string `lng,lat;lng,lat...` (capped at 100 points).
  - Checks in-memory cache `osrmDetailsCache`.
  - Sends HTTP GET to OSRM driving route API.
  - Parses `routes[0].legs`, extracting `leg.distance` (in meters) for each consecutive pair `[i, i+1]`.
  - Returns structured result: `{ totalDistanceMeters: number; legDistancesMeters: number[]; geometry?: GeoJSON.GeoJsonObject }`.
  - On network failure, non-200 response, or missing routes, returns `null` gracefully.
- **Output**: `Promise<OsrmRouteDetails | null>`
- **Failure**: Caught internally, logs error, returns `null`. Never throws.
- **Method**: TDD
- **Verification**: `tests/services/mapHelpers.test.ts` testing successful parsing of legs, in-memory caching, empty waypoints, and HTTP error fallback.
- **Commit**:
  - `test: add unit tests for osrm route details and leg distance extraction`
  - `feat: implement fetchOsrmRouteDetails with leg distance mapping and caching`

### BP-DUALDIST-002: Dual-Distance Narrative Formatting and Localization
- **Serves**: Clear distinction between straight-line displacement and estimated road route in narrative text.
- **Input**:
  - `assets: ForensicAsset[]`
  - `options: ChronologicalStoryOptions & { roadDistances?: number[] }`
  - Locale templates in `src/locales/{en,id,ar}.json`
- **Behavior**:
  - For each chronological transition between consecutive assets with valid GPS:
    - Calculates straight-line distance via `calculateDistance` (Haversine).
    - If a matching `roadDistance` is provided: formats compound evidence string, e.g.:
      - `en`: `approximately 16.3 km in straight-line displacement (or ~21.5 km via road route)`
      - `id`: `sekitar 16.3 km perpindahan garis lurus (atau ~21.5 km melalui rute jalan)`
      - `ar`: `حوالي 16.3 كم إزاحة خط مستقيم (أو ~21.5 كم عبر مسار الطريق)`
    - If `roadDistance` is not provided (or 0 / undefined): formats displacement only:
      - `en`: `approximately 16.3 km in straight-line displacement`
      - `id`: `sekitar 16.3 km perpindahan garis lurus`
      - `ar`: `حوالي 16.3 كم إزاحة خط مستقيم`
- **Output**: `ChronologicalBatchStory` with dual-distance text.
- **Failure**: Missing road distance falls back to pure displacement without throwing.
- **Method**: TDD
- **Verification**: `tests/core/narratives/chronological.test.ts` testing output across `en`, `id`, and `ar` with and without road distances.
- **Commit**:
  - `test: add unit tests for dual-distance narrative step interpolation`
  - `feat: update chronological narrative templates and step builder for dual distance`

### BP-DUALDIST-003: Web UI Boundary Integration
- **Serves**: Providing road route data to the web narrative without blocking initial render.
- **Input**: `assets: ForensicAsset[]` in `ChronologicalStoryCard.tsx`
- **Behavior**:
  - `useEffect` extracts chronological GPS waypoints.
  - Invokes `fetchOsrmRouteDetails(waypoints)`.
  - On resolution, stores `legDistancesMeters` in component state.
  - Rerenders `generateChronologicalBatchStory(assets, { roadDistances })`.
- **Output**: Updated DOM showing dual distance in the story steps.
- **Failure**: If offline or OSRM fails, state remains empty, rendering baseline displacement cleanly.
- **Method**: Integration/e2e
- **Verification**: Unit/integration tests in `tests/components/` or manual web verification proving async resolution and fallback.
- **Commit**:
  - `feat: integrate osrm leg distances into ChronologicalStoryCard`

### BP-DUALDIST-004: CLI Runner Parity and Offline Fallback
- **Serves**: Ensuring CLI batch analysis outputs the same dual-distance narrative as the web while maintaining zero-crash offline execution.
- **Input**: `assets: ForensicAsset[]` in `src/cli/runner.ts`
- **Behavior**:
  - `processBatchAssets` becomes async.
  - Extracts chronological GPS waypoints from assets.
  - Awaits `fetchOsrmRouteDetails(waypoints)` wrapped in try/catch with timeout.
  - Passes extracted `legDistancesMeters` into `generateChronologicalBatchStory`.
  - If network is unreachable or offline, proceeds with displacement-only narrative without throwing or aborting CLI run.
- **Output**: Formatted batch report string containing dual-distance narrative.
- **Failure**: Network failure is caught; output continues with displacement-only story. Exit code remains 0.
- **Method**: TDD
- **Verification**: `tests/cli/cli.test.ts` testing batch execution with mocked successful OSRM response and mocked network failure.
- **Commit**:
  - `test: test cli batch analysis with dual distance and offline fallback`
  - `feat: enable dual-distance road route resolution in cli runner`

## Non-Goals
- **No internal fetch in core domain**: `src/core/narratives/chronological.ts` must never import `fetch` or call external HTTP endpoints directly.
- **No multi-mode routing**: Do not add walking, cycling, or transit mode toggles; driving mode (`/driving/`) remains the single standard road route profile.
- **No blocking spinners in CLI**: CLI must not freeze indefinitely if OSRM is slow; network fetch must have a short reasonable timeout (e.g. 3000ms).
