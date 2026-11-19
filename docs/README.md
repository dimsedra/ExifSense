# ExifSense Documentation

Catalog of technical documentation and design references for ExifSense.

## Intent

- [Intent: Chronological Batch Narrative](./intent/20261031_chronological_batch_narrative.md) — Transforming multi-image batch analysis from fragmented metadata audit tabs into a chronological, narrative-first storyline with optional evidence.
- [Intent: CLI Analysis and Simulation Harness](./intent/20261102_cli_analysis_simulation.md) — Direct command-line interaction and persistent JSON simulation harness for rapid stress testing, edge-case simulation, and narrative quality evaluation outside the browser UI.
- [Intent: Dual-Distance Narrative (Displacement vs Road Route)](./intent/20261103_dual_distance_displacement_and_road_route.md) — Distinguishing straight-line coordinate displacement from estimated road travel distance in batch chronological narratives.
- [Intent: Batch Macro Narrative Synthesis and Evidence Inspector](./intent/20261103_batch_narrative_synthesis.md) — Unifying batch macro narrative insights into Chronological Story lead with natural date formatting while repositioning Combined Analysis as a focused technical evidence inspector.
- [Intent: CLI Local OSRM Provisioning for Fully Air-Gapped Environments](./intent/20261103_cli_local_osrm_provisioning.md) — Automated CLI helper commands to download and run regional OSRM containers locally for offline, privacy-first forensic operations.
- [Intent: CLI File Hash Inspection for Forensic Integrity](./intent/20261105_cli_file_hash_inspection.md) — Dedicated lightweight CLI hashing command to record baseline pre-analysis hashes and verify post-analysis file immutability without external tools.
- [Intent: CLI Single-Asset Web Parity](./intent/20261114_cli_single_analysis_web_parity.md) — Aligning `exifsense single` output 1:1 with the Web single-asset dashboard across all 7 narratives, live Nominatim place name resolution, file info, and all 8 categorized raw EXIF groups.
- [Intent: Drop Arabic Locale and RTL Support](./intent/20261114_drop_arabic_locale_and_rtl.md) — Restricting localization strictly to English (`en`) and Bahasa Indonesia (`id`) and removing all Arabic translations and RTL layout scaffolding.
- [Intent: CLI Batch Analysis Web Parity](./intent/20261114_cli_batch_analysis_web_parity.md) — Aligning `exifsense batch` and batch `scenario` output 1:1 with the Web batch dashboard across live Nominatim reverse geocoding, Chronological Story, Combined Analysis evidence tables, localization, and an opt-in `--detailed` flag.
- [Intent: Factual Narrative Cleanup and Dual-Distance Export Parity](./intent/20261119_factual_narrative_cleanup_and_dual_distance_parity.md) — Removing dead keys and legacy manipulation heuristics, making missing-metadata and template narratives strictly factual across `en`/`id`, and surfacing OSRM dual-distance inside `combined_geo_*` across Web and exports.

## Blueprint

- [Blueprint: Chronological Batch Narrative](./blueprint/20261031_chronological_batch_narrative.md) — Deep module architecture and contracts for chronological batch narrative generation and UI evidence anchors.
- [Blueprint: CLI Analysis and Simulation Harness](./blueprint/20261102_cli_analysis_simulation.md) — Architecture, contracts, and verification strategy for headless command-line execution and persistent scenario fixtures.
- [Blueprint: Dual-Distance Narrative (Displacement and Road Route)](./blueprint/20261103_dual_distance_narrative.md) — Architecture, contracts, and verification for OSRM leg distance extraction and dual-distance narrative formatting across Web and CLI.
- [Blueprint: Batch Macro Narrative Synthesis and Evidence Inspector](./blueprint/20261103_batch_narrative_synthesis.md) — Architecture, contracts, and verification for unified macro story baseline with natural date formatting and collapsible evidence inspector.
- [Blueprint: CLI File Hash Inspection](./blueprint/20261105_cli_file_hash_inspection.md) — Technical architecture, contracts, and TDD verification strategy for the dedicated `exifsense hash <path...>` CLI command.
- [Blueprint: CLI Single-Asset Web Parity](./blueprint/20261114_cli_single_analysis_web_parity.md) — Module boundaries, contracts, and verification plan for 1:1 parity between `exifsense single` and the Web single-asset dashboard.
- [Blueprint: Drop Arabic Locale and RTL Support](./blueprint/20261114_drop_arabic_locale_and_rtl.md) — Contracts, verification methods, and atomic commit plan for removing `ar` translations, RTL layout support, and CLI `--locale ar` handling.
- [Blueprint: CLI Batch Analysis Web Parity](./blueprint/20261114_cli_batch_analysis_web_parity.md) — Module boundaries, contracts, and verification plan for 1:1 parity between `exifsense batch`, Web batch views, Nominatim enrichment, and `--detailed`.
- [Blueprint: Factual Narrative Cleanup and Dual-Distance Export Parity](./blueprint/20261119_factual_narrative_cleanup_and_dual_distance_parity.md) — Contracts and verification plan for removing legacy manipulation heuristics and dead keys, localizing uniform missing-metadata alerts, and surfacing OSRM dual-distance in `combined_geo_*` across Web and exports.

## Design

- [Brand Design SOT: ExifSense](./design/brand.md) — Brand positioning, target user context, visual system, and layout hierarchy across all views.

## Decisions

- [ADR-001: Restrict Localization Strictly to English and Indonesian Without RTL](./decisions/adr_001_drop_arabic_locale_and_rtl.md) — Rationale, alternatives, and consequences for dropping Arabic (`ar`) localization and RTL layout infrastructure.
- [ADR-002: Exclude Metadata Sanitization From ExifSense CLI and Use Standalone ExifTool for Research Datasets](./decisions/adr_002_exclude_metadata_sanitization_from_cli.md) — Decision to keep ExifSense CLI read-only and zero-dependency while using host-installed `exiftool` for selective multi-format research dataset sanitization.

## Lesson

- [Lesson: Haversine Algorithm and OSRM Road Routing](./lesson/haversine_and_osrm/haversine_and_osrm.md) — Intuitive mental models and mathematical mechanics of great-circle displacement versus road network routing in batch analysis.

## Report

- [Report: Peta Audit dan Depresiasi Narasi ExifSense](./report/20261119_narrative_deprecation_mapping.html) — Comprehensive audit mapping of 26 dead narrative keys, legacy manipulation heuristic alerts, and neutrality/parity alignments between the original proposal and the current thesis reframing.
- [Report: Telaah Paper Padilha dkk. (2022)](./report/20261119_padilha_et_al_2022_temporal_metadata.html) — ELI5 summary, quantitative experiment benchmarks, and thesis relevance analysis of *Content-Aware Detection of Temporal Metadata Manipulation* (IEEE TIFS, 2022).
