---
title: "Intent: Chronological Batch Narrative"
type: intent
last_updated: 2026-10-31
---

# Intent: Chronological Batch Narrative

## The Goal
When analyzing a batch of photos, the user should primarily consume a natural, chronological story of events. The narrative answers what happened across the session—where it started, how much time passed, how far the photographer moved, and whether equipment changed—making the whole sequence easy to digest in seconds without having to parse raw technical data.

## The Rationale
The current batch view splits metadata into isolated category tabs (Integrity, Hardware, Timeline, Geospatial) and gives static aggregate numbers. It feels like an audit report that wraps metadata facts into words, rather than a human story. To understand what actually happened between photos, the user currently has to dig through individual asset tabs and reconstruct the timeline in their head.

## What We Want
- **Narrative-first experience**: The chronological story is the primary interface; raw metadata and technical details remain strictly optional supporting receipts.
- **Chronological event flow**: A natural sequence that establishes a baseline (e.g., shared camera body) and walks through each transition (time elapsed, distance moved, transit pace inference like walking vs motorized transit, and camera/lens adjustments).
- **Factual cause-and-effect**: State physical facts directly supported by metadata (e.g., "device changed from iPhone 13 to Canon EOS R5").
- **Natural handling of gaps**: When photos lack GPS or timestamps, weave those absences naturally into the story flow instead of throwing errors or breaking sequence.
- **Highlighted evidence anchors**: Visually distinguish factual references (filenames, timestamps, distances) with subtle highlighting so they stand out as receipts.

## What We Do NOT Want
- **No speculative inferences**: Do not guess social dynamics or human roles (e.g., never say "suggesting a second contributor"). Only state physical facts recorded in the metadata.
- **No premature deletion**: Do not remove or refactor the existing `CombinedIntelligenceCard` or individual inspection tabs yet. Keep them alongside the new narrative so we can evaluate them in practice.
- **No complex popover UI**: Keep evidence interaction open for now. Do not build heavy popovers or modal state machines; visual highlighting is enough at this stage.
- **No single-asset scope creep**: This work is strictly confined to multi-image batch analysis.
