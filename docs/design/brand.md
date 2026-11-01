---
title: "Brand Design SOT: ExifSense"
type: reference
status: active
related_code:
  - index.html
  - src/css/main.css
  - src/css/intro.css
  - src/css/dashboard.css
  - src/css/expert.css
  - src/css/history.css
  - src/css/guide.css
  - src/css/modal.css
last_updated: 2026-10-30
---

# Brand Design SOT: ExifSense

## Brand & Positioning

ExifSense ("EXIF Image Metadata, Made Easy for Everyone") is a browser-native photo metadata and privacy tool that translates raw camera settings, timestamps, and geolocation tags into clear, human-readable narratives.

- **What it is**: An approachable, trustworthy, zero-server tool that helps everyday users, photographers, travelers, and privacy-conscious individuals understand the story behind their photos and strip sensitive metadata before sharing.
- **What it is not**: An intimidating, jargon-heavy "forensic intelligence" terminal reserved for security specialists, or a cloud SaaS that uploads user photos to remote servers.
- **Tone & Copy**: Clear, human-readable, and welcoming across all three supported languages (English `en`, Bahasa Indonesia `id`, and Arabic `ar` with RTL support). Technical concepts are explained through plain cause-and-effect narratives rather than raw tag dumps alone.

## Target User & Context

- **Users**: Everyday people checking what data their phone photos expose, photographers reviewing optical/exposure settings across a shoot, and travelers mapping geotagged journeys.
- **Core Jobs**:
  1. Inspect a single image's metadata, location, and modification history in plain language.
  2. Compare a batch of images side-by-side with combined timeline and route reconstruction.
  3. Sanitize sensitive metadata (GPS, device info, camera settings, timestamps) for single or batch files with live privacy feedback before downloading.
- **Constraints**: Works across desktop and mobile viewports (`360x640` to `1280x800+`), 100% offline/client-side processing, and instant switching between `en`, `id`, and `ar`.

## Generic Baseline to Avoid

- Avoid pseudo-military or cyber-forensic clichés ("Forensic Intelligence", neon green terminal text, intimidating legalese).
- Avoid purple-blue AI gradients, glassmorphic rainbow blobs, or unstyled raw EXIF key-value tables with no human context.
- Avoid hardcoded English strings that break when switching to Bahasa Indonesia or Arabic.

## Design Decisions

- **Color Palette**: Monochromatic obsidian dark theme with warm stone highlights:
  - Background Primary (`--bg-main`): `#0b0b0c` with subtle radial dot grid
  - Surface / Card (`--bg-card`, `--bg-surface`): `#131415`
  - Secondary Surface (`--secondary`): `#1c1d1f` (hover `#2b2c2f`)
  - Border (`--border-color`): `#222325`
  - Primary Action (`--primary`): `#ffffff` (text `#0b0b0c`)
  - Purposeful Accent (`--accent`): `#e5e0d8` (warm stone)
  - Text (`--text-main` `#ffffff`, `--text-muted` `#8a8b8c`)
  - Semantic Status: Safe/Geo `#22c55e` / `#10b981`, Warning `#f59e0b`, Danger/Remove `#ef4444`, Sanitized Badge `#60a5fa`
- **Typography**:
  - UI & Headings (`--font-sans`): `Space Grotesk` (400, 500, 600, 700)
  - Technical Values, Coordinates & Hashes (`--font-mono`): `JetBrains Mono` (400, 500)
- **Layout Hierarchy**:
  - **Header**: Sticky top bar with `EXIFSENSE` logo, Guide button, Language selector (`EN` / `ID` / `AR`), contextual Export dropdown, Analyze New button, and Sanitize Metadata primary CTA.
  - **Home (`#/`)**: Hero section with badge (`hero_badge`), two-tone title (`hero_title_part1` + `hero_title_span`), friendly description (`hero_desc`), and primary/outline CTAs (`Start Exploring`, `Review History`), followed by the unified Action Zone (`New Analysis` and `History` tabs), mode toggle (`Single Asset`, `Batch Analysis`, `Remove Metadata`), dropzone with mode description, technical advisory callout, and 4-card Bento feature grid (`Automatic Image Analysis` 2-col first, `Secure by Design` 1-col second, `Spoofing Protection` 1-col third, `Metadata Sanitization` 2-col fourth).
  - **Guide (`#/guide`)**: 3-tab card (`Overview`, `Navigation`, `Features`) rendering structured `.guide-feature-item` cards and CTA buttons directly from locale keys.
  - **Dashboard (`#/dashboard`)**: Full-width interactive Leaflet map card on top (with route toggle, GPS coordinates bar, and external map links), Combined Metadata Insights card (for batch mode), and a 2-column grid (Left: Source File card with actual image preview and basic file/hash info; Right: Individual Asset Analysis narrative tabs + categorized raw metadata cards).
  - **Sanitizer Studio (`#/sanitize`)**: 2-column studio layout (Left: batch indicator/selector ribbon, Source File image preview, and Geospatial mini-map with privacy blur overlay when GPS removal is active; Right: Quick Presets, Selective Metadata Controls with live tag summaries, reactive Image Privacy Analysis card, reactive Metadata Preview tabs, and Cancel/Download actions).

## Non-Goals

- Cloud storage, user accounts, or server-side image processing.
- Light-mode theme toggling (the brand is intentionally anchored in a single high-contrast dark studio palette).
