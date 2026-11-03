---
title: "Intent: Dual-Distance Narrative (Displacement vs Road Route)"
type: intent
last_updated: 2026-11-03
---

# Intent: Dual-Distance Narrative (Displacement vs Road Route)

## The Goal
When describing movement between consecutive photos in a chronological batch analysis, provide two distinct, clearly labeled distance metrics instead of a single ambiguous number:
1. **Straight-line displacement** (objective Euclidean/great-circle distance directly between EXIF coordinates).
2. **Estimated road route distance** (inferred transit distance following real-world road networks via OSRM, when road transit is viable and available).

Example format:
> `732.jpg was captured 35 minutes later, approximately 16.3 km in straight-line displacement (or ~21.5 km via road route) from 731.jpg.`

## The Rationale
The current chronological narrative only outputs a single distance figure calculated with the Haversine formula. In forensic and investigative contexts, this creates ambiguity:
- A straight line across a bay or mountain pass might only be 15 km, but driving around the bay or through mountain valleys could be 60 km.
- Readers or investigators might mistake straight-line displacement for actual driving distance, skewing transit velocity analysis and plausibility assessments.
- Explicitly separating displacement (spatial truth) from road route (transit inference) clarifies what is mathematically measured versus what is probabilistically estimated.

## What We Want
- **Clear terminology and separation**: Always distinguish straight-line displacement from road-following transit so the reader immediately understands the difference between coordinate displacement and road travel.
- **Graceful degradation (conditional road route)**: Straight-line displacement is always calculated locally and reported as baseline ground truth. Road route is appended conditionally (`or ~X km via road route`) only when road data is available.
- **Robustness in non-road environments**: If photos are taken on a flight, boat trip, hiking trail, or in an area without road networks, omit the road route portion cleanly without errors or confusing placeholders.
- **Preserved core architecture (Pure functions)**: Keep `src/core/narratives/chronological.ts` pure and synchronous. Pre-fetch or resolve OSRM road distance at the system boundary (in UI components or CLI runners), then pass it into the narrative generator as optional data. Core logic must remain decoupled from HTTP network calls.

## What We Do NOT Want
- **No network calls in core domain logic**: Do not turn `generateChronologicalBatchStory` into an async function or embed `fetch` calls inside domain logic.
- **No false certainty**: Never represent OSRM road distance as an authoritative or recorded GPS tracklog. It must always be presented as an estimate or probable route.
- **No blocking or failure on network issues**: Network errors, OSRM rate limits, or offline usage must never block narrative generation or crash the application.
