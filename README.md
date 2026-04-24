# ExifSense 🛡️🔍
### The Gold Standard for Asset Intelligence & Forensic Visualization

**ExifSense** is a professional-grade, browser-based forensic tool designed to transform raw image metadata into actionable intelligence. Unlike traditional EXIF viewers, ExifSense focuses on **chronological storytelling** and **geospatial movement**, enabling investigators to track assets across time and space with precision.

---

## 🌟 Unique Selling Points (USP)

- **Investigation Path (Road-Following)**: Don't just see pins on a map. ExifSense calculates actual road-based routes between assets based on their chronological order, revealing the true movement of a subject.
- **Narrative Intelligence**: Automatically translates complex metadata into human-readable forensic reports. No more decoding technical hex codes; ExifSense tells you the "story" behind the data.
- **Privacy-First (Local Processing)**: 100% of the metadata extraction and analysis happens in your local browser. Your sensitive evidence never leaves your machine.
- **Adaptive Professional Interface**: A high-contrast, dual-mode UI (Light/Dark) designed for optimal visibility in any environment, from bright field investigations to long laboratory hours.
- **Batch Intelligence**: Analyze multiple assets simultaneously to correlate device usage, location clusters, and time-sync discrepancies.

## 🚀 Key Features

- [x] **Advanced EXIF Extraction**: Comprehensive analysis of Hardware, Optics, Exposure, and Geospatial tags.
- [x] **Chronological Timeline**: Visualize the investigation sequence with local 24-hour time formatting and GMT/UTC cross-referencing.
- [x] **Interactive Geospatial Dashboard**: Leaflet-powered maps with custom marker popups containing high-res previews and coordinates.
- [x] **History Management**: Persistent local history with high-resolution thumbnails for reviewing past sessions.
- [x] **Unified Reporting**: Export findings to PDF, Markdown, CSV, or Plain Text.
- [x] **Mobile Responsive**: Fully optimized for field use on mobile devices.

## 🛠️ Technology Stack

- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Mapping**: [Leaflet.js](https://leafletjs.com/) & [OSRM API](http://project-osrm.org/)
- **EXIF Engine**: [Exifr](https://github.com/MikeKroz/exifr)
- **Icons**: [Lucide Icons](https://lucide.dev/)
- **PDF Export**: [jsPDF](https://github.com/parallax/jsPDF) & [autoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)

## 📦 Getting Started

Since ExifSense is built with a "Zero-Server" philosophy, getting started is as simple as:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/exifsense.git
   ```
2. Open `index.html` in any modern web browser.
3. Drag and drop your investigation assets to begin.

*Note: An active internet connection is required for fetching map tiles and calculating driving routes.*

## 📂 Project Structure

```text
├── index.html          # Main Entry Point
├── src/
│   ├── css/            # UI System & Layouts
│   └── js/
│       ├── app.js      # Core Orchestrator
│       ├── mapping.js  # Geospatial & Routing Logic
│       ├── narratives.js # Narrative Intelligence Engine
│       ├── history.js   # Local Persistence Management
│       └── ...
└── scratch/            # Private Developer Notes (Ignored by Git)
```

## 📜 Roadmap

- [ ] Street View Snapshot Integration
- [ ] Heatmap Intelligence View
- [ ] Video Metadata Expansion (MP4/MOV)
- [ ] Digital Signature & Hash Verification

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Developed for high-precision digital forensics. **Sense the data behind the pixels.**
