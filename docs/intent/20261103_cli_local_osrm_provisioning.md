---
title: "Intent: CLI Local OSRM Provisioning for Fully Air-Gapped Environments"
type: intent
last_updated: 2026-11-03
---

# Intent: CLI Local OSRM Provisioning for Fully Air-Gapped Environments

## The Goal
Provide a streamlined CLI helper command in ExifSense (e.g., `exifsense osrm setup <region>` or `exifsense osrm start`) that automates provisioning and managing a local, self-hosted OSRM container for any desired geographic region. This enables forensic investigators and analysts to run ExifSense 100% locally—both via CLI and Web localhost—with zero network leakage and absolute data privacy.

## The Rationale
In high-security forensic labs and criminal investigations, devices handling evidentiary photos are frequently operating in air-gapped environments (computers physically isolated from the internet). 
- Currently, ExifSense relies on public demo APIs (`router.project-osrm.org`) for road route estimation. In a secured forensic setting, querying external public APIs is forbidden because it leaks coordinates and investigation timelines to third parties.
- While running OSRM locally via Docker is lightweight and technically straightforward for regional extracts, manually locating Geofabrik `.osm.pbf` URLs, running multiple Docker commands (`osrm-extract`, `osrm-partition`, `osrm-customize`, `osrm-routed`), and configuring ports introduces unnecessary operational friction for non-DevOps analysts.
- Automating this via a simple CLI helper lowers the barrier to entry, transforming ExifSense into a turn-key, enterprise-grade, privacy-first forensic tool for the open-source community.

## What We Want
- **Simple, region-agnostic provisioning**: An intuitive CLI command where an investigator can specify a country or region (e.g. `exifsense osrm setup scotland` or `exifsense osrm setup indonesia`) to download the corresponding Geofabrik extract and prepare the routing files locally.
- **Air-gapped readiness**: Once regional data is provisioned, ExifSense can operate completely offline with no network calls leaving the machine.
- **Zero-friction container lifecycle**: Simple subcommands to start, stop, or check the status of the local OSRM Docker container (e.g. `exifsense osrm start`, `exifsense osrm stop`, `exifsense osrm status`).
- **Seamless integration with ExifSense runner**: When the local OSRM container is active on `localhost:5000`, the CLI and Web UI should automatically detect it or seamlessly bind to it.
- **Clear open-source roadmap placement**: Position this as an open-source tool improvement roadmap for ExifSense, clearly isolated from thesis evaluation constraints.

## What We Do NOT Want
- **No thesis scope creep**: Do not include container orchestration or multi-region downloader complexity within the scope of the thesis manuscript, which stays strictly focused on the forensic timeline reconstruction methodology and the DSTL Scotland 2019 dataset.
- **No breaking of default behavior**: Never force users to run a local OSRM instance. The public demo server remains the default out-of-the-box fallback when no local instance is detected.
- **No custom Docker daemon implementation**: Do not reinvent container management; use standard Docker / Podman commands or lightweight docker-compose wrappers under the hood.
- **No accidental monolithic global map downloads**: Never prompt or accidentally trigger downloading the entire planet OSM file (~60GB+ PBF requiring 256GB+ RAM). Defaults and guided workflows should steer toward regional extracts, but the system should not artificially forbid global downloads if an advanced user with enterprise hardware explicitly and deliberately requests it.
