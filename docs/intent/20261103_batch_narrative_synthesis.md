---
title: "Intent: Batch Macro Narrative Synthesis and Evidence Inspector"
type: intent
last_updated: 2026-11-03
---

# Intent: Batch Macro Narrative Synthesis and Evidence Inspector

## The Goal
Unify the high-level macro insights of batch photo analysis into a single, cohesive, natural opening narrative inside `ChronologicalStoryCard`. The user immediately grasps the entire session context—who (hardware), when (natural formatted timeline span), where (travel distance and area spread), and data integrity—before diving into the step-by-step journey. Meanwhile, `CombinedIntelligenceCard` shifts its role strictly to a deep technical evidence inspector (visualizations and matrix tables) without repeating narrative paragraphs.

## The Rationale
Currently, there is redundancy and friction between the two batch cards. The Chronological Story opens with a lone baseline statement about camera hardware, while the Combined Analysis card below it contains repetitive text paragraphs across four isolated tabs (Timeline, Geospatial, Hardware, Integrity). 

Furthermore, timestamps in the Combined Analysis narrative (such as `19-03-2019 18:01:04`) are presented in raw, mechanical formats that clash with the localized, human-friendly date format already used in the chronological steps (e.g., `Tuesday, March 19, 2019 at 18:01:04`). Moving the macro synthesis into the story opening eliminates redundancy, while letting the tabbed visualizations act purely as verifiable forensic proof.

## What We Want
- **Unified Macro Narrative Opening**:
  In the lead baseline of `ChronologicalStoryCard`, synthesize the session facts into a natural, flowing overview:
  - Hardware consistency and device identity (e.g., "All photos in this batch were captured using the same camera device: LGE Nexus 5X").
  - Natural timeline span (e.g., "All photos were taken within a span of 17.6 hours, starting from Tuesday, March 19, 2019 at 18:01:04 to Wednesday, March 20, 2019 at 11:38:31").
  - Total travel distance and movement spread (e.g., "Location spread shows the photographer traveled about 178.3 km while taking these photos").
  - Overall metadata integrity status across the batch.
- **Natural Human Date Formatting**:
  Replace all mechanical date formats (`DD-MM-YYYY HH:mm:ss`) with localized, human-friendly full date and time strings matching the chronological steps format (e.g., `Tuesday, March 19, 2019 at 18:01:04`).
- **Repositioning Combined Analysis as Evidence Inspector**:
  Retain all custom UI component visualizations (integrity presence matrix table, camera hardware groupings, timeline jump intervals, geospatial jump breakdown) inside `CombinedIntelligenceCard`. Remove the redundant long narrative paragraphs so each tab functions cleanly as an interactive audit tool and proof receipt.

## What We Do NOT Want
- **No premature deletion of UI visualizations**: Do not discard the custom visual components, jump cards, or matrix tables in `CombinedIntelligenceCard`. They remain essential for detailed forensic audit.
- **No cluttered timeline steps**: Do not push macro session conclusions into individual step items; keep macro synthesis strictly in the opening lead overview.
- **No raw unparsed timestamps**: Never show raw, unformatted date strings in human-facing narrative sentences.
- **No duplicate storytelling**: Do not maintain identical or competing narrative paragraphs across both cards.
