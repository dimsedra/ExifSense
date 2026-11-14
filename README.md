<div align="center">

<h1>
  <img src="./public/favicon.svg" alt="ExifSense Logo" width="32" height="32" />&nbsp;ExifSense
</h1>

<h3>EXIF Image Metadata, Made Easy for Everyone</h3>

<img src="./assets/screenshots/hero.png" alt="ExifSense Hero Screenshot" width="100%" />

</div>

ExifSense translates raw image EXIF metadata, camera settings, and geolocation tags into clear, human-readable insights—100% locally on your device without sending a single byte to the cloud.

---

## Quick Start

### Web App (Local Development)

Requires Node.js 20 or newer.

1. **Clone** this repository and install dependencies:
   ```bash
   git clone https://github.com/dimsedra/ExifSense.git
   cd ExifSense
   npm install
   ```
2. **Start** the Vite dev server and open the local URL shown in your terminal:
   ```bash
   npm run dev
   ```
3. **Drag & Drop** your images to view detailed metadata, maps, and privacy sanitization locally.

### Standalone CLI & Agent Skill

If you only want terminal analysis without cloning the web application:

```bash
npm install -g exifsense-cli
# or run without installing globally:
npx --package=exifsense-cli exifsense --help
```

To equip AI coding agents with ExifSense CLI analysis instructions:

```bash
npx skills add dimsedra/ExifSense
```

---

## Key Benefits

### Human-Readable Insights (Cognitive Reducer)
Raw EXIF data often consists of obscure technical parameters such as aperture, exposure bias, and focal length. ExifSense automatically analyzes these attributes and presents them in plain, accessible language—explaining lighting conditions, lens choices, and capture history without requiring deep technical knowledge.

### Complete Local Privacy (Zero-Server Architecture)
Your photos and metadata remain entirely on your device. Extraction, narrative generation, mapping, and metadata removal are performed 100% locally in your browser to guarantee complete data confidentiality.

### Geospatial and Travel Route Visualization
Visualize photo capture locations on interactive maps. For collections taken across multiple locations, ExifSense reconstructs plausible road-following movement paths to help you trace travel journeys.

### One-Click Privacy Shield
Remove sensitive GPS coordinates, device identifiers, and metadata tags prior to sharing photos online, protecting personal privacy while maintaining original asset quality.

### Software Modification Detection
Identify post-processing signatures from common image editing software, timestamp discrepancies, and file extension mismatches to evaluate asset integrity.

---

## Core Features

| Feature | Description |
| :--- | :--- |
| **Single Image Analysis** | Detailed breakdown of camera hardware, optical settings, date history, and exact location. |
| **Batch Comparison** | Inspect multiple files simultaneously with side-by-side technical correlation and combined map views. |
| **Command-Line Interface** | Terminal-native execution harness for headless single-image, batch, hash, and EXIF extraction workflows. |
| **Forensic Hash Inspection** | Instant SHA-256 and SHA-1 calculation across single files, batches, or directories for non-destructive verification. |
| **Metadata Sanitization** | Selective or full removal of EXIF metadata categories with instant cleaned file downloads. |
| **Interactive Mapping** | High-fidelity map rendering with reverse geocoding to display physical addresses. |
| **Export Capability** | Export comprehensive reports as PDF, Markdown, CSV, or structured JSON data manifests. |
| **Multi-Language Support** | Full localization in English and Bahasa Indonesia. |

---

## Command-Line Interface (CLI)

ExifSense includes a standalone, terminal-native CLI executable (`exifsense`) that runs single-asset and batch forensic analyses directly from your shell with 1:1 output parity to the Web dashboard, completely bypassing the browser interface. When online, single and batch runs automatically enrich GPS coordinates with physical addresses via Nominatim reverse geocoding (sequentially paced for batches) and estimate driving distances via OSRM, falling back cleanly to numeric coordinates when offline.

### Setup

Install the standalone CLI package globally without the web application:

```bash
npm install -g exifsense-cli
```

Or run it directly without installing globally:

```bash
npx --package=exifsense-cli exifsense --help
```

Or add the agent skill so AI coding agents know how to use `exifsense-cli`:

```bash
npx skills add dimsedra/ExifSense
```

Or build and link from source:

```bash
npm install
npm run build:cli
npm link
```

### Usage

```bash
# Analyze a single photo or JSON metadata file (hashes, alerts, 7 narratives, 8 EXIF categories)
exifsense single photo.jpg

# Inspect cryptographic hashes (SHA-256 & SHA-1) across files or directories
exifsense hash photo1.jpg photo2.jpg
exifsense hash path/to/folder/ --format markdown --out manifest.md

# Analyze multiple photos (Alerts, Chronological Story, and 4 Combined Analysis evidence views)
exifsense batch photo1.jpg photo2.jpg photo3.jpg

# Include full per-asset single-file breakdowns at the end of a batch report
exifsense batch photo1.jpg photo2.jpg --detailed

# Extract raw EXIF metadata into a clean JSON file
exifsense extract photo.jpg metadata.json

# Format output as Markdown in Indonesian and write directly to a file
exifsense batch photo1.jpg photo2.jpg --locale id --format markdown --detailed --out report.md
```

### Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--locale <en\|id>` | Narrative and table language (`en` or `id`) | `en` |
| `--format <plain\|markdown>` | Output rendering format (`plain` text or `markdown`) | `plain` |
| `--detailed` | Append individual single-asset breakdowns (`exifsense single` output) to batch reports | `false` |
| `--out <path>` | Write output directly to a file instead of standard output | stdout |

### Output Structure

* **Single Analysis (`single`)**: Displays file metadata with SHA-256 and SHA-1 hashes, Integrity Alerts, all 7 Forensic Narrative sections, and all 8 Categorized EXIF Metadata groups.
* **Batch Analysis (`batch`)**: Follows the Web dashboard order with `Total Assets`, `Asset Integrity Alerts` (when anomalies exist), `Chronological Story`, and `Combined Analysis` (Integrity Matrix, 7-column Hardware Comparison table, Timeline bounds and gaps, and Geospatial metrics with adaptive `m`/`km` distances and road-route estimates).
* **Detailed Batch Mode (`--detailed`)**: Preserves the full batch summary above and appends `Individual Asset Analysis` (`ASSET 1` through `ASSET N`) in input order using single-asset formatting.

---

## Architecture & Technology

ExifSense is built with React 19, TypeScript, and Vite for the browser dashboard, sharing its core forensic, narrative, and geospatial modules with a standalone Node.js CLI bundled via Rolldown.

* **Web Stack**: React 19, TypeScript, Vite, and Zustand for client-side state.
* **CLI Bundle**: Rolldown-bundled Node.js 20+ executable (`exifsense-cli`) sharing the core analysis engine with zero external runtime dependencies.
* **EXIF Engine & Sanitization**: [Exifr](https://github.com/MikeKovarik/exifr) for multi-format metadata parsing (JPEG, TIFF, HEIC, DNG, RAW), plus `piexifjs` and Canvas re-encoding for client-side metadata removal.
* **Geospatial Mapping**: [Leaflet.js](https://leafletjs.com/) with OSRM road-routing and Nominatim reverse geocoding.
* **Document Generation**: [jsPDF](https://github.com/parallax/jsPDF) with `jspdf-autotable` for structured PDF reporting.
* **Storage & Persistence**: Browser-native `localStorage` for session history and language preferences, plus `IndexedDB` for local image preview caching.
* **Testing**: Vitest with `happy-dom`.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.


