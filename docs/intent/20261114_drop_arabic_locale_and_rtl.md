---
title: "Intent: Drop Arabic Locale and RTL Support"
type: intent
last_updated: 2026-11-14
---

# Intent: Drop Arabic Locale and RTL Support

## The Goal

Restrict ExifSense localization strictly to English (`en`) and Bahasa Indonesia (`id`) across both the Web application and the CLI, while removing all Arabic (`ar`) translations and right-to-left (RTL) layout infrastructure.

## The Rationale

Maintaining Arabic translations adds ongoing development overhead without reliable quality assurance, because the developer does not read or understand Arabic and cannot verify whether translated UI copy and forensic narratives sound natural or accurate. In practice, `src/locales/ar.json` has already fallen 36 UI keys behind `en.json` and `id.json`. Limiting locale support strictly to languages the developer understands (`en` and `id`) keeps localization maintainable, verifiable, and consistent across every feature.

## What We Want

- **Strictly two supported locales (`en` and `id`)**: Remove `src/locales/ar.json` and remove `'ar'` from all supported language types, locale dictionaries, date locale mappings, Web language selector options, and CLI `--locale` options and help text.
- **Complete removal of RTL infrastructure**: Remove `TextDirection`, `direction` store state, `document.documentElement.dir` switching, `dir="ltr"` logo workarounds, and `[dir="rtl"]` CSS rules and icon-flip classes rather than keeping dead RTL scaffolding.
- **Explicit rejection of `'ar'` at the CLI boundary**: Ensure passing `--locale ar` in the CLI fails cleanly with an unsupported-locale error listing only `en` and `id`.
- **Clean active documentation and fresh build artifacts**: Update `README.md` and `docs/design/brand.md` to reflect `en` and `id` only without RTL, rebuild Web (`dist/`) and CLI (`bin/exifsense.js`) bundles, and record the architectural justification in an ADR once the codebase is verified clean.

## What We Do NOT Want

- **No leftover RTL scaffolding**: Do not keep `direction`, `TextDirection`, or `rtl-flip-icon` CSS/classes "just in case" for hypothetical future RTL languages.
- **No silent fallback for `--locale ar` in CLI**: Do not silently coerce `--locale ar` to `'en'` in CLI argument parsing; reject it as an unsupported locale.
- **No rewriting historical archive docs**: Leave older intent and blueprint files in `docs/intent/` and `docs/blueprint/` from past completed features untouched as historical records.
- **No premature ADR before code verification**: Write the ADR only after code changes, test updates, build outputs, and audits confirm the codebase is completely clean of `ar` and RTL.
