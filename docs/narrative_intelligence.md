# ExifSense Narrative Intelligence & Expert System Documentation

## Overview
ExifSense uses a rule-based Expert System (Narrative Intelligence) to transform raw, intimidating EXIF metadata into human-readable forensic insights. Instead of just listing numbers, the system analyzes patterns, assesses data integrity, and generates contextual narratives.

This document maps out the current implementation details of `src/js/narratives.js` to help determine the comprehensiveness of the system and guide future refinements.

---

## 1. Core Architecture
The system follows an **Inference Engine + Knowledge Base** pattern:
- **Inference Engine (`src/js/narratives.js`)**: Evaluates rules against extracted EXIF properties.
- **Knowledge Base (`src/locales/[lang].json`)**: Contains the parameterized narrative templates.

---

## 2. Logic Map: Individual Asset Analysis

### A. Hardware & Software Integrity
**Function:** `generateHardwareNarrative(props)`
- **Inputs:** `Make`, `Model`, `LensModel`, `Software`.
- **Heuristics & Rules:**
  - Checks if the `Software` string contains known editing tools: `['adobe', 'photoshop', 'lightroom', 'gimp', 'canva', 'snapseed', 'pixlr', 'corel', 'affinity', 'picsart']`.
- **Outcomes:**
  - *Standard:* Returns device details + confidence in standard hardware profile.
  - *Modified:* Flags the asset with: *"Note: Processing artifacts from [Software] were detected, indicating potential forensic alteration."*

### B. Exposure & Intelligent Lighting Analysis
**Function:** `generateExposureNarrative(props)`
- **Inputs:** `FNumber`, `ExposureTime`, `ISO`, `ExposureProgram`.
- **Heuristics & Rules:**
  - **Shallow Depth of Field:** Triggered if Aperture (`FNumber`) < `2.8`.
  - **Low-Light Environment:** Triggered if `ISO` ≥ `800`.
  - **Bright/Daylight Environment:** Triggered if `ISO` ≤ `200` AND Shutter Speed (`ExposureTime`) ≤ `0.002s` (1/500s).
  - **Standard:** Fallback for balanced lighting.

### C. Optics & Perspective
**Function:** `generateOpticsNarrative(props)`
- **Inputs:** `FocalLength`, `FocalLengthIn35mmFormat`, `DigitalZoomRatio`.
- **Heuristics & Rules:**
  - Detects if digital zoom was applied (`DigitalZoomRatio` > 1).
- **Outcomes:** Explains the focal perspective and warns about digital enlargement.

### D. Timeline & Chronological Integrity
**Function:** `generateTimelineNarrative(props)`
- **Inputs:** `DateTimeOriginal`, `CreateDate`, `DateTime`, `ModifyDate`.
- **Heuristics & Rules:**
  - Compares the primary capture date (`DateTimeOriginal`) against the file modification date (`ModifyDate`).
- **Outcomes:**
  - *Consistent:* *"Chronological integrity appears consistent."*
  - *Inconsistent:* Flags potential post-processing/timestamp manipulation.

### E. Geospatial Analysis
**Function:** `generateGeospatialNarrative(lat, lng, locationData)`
- **Inputs:** `GPSLatitude`, `GPSLongitude`, Reverse Geocoding results.
- **Outcomes:** Maps coordinates to physical locations and asserts baseline coordinate precision (spoofing check).

---

## 3. Logic Map: Batch / Cross-Asset Analysis
**Function:** `generateCombinedAnalysis(assets)`

### A. Hardware Consistency
- **Logic:** Compares `Make` and `Model` across all uploaded files.
- **Outcomes:**
  - *Consistent:* Suggests a unified source/single operator.
  - *Discrepancy:* Flags cross-device capture (collaborative efforts).

### B. Chronological Sequence
- **Logic:** Sorts assets by capture time and calculates the total time span (`diffHours`).
- **Outcomes:** Generates a timeline summary from start to finish.

### C. Geospatial Proximity & Travel Logic
- **Logic:** Calculates the maximum Haversine distance between any two points.
- **Outcomes (Clustering):**
  - `< 50m`: **Highly concentrated** (Stationary capture).
  - `< 1km`: **Localized operation** (Pedestrian scale).
  - `> 1km`: **Geographic trail** (Mobile transit).

### D. Velocity Guardrail (Physical Impossibility Check)
- **Logic:** Checks sequential assets: `Speed = Distance / Time Difference`.
- **Threshold:** If calculated speed > **1200 km/h** (approx. Mach 1).
- **Outcome:** Triggers a high-severity warning: *"Warning: Impossible velocity detected. Potential metadata spoofing."*

---

## 4. Comprehensiveness & Gap Analysis (Refinement Roadmap)

| Module | Current State | Comprehensiveness | Suggested Refinement |
| :--- | :--- | :--- | :--- |
| **Tampering** | Basic string matching on `Software` | 🟡 Low-Medium | Add ELA (Error Level Analysis) or deep parsing of vendor-specific MakerNotes (e.g., Apple/Samsung signatures). |
| **Environment** | Simple ISO/Aperture thresholds | 🟢 Medium | Integrate machine learning for scene classification or cross-reference weather APIs based on GPS+Time. |
| **Spoofing** | Checks for impossible speed | 🟡 Medium | Detect "perfect" coordinates (e.g., exactly 0.0 or overly precise strings), which often indicate spoofing. |
| **Metadata Stripping** | Reports empty EXIF | 🟢 High | Provide "reconstruction hints" based on file structure even if EXIF is missing. |


## 5. Critical Edge Cases & Cross-Group Validation (New Findings)

As the system matures, future architectural iterations must address isolated single-group restrictions by implementing defensive cross-group checks.

### A. Edge Cases to Mitigate
- **EXIF Date Compatibility:** EXIF dates use colons (`YYYY:MM:DD`). Standard `new Date()` constructs crash or output `Invalid Date` on V8 strict platforms (e.g., Safari).
- **False Positives on OS Modification:** Relying on `FileModifyDate` vs `DateTimeOriginal` flags standard copying operations (SD cards/Google Drive) as tampering alerts falsely.
- **Computational Image Bias:** Night mode/AI multi-framing overrides simple ISO calculations.

### B. Cross-Group Validation Roadmap
- **Timezone vs. Geospatial Integrity:** Map time coordinates against global solar positioning vectors (e.g. flagging a daylight timestamp positioned in a nighttime timezone).
- **Hardware Profile vs. Module Capability:** Prevent external telemetry hijacking (flagging Canon DSLRs containing built-in GPS tags).
- **Illumination Limits vs. Logical Clocks:** Audit exposure criteria against time signatures (ISO 100 on midnight timestamps).

## Next Steps for the User
This map indicates that while the **physical rules (velocity, time spans)** are solid, the **digital forensics (tampering detection)** rely on easily bypassable strings. Future refinements should focus on deeper byte-level signature verification.
