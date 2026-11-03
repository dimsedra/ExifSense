---
title: "Blueprint: Dual-Distance Narrative (Displacement and Road Route)"
type: blueprint
parent_intent: docs/intent/20261103_dual_distance_displacement_and_road_route.md
status: Approved
last_updated: 2026-11-03
---

# Blueprint: Dual-Distance Narrative (Displacement and Road Route)

This specification translates [Intent: Dual-Distance Narrative (Displacement vs Road Route)](../intent/20261103_dual_distance_displacement_and_road_route.md) into concrete technical contracts, covering holistic alignment across the Chronological Story lead, event step transitions, the Combined Analysis Geospatial inspector, and the CLI runner.

## Current Code & Identified Gaps
- In `src/services/mapHelpers.ts`, `fetchOsrmRoute` queries `https://router.project-osrm.org/route/v1/driving/...` but only extracts `geometry: GeoJSON.GeoJsonObject`. It discards `routes[0].legs` and overall route distance.
- In `src/core/narratives/chronological.ts`:
  - `buildBaseline`: Calculates total session distance via Haversine and inserts it into `chrono_macro_*` templates as "covering an estimated total travel distance of approximately {distance}", confusing coordinate displacement with travel effort.
  - `buildSubsequentStep`: Calculates pairwise distance via Haversine and inserts it into step templates as a single ambiguous `{distance}`.
- In `src/components/dashboard/CombinedIntelligenceCard.tsx` (Geospatial Analysis tab):
  - Displays `collective.geospatial.totalPathDistanceKm` (Haversine summation) under the title "Total Travel Distance" with a misleading footnote: `*Estimated distance based on the most probable road routes between the photos' locations.`, even though no road routing was performed.
  - Displays individual coordinate jumps with pure Haversine values without distinguishing straight-line displacement from road route.
- In `src/cli/runner.ts` and `src/cli/formatter.ts`, batch output only reflects pure Haversine distance without road route context.

## Design
```
                       [ Input: Assets with GPS ]
                                   │
              ┌────────────────────┴────────────────────────┐
              ▼                                             ▼
   [ Web: StoryCard & CombinedCard ]               [ CLI: runner.ts ]
              │                                             │
              └────────────────────┬────────────────────────┘
                                   │
                                   ▼
                 fetchOsrmRouteDetails(waypoints)
                  (Boundary: I/O + In-Memory Cache)
                                   │
                  ┌────────────────┴────────────────┐
                  ▼ (Success)                       ▼ (Offline/Error)
        [ totalDistanceMeters,            [ total: null,
          legDistancesMeters[] ]            legs: [] ]
                  │                                 │
                  └────────────────┬────────────────┘
                                   │
          ┌────────────────────────┴────────────────────────┐
          ▼                                                 ▼
[ Core Narratives & Locales ]                     [ Geospatial Inspector ]
- Lead: "cumulative displacement                  - Total Displacement: X km
  (or ~Y km via road route)"                      - Estimated Road Route: Y km (if resolved)
- Steps: "X km displacement                       - Corrected, transparent footnotes
  (or ~Y km via road route)"                      - Jumps: displacement + road route
```

1. **Boundary I/O Layer (`src/services/mapHelpers.ts`)**:
   Provides `fetchOsrmRouteDetails(waypoints)` returning `{ totalDistanceMeters: number; legDistancesMeters: number[]; geometry?: GeoJSON.GeoJsonObject }`. Works universally in browser and Node 18+ CLI.
2. **Core Domain Layer (`src/core/narratives/chronological.ts` & `src/locales/`)**:
   Pure and synchronous. Accepts optional `{ totalRoadDistance?: number; roadDistances?: number[] }`. Formats both the macro lead paragraph and step transitions with dual-distance text.
3. **Geospatial Technical Inspector (`CombinedIntelligenceCard.tsx` & `cli/formatter.ts`)**:
   Rigorously labels metrics: "Cumulative Displacement" (Haversine) and "Estimated Road Route" (OSRM). Adjusts footnotes honestly based on whether OSRM routing was evaluated.

## Contracts

### BP-DUALDIST-001: OSRM Route Details and Leg Distance Extraction
- **Serves**: Resolving both total road distance and individual segment transit distances without redundant API calls.
- **Input**: `waypoints: Array<{ lat: number; lng: number }>`
- **Behavior**:
  - Validates waypoint list (minimum 2 points, capped at 100).
  - Checks in-memory cache `osrmDetailsCache`.
  - Queries OSRM `/route/v1/driving/...` endpoint.
  - Extracts `routes[0].distance` (total meters) and `routes[0].legs` (`leg.distance` in meters per consecutive waypoint pair).
  - Caches and returns `{ totalDistanceMeters, legDistancesMeters, geometry }`.
  - On network error, non-200 HTTP, or empty routes, catches error and returns `null`.
- **Output**: `Promise<OsrmRouteDetails | null>`
- **Failure**: Handled gracefully, logs error without throwing.
- **Method**: TDD
- **Verification**: `tests/services/mapHelpers.test.ts` testing total distance, leg distances, caching, and network failure fallback.
- **Commit**:
  - `test: add unit tests for osrm route details and leg distance extraction`
  - `feat: implement fetchOsrmRouteDetails with leg distance mapping and caching`

### BP-DUALDIST-002: Dual-Distance Narrative Formatting (Lead Baseline & Step Transitions)
- **Serves**: Eliminating misleading single-metric distance claims in both the opening macro summary and pairwise step transitions.
- **Input**:
  - `assets: ForensicAsset[]`
  - `options: ChronologicalStoryOptions & { totalRoadDistance?: number; roadDistances?: number[] }`
  - Locale files (`en.json`, `id.json`, `ar.json`)
- **Behavior**:
  - **Macro Baseline**:
    - Calculates cumulative Haversine displacement.
    - If `totalRoadDistance` is provided: formats compound baseline string, e.g.:
      - `en`: `...covering approximately 11.8 km in cumulative straight-line displacement (or ~14.2 km via road route).`
      - `id`: `...mencakup perpindahan garis lurus kumulatif sekitar 11.8 km (atau ~14.2 km melalui rute jalan).`
      - `ar`: `...مغطية إزاحة خط مستقيم تراكمية بحوالي 11.8 كم (أو ~14.2 كم عبر مسار الطريق).`
    - If `totalRoadDistance` is absent: formats displacement only:
      - `en`: `...covering approximately 11.8 km in cumulative straight-line displacement.`
      - `id`: `...mencakup perpindahan garis lurus kumulatif sekitar 11.8 km.`
      - `ar`: `...مغطية إزاحة خط مستقيم تراكمية بحوالي 11.8 كم.`
  - **Step Transitions**:
    - If `roadDistances[i]` is provided: formats compound step string, e.g.:
      - `en`: `approximately 16.3 km in straight-line displacement (or ~21.5 km via road route)`
      - `id`: `sekitar 16.3 km perpindahan garis lurus (atau ~21.5 km melalui rute jalan)`
      - `ar`: `حوالي 16.3 كم إزاحة خط مستقيم (أو ~21.5 كم عبر مسار الطريق)`
    - If `roadDistances[i]` is absent: formats displacement only:
      - `en`: `approximately 16.3 km in straight-line displacement`
      - `id`: `sekitar 16.3 km perpindahan garis lurus`
      - `ar`: `حوالي 16.3 كم إزاحة خط مستقيم`
- **Output**: `ChronologicalBatchStory` with dual-distance narrative text.
- **Failure**: Missing road metrics fall back cleanly to displacement-only output.
- **Method**: TDD
- **Verification**: `tests/core/narratives/chronological.test.ts` testing baseline and steps with and without road metrics across `en`, `id`, and `ar`.
- **Commit**:
  - `test: add unit tests for dual-distance narrative step and baseline interpolation`
  - `feat: update chronological narrative templates and step builder for dual distance`

### BP-DUALDIST-003: UI Boundary Realignment (StoryCard and Geospatial Inspector)
- **Serves**: Pre-fetching OSRM metrics in web boundary, feeding the story card, and clarifying metrics and footnotes in the Geospatial Analysis inspector.
- **Input**: `assets: ForensicAsset[]`, `collective: CollectiveIntelligenceResult`
- **Behavior**:
  - In `ChronologicalStoryCard.tsx`:
    - `useEffect` fetches `fetchOsrmRouteDetails(waypoints)`.
    - Updates local state with `{ totalRoadDistance, legDistances }`.
    - Passes metrics into `generateChronologicalBatchStory`.
  - In `CombinedIntelligenceCard.tsx` (Geospatial Analysis tab):
    - Relabels "Total Travel Distance" to "Cumulative Displacement" (*Perpindahan Garis Lurus Kumulatif*).
    - When OSRM route is resolved, adds adjacent metric: "Estimated Road Route" (*Estimasi Rute Jalan*).
    - Fixes the footnote:
      - If road route resolved: displays attribution to OSRM road network estimation.
      - If only displacement available: displays clear attribution to direct coordinate displacement.
    - In pairwise jumps list: shows displacement distance and, if available, road route distance.
- **Output**: Cohesive, unambiguous web UI with zero contradictory statements.
- **Failure**: If OSRM fails or user is offline, inspector cleanly displays displacement metrics only with accurate displacement footnote.
- **Method**: Integration / Component testing
- **Verification**: Component/integration tests and browser verification verifying dual-metric display, accurate footnotes, and offline fallback.
- **Commit**:
  - `feat: integrate osrm route details into story card and realign geospatial inspector`

### BP-DUALDIST-004: CLI Runner and Formatter Realignment
- **Serves**: Parity between CLI and Web across both narrative stories and tabular collective intelligence.
- **Input**: `assets: ForensicAsset[]`, CLI options
- **Behavior**:
  - In `src/cli/runner.ts`:
    - `processBatchAssets` asynchronously fetches `fetchOsrmRouteDetails(waypoints)` with short timeout.
    - Passes resolved road metrics into `generateChronologicalBatchStory` and formatters.
    - Catches network/offline errors without failing the CLI command.
  - In `src/cli/formatter.ts`:
    - Displays both "Cumulative Displacement" and "Estimated Road Route" (if resolved).
    - Aligns label naming with the web inspector.
- **Output**: Terminal/markdown batch report reflecting dual-distance metrics.
- **Failure**: Network failure falls back to displacement-only without nonzero exit code.
- **Method**: TDD
- **Verification**: `tests/cli/cli.test.ts` testing batch CLI execution online and offline.
- **Commit**:
  - `test: test cli batch runner and formatter with dual distance and offline fallback`
  - `feat: enable dual-distance road route resolution in cli runner and formatter`

## Non-Goals
- **No network calls in core domain**: `src/core/` remains 100% pure, synchronous, and offline.
- **No speculative route claims**: Never claim a distance is road-based unless OSRM was evaluated and succeeded.
- **No blocking execution**: Network timeouts or failures must never crash or stall the application.
