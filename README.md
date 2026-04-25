# ExifSense
### Professional Asset Intelligence and Forensic Visualization

ExifSense is an advanced, browser-native forensic platform designed to transform raw image metadata into comprehensive investigative intelligence.

> "Standard EXIF viewers provide a list of tags. ExifSense provides a narrative."

Built for forensic analysts, private investigators, and digital archeologists, ExifSense bridges the gap between technical data extraction and human-readable storytelling.

---

## Core Pillars

### 1. Absolute Privacy (Local-First)
Metadata is sensitive evidence. ExifSense ensures 100% of the extraction, processing, and narrative generation happens locally in your browser. No assets or metadata are ever uploaded to a server, maintaining an air-tight Chain of Custody and data privacy.

### 2. Forensic Storytelling (Narrative Engine)
Standard EXIF viewers provide a list of tags. ExifSense provides a narrative. Our specialized engine analyzes technical parameters (shutter speed, aperture, focal length, and geolocation) to generate human-readable expert advice, identifying hardware consistencies, potential metadata spoofing, and optical characteristics.

### 3. Geospatial Movement Intelligence
Beyond simple pins on a map, ExifSense utilizes the OSRM (Open Source Routing Machine) to calculate realistic road-based movement between assets. It reconstructs the subject's path across the globe, revealing travel patterns that simple coordinates cannot show.

---

## Key Features

### Advanced Forensic Extraction
*   **Hardware Profiling**: Comprehensive analysis of technical device signatures, including manufacturer (Make), specific device model, and firmware/software versions used to capture the asset.
*   **Optic & Exposure Intelligence**: Deep technical extraction of internal camera settings such as Aperture (F-Stop), ISO Sensitivity, Shutter Speed, and Focal Length. This data is critical for identifying specific environmental lighting conditions and optical characteristics.
*   **Chronological Verification**: Sophisticated cross-referencing between the external file system's "Last Modified" time and the internal EXIF "Date/Time Original" tags. This identifies potential chronological discrepancies or metadata manipulation.

### Geospatial Dashboard
*   **Interactive Multi-Pin Mapping**: A high-fidelity visualization layer that renders all loaded assets simultaneously. Each marker provides a high-resolution preview and quick access to precise GPS coordinates.
*   **Road-Following Path Reconstruction**: Leverages the OSRM (Open Source Routing Machine) API to calculate the most probable road-based route between a sequence of geo-tagged assets, moving beyond simple "as-the-crow-flies" lines.
*   **Reverse Geocoding**: Automated conversion of raw latitude and longitude coordinates into human-readable physical addresses using the Nominatim engine, providing immediate context to the location data.

### Expert Analysis & Batch Logic
*   **Cross-Asset Batch Correlation**: Automated logical engine that scans multiple files to identify shared technical signatures. It can confirm if a set of evidence originated from a single unified source or multiple distinct devices.
*   **Velocity Warning System**: An intelligent safeguard that calculates the travel speed between consecutive geospatial points. If the distance covered exceeds realistic human travel capabilities for the given time gap, the system flags the asset for potential metadata spoofing.

### Scalable Internationalization (i18n)
*   **Decoupled JSON Dictionary**: A modular architecture where UI strings and forensic narratives are stored in external JSON files. This allows for near-instant application of new languages without modifying the core logic.
*   **Seamless Dynamic UI**: Implements a real-time translation engine that updates all dashboard components—including complex expert narratives—instantly upon language switch without requiring a page reload.

### Unified Reporting Suite
Generate professional, investigation-ready reports in various standardized formats:
*   **PDF**: A highly formatted, print-ready document featuring the full forensic narrative, geospatial data, and detailed metadata tables for formal presentation.
*   **Markdown**: A lightweight, version-control-friendly format designed for developers and technical documentation repositories.
*   **JSON**: A structured data export containing all extracted forensic intelligence, optimized for automated parsing by other security or GIS software.
*   **CSV**: A tabular dataset format tailored for data analysts and investigators who require spreadsheet-based correlation and auditing.
*   **Plain Text**: A simplified, high-readability summary optimized for quick evidence review and internal briefings.

---

## Technology Stack & Architecture

ExifSense is built with a modular vanilla architecture to ensure maximum performance and longevity without the bloat of modern frameworks.

*   **Core Engine**: Vanilla JavaScript (ES6+) with a decoupled module system.
*   **EXIF Processing**: [Exifr](https://github.com/MikeKroz/exifr) for high-performance metadata parsing.
*   **Mapping**: [Leaflet.js](https://leafletjs.com/) with custom road-routing integration via OSRM.
*   **Visual Interface**: Custom CSS system focusing on an Industrial-Noir aesthetic.
*   **Storage**: Browser-native `localStorage` for secure session persistence and history.

---

## Usage Workflow

1.  **Launch**: Open `index.html` in a modern browser.
2.  **Import**: Drag and drop single or multiple assets into the investigation zone.
3.  **Analyze**: Review the forensic narratives and geospatial movement path.
4.  **Export**: Download findings in the preferred format for formal documentation.

---

## Technical Security Note
ExifSense is designed for read-only forensic analysis. It does not modify source files. While it provides high-fidelity analysis, it should be used as a supplementary tool alongside certified hardware forensic suites for judicial proceedings.

---

## Getting Started

ExifSense is a zero-server, browser-native application. To begin:

1.  **Clone or Download** the repository to your local machine.
2.  **Open** `index.html` in any modern web browser.
3.  **Drag & Drop** your assets into the investigation zone.

*Note: An active internet connection is recommended for geospatial tile rendering and road-following path reconstruction.*

## Project Structure

```text
├── index.html          # Main Entry Point
├── src/
│   ├── css/            # UI System & Styling
│   ├── locales/        # i18n Dictionaries (JSON)
│   └── js/
│       ├── app.js      # Core Application Orchestrator
│       ├── i18n.js     # Internationalization Engine
│       ├── mapping.js  # Geospatial & Routing Logic
│       ├── narratives.js # Narrative Intelligence Engine
│       ├── export.js    # Multi-format Export Logic
│       ├── history.js   # Local Persistence Management
│       └── utils.js     # Shared Technical Utilities
```

## License

Distributed under the MIT License.

---

Developed for high-precision digital forensics. **Sense the data behind the pixels.**
