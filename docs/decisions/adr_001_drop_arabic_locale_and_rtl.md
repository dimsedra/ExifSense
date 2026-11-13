---
title: "ADR-001: Restrict Localization Strictly to English and Indonesian Without RTL"
type: adr
status: Accepted
date: 2026-11-14
deciders: [Eds]
tags: [i18n, localization, architecture, maintainability]
parent_prd: null
parent_srs: null
supersedes: null
superseded_by: null
---

# ADR-001: Restrict Localization Strictly to English and Indonesian Without RTL

## Context

ExifSense was originally built with three supported languages: English (`en`), Bahasa Indonesia (`id`), and Arabic (`ar`), including right-to-left (RTL) layout switching in the Web application and `--locale ar` support in the CLI. In practice, ExifSense's core value is translating obscure photo metadata into natural, human-readable explanations rather than dumping raw tags, which means copy quality directly determines whether the product succeeds.

Because the primary developer reads and writes English and Bahasa Indonesia fluently but does not understand Arabic, there is no reliable way during development to review Arabic UI labels or forensic narrative templates to verify whether they sound natural, accurate, and free of awkward phrasing. Every new feature required maintaining three parallel translation dictionaries (`en.json`, `id.json`, and `ar.json`), hardcoded Arabic string branches in chronological story builders, and RTL layout workarounds across CSS and React components. Over time, `ar.json` drifted behind by 36 UI keys (covering signature verification, identity management, manifest export, and passphrase flows), creating silent inconsistencies and ongoing maintenance drag.

## Decision

We will restrict ExifSense localization strictly to English (`en`) and Bahasa Indonesia (`id`), and remove all Arabic (`ar`) translations and right-to-left (RTL) layout infrastructure across the core domain, Web UI, CLI, tests, active documentation, and build artifacts.

Specifically, the codebase keeps only `en.json` and `id.json`, narrows `SupportedLanguage` and `SupportedLocale` to `'en' | 'id'`, removes `TextDirection` and `document.documentElement.dir` switching from `useI18nStore`, removes RTL CSS rules (`[dir="rtl"] .rtl-flip-icon`) and `dir="ltr"` logo overrides, and rejects `--locale ar` explicitly at the CLI entry boundary (`parseCliArgs`) via `CliArgumentError`. Any future language expansion must only include languages the maintainer team can actively review and verify.

## Alternatives Considered

One alternative was keeping Arabic in the codebase as a best-effort third language while relying on automated translation tools whenever new keys were added. While this preserves a wider language list on paper, it guarantees recurring drift in UI keys and forces the maintainer to ship unverified prose in a core narrative product without being able to judge whether forensic explanations make sense to native readers.

Another alternative was removing `ar.json` and the `العربية` UI option while keeping RTL infrastructure (`TextDirection`, `direction` state in `useI18nStore`, `dir="ltr"` overrides, and `.rtl-flip-icon` CSS rules) dormant for hypothetical future RTL languages. We rejected this because keeping unused layout switching logic violates YAGNI, adds cognitive overhead when reading state and component code, and leaves untested CSS and store branches in the repository. If an RTL language is ever intentionally added later with proper native review coverage, restoring RTL hooks cleanly from version history is straightforward.

A third alternative was silently falling back to English when a user passes `--locale ar` in the CLI. We rejected silent coercion because failing fast and loud at entry boundaries (`CliArgumentError`) makes the contract explicit and prevents scripts or analysts from mistakenly thinking Arabic output is supported.

## Consequences

Localization maintenance becomes simpler and faster because every new feature only requires authoring and reviewing copy in `en.json` and `id.json`, two languages the developer can directly verify for tone, clarity, and domain accuracy. Control flow in `chronological.ts`, date formatting helpers, `useI18nStore.ts`, and `Header.tsx` is flatter, and the compiled Web and CLI bundles no longer ship stale Arabic dictionary data.

On the trade-off side, Arabic-speaking users lose native Arabic UI and narrative output, and anyone upgrading the CLI with scripts passing `--locale ar` will now receive an explicit unsupported-locale error (exit code `1`). Reintroducing Arabic or any other RTL language in the future will require restoring RTL layout verification across desktop and mobile viewports alongside a native reviewer or reliable localization workflow.

## Verification & Related Context

This decision is enforced in code via TypeScript union types (`'en' | 'id'`), explicit equality checks and `Object.hasOwn` lookups in core narrative/date helpers, fail-fast rejection of `--locale ar` in `tests/cli/cli.test.ts`, and live Web UI verification covering `EN` / `ID` switching.

- Parent Intent: [Intent: Drop Arabic Locale and RTL Support](../intent/20261114_drop_arabic_locale_and_rtl.md)
- Implementation Blueprint: [Blueprint: Drop Arabic Locale and RTL Support](../blueprint/20261114_drop_arabic_locale_and_rtl.md)
- Brand SOT: [Brand Design SOT: ExifSense](../design/brand.md)
