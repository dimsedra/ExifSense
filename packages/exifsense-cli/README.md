# exifsense-cli

Standalone command-line interface for ExifSense photo metadata forensics, cryptographic hashing, and chronological batch narratives. Installs only the terminal executable (`exifsense`) without the web application or browser dependencies.

## Requirements

Node.js 20 or newer.

## Installation

```bash
npm install -g exifsense-cli
```

Or run directly without installing globally:

```bash
npx --package=exifsense-cli exifsense --help
```

## Usage

```bash
# Analyze a single photo or JSON metadata file
exifsense single photo.jpg

# Inspect SHA-256 and SHA-1 hashes across files or directories
exifsense hash photo1.jpg photo2.jpg
exifsense hash path/to/folder/ --format markdown --out manifest.md

# Analyze multiple photos into a chronological story and combined evidence report
exifsense batch photo1.jpg photo2.jpg photo3.jpg

# Include individual single-asset breakdowns at the end of a batch report
exifsense batch photo1.jpg photo2.jpg --detailed

# Extract raw EXIF metadata into a JSON file
exifsense extract photo.jpg metadata.json

# Output Indonesian Markdown directly to a file
exifsense batch photo1.jpg photo2.jpg --locale id --format markdown --detailed --out report.md
```

## Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--locale <en\|id>` | Narrative and table language (`en` or `id`) | `en` |
| `--format <plain\|markdown>` | Output format (`plain` or `markdown`) | `plain` |
| `--detailed` | Append single-asset breakdowns to batch reports | `false` |
| `--out <path>` | Write output directly to a file instead of stdout | stdout |
| `-h, --help` | Show CLI usage information | - |
| `-v, --version` | Show CLI version | - |

## Offline vs. Online Behavior

When online, `single` and `batch` commands resolve GPS coordinates to readable addresses via Nominatim and estimate road travel distances via OSRM. When offline, all EXIF extraction, hashing, integrity checks, and narratives continue locally and fall back to numeric coordinates.

## License

MIT
