---
title: "Intent: Dual-Distance Narrative (Displacement vs Road Route)"
type: intent
last_updated: 2026-11-03
---

# Intent: Dual-Distance Narrative (Displacement vs Road Route)

## The Goal
Throughout all batch geospatial presentations (the Chronological Story macro lead, step-by-step transitions, and the Geospatial Analysis technical inspector), clearly distinguish and present two distinct, rigorously labeled distance metrics:
1. **Straight-line displacement** (objective Euclidean/great-circle distance calculated directly between EXIF coordinates via Haversine).
2. **Estimated road route distance** (inferred transit distance along real-world road networks via OSRM, when road transit is viable and available).

Example format in narrative:
> Macro baseline: `...covering approximately 11.8 km in cumulative straight-line displacement (or ~14.2 km via road route).`
> Step transitions: `732.jpg was captured 35 minutes later, approximately 16.3 km in straight-line displacement (or ~21.5 km via road route) from 731.jpg.`
> Geospatial Inspector: Explicitly display both **Cumulative Displacement** and **Estimated Road Route** (when resolved), with completely honest footnotes.

## The Rationale
Across current batch analysis views, distance calculation and labeling are inconsistent and contradictory:
- In `ChronologicalStoryCard` (lead and steps), the narrative presents a single distance number labeled as "total travel distance" or "away from", yet the number is strictly calculated via the Haversine formula (straight-line displacement).
- In `CombinedIntelligenceCard` (Geospatial Analysis tab), the UI labels the Haversine cumulative distance as "Total Travel Distance" and attaches a misleading footnote: `*Estimated distance based on the most probable road routes between the photos' locations.`, even though no road routing was performed.
- In forensic investigations, conflating straight-line displacement with road transit distance distorts velocity calculations and transit plausibility (e.g., straight-line across water vs driving around a bay).
- Aligning both views under the dual-distance paradigm ensures radical transparency: mathematical facts from EXIF coordinates are labeled as displacement, while algorithmic inferences from road graphs are labeled as estimated road routes.

## What We Want
- **Holistic alignment across views**: Apply dual-distance clarity consistently to:
  1. Chronological Story lead paragraph (macro session baseline).
  2. Chronological Story event steps (pairwise transitions).
  3. Combined Analysis Geospatial inspector (summary stats and pairwise jump list).
  4. CLI batch output formatters.
- **Clear terminology and separation**: Always distinguish coordinate displacement (*perpindahan garis lurus*) from road-following transit (*estimasi rute jalan*) so the user immediately understands what is coordinate math versus road network modeling.
- **Graceful degradation (conditional road route)**: Straight-line displacement is always calculated locally as baseline ground truth. Road route metrics are appended conditionally only when OSRM data is successfully resolved.
- **Honest technical labels and footnotes**: Fix the contradictory footnote in Geospatial Analysis. When showing Haversine distance, label it as displacement. Only mention road routes when OSRM routing has actually been evaluated.
- **Robustness in non-road environments**: If photos lack GPS or were captured in flight, on water, or off-road, omit the road route metric cleanly without errors or confusing placeholders.
- **Preserved core architecture (Pure functions)**: Keep domain modules in `src/core/` pure and synchronous. Pre-fetch OSRM road metrics at the boundary (UI components or CLI runner) and pass them as optional data.

## What We Do NOT Want
- **No network calls in core domain logic**: Do not embed `fetch` calls or async execution into `src/core/narratives/` or `src/core/forensics/`.
- **No contradictory labels**: Never claim a distance is based on road routes when it was calculated via Haversine.
- **No false certainty**: Never represent OSRM road distance as an authoritative or recorded GPS tracklog; it must remain clearly marked as an estimate.
- **No blocking or failure on network issues**: Network errors, rate limits, or offline environments must never crash or block batch analysis.
