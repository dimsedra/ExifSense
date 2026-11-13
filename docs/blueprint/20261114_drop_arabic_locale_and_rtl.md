---
title: "Blueprint: Drop Arabic Locale and RTL Support"
type: blueprint
parent_intent: docs/intent/20261114_drop_arabic_locale_and_rtl.md
status: Approved
last_updated: 2026-11-14
---

# Blueprint: Drop Arabic Locale and RTL Support

This blueprint defines the module boundaries, contracts, verification methods, and atomic commit plan to remove all Arabic (`ar`) localization and right-to-left (RTL) layout infrastructure across the ExifSense core domain, Web UI, CLI, tests, active documentation, and build artifacts.

## Current Code

Arabic (`ar`) and RTL support currently span four layers:

- **Locale dictionary & i18n store**: `src/locales/ar.json` (already 36 `ui` keys behind `en.json` and `id.json`) is imported by `src/store/useI18nStore.ts`, which defines `SupportedLanguage = 'en' | 'id' | 'ar'`, `TextDirection = 'ltr' | 'rtl'`, `direction` state, and `document.documentElement.dir` switching.
- **Core narratives & date formatting**: `src/core/narratives/types.ts` defines `SupportedLocale = 'en' | 'id' | 'ar'`. Both `src/core/narratives/narratives.ts` and `src/core/narratives/chronological.ts` import `ar.json`, and `chronological.ts` contains four hardcoded `if (locale === 'ar')` branches (`formatSpanDuration`, `formatDualDistance`, and `formatMacroDualDistance`). `src/core/forensics/metadata.ts` maps `ar: 'ar-SA'` in `formatNaturalDate`.
- **Web UI & CSS**: `src/components/Header.tsx` renders the `العربية` option, `ar: 'AR'` label, and `dir="ltr"` on `#home-logo`. `src/css/main.css` defines `[dir="rtl"] .rtl-flip-icon`, used by `src/views/HomeView.tsx` and `src/views/GuideView.tsx`. `src/views/HistoryView.tsx`, `src/components/dashboard/AssetPreviewCard.tsx`, and `src/components/sanitizer/SanitizerWorkspace.tsx` map `currentLang === 'ar'` to `'ar-SA'`.
- **CLI, docs, tests, & bundles**: `src/cli/args.ts`, `src/cli/runner.ts`, and `src/cli/formatter.ts` accept `ar`, document `--locale <en|id|ar>`, and map `ar: 'ar-SA'`. `README.md` advertises Arabic/RTL support, and four test files (`tests/store/useI18nStore.test.ts`, `tests/core/narratives/chronological.test.ts`, `tests/core/forensics/metadata.test.ts`, `tests/cli/formatter.test.ts`) assert Arabic or RTL output. `dist/` and `bin/exifsense.js` bundle `ar.json`.

## Design

The removal preserves all existing `en` and `id` behavior unchanged while eliminating `ar` and RTL cleanly at every boundary:

- At the **domain & store layer**, `SupportedLanguage` and `SupportedLocale` become strictly `'en' | 'id'`, `src/locales/ar.json` is deleted, RTL `TextDirection`/`direction` state is removed from `useI18nStore`, and hardcoded `ar` branches are deleted from `chronological.ts` and `metadata.ts`.
- At the **Web UI layer**, `Header.tsx` offers only `English` (`en`) and `Bahasa Indonesia` (`id`), and all `dir` attributes, `[dir="rtl"]` CSS rules, `rtl-flip-icon` classes, and `'ar-SA'` date ternary branches are removed.
- At the **CLI entry boundary**, `parseCliArgs` in `src/cli/args.ts` enforces `'en' | 'id'` via fail-fast validation so `--locale ar` throws `CliArgumentError` instead of falling back silently.
- **Post-verification ADR**: Immediately after implementation, test verification, build regeneration, `/audit`, and `/proof` confirm zero remaining `ar` or RTL code references, `docs/decisions/adr_001_drop_arabic_locale_and_rtl.md` will be written and cataloged in `docs/README.md`.

## Contracts

### BP-I18N-001: Remove Arabic Locale and RTL State from i18n Store and Core Domain

- **Serves**: Strictly two supported locales (`en` and `id`) and complete removal of RTL infrastructure from Intent.
- **Location**: `src/locales/ar.json`, `src/store/useI18nStore.ts`, `src/core/narratives/types.ts`, `src/core/narratives/narratives.ts`, `src/core/narratives/chronological.ts`, `src/core/forensics/metadata.ts`, and unit tests (`tests/store/useI18nStore.test.ts`, `tests/core/narratives/chronological.test.ts`, `tests/core/forensics/metadata.test.ts`).
- **Input**: Language selection `'en' | 'id'` in `useI18nStore.setLanguage` and locale parameter `'en' | 'id'` in narrative/date functions.
- **Behavior**:
  - Delete `src/locales/ar.json`.
  - In `src/store/useI18nStore.ts`, narrow `SupportedLanguage` to `'en' | 'id'`, remove `TextDirection`, remove `direction` from `I18nStoreState` and store state, remove `arLocale` import and `dictionaries.ar`, and remove `document.documentElement.dir = direction` inside `setLanguage`. If an unexpected runtime value reaches `setLanguage`, resolve `const activeLang: SupportedLanguage = lang === 'en' || lang === 'id' ? lang : 'en'` (avoiding prototype-chain checks like `in`) before setting `localStorage`, `document.documentElement.lang`, `dictionary`, and `currentLang`.
  - In `src/core/narratives/types.ts`, narrow `SupportedLocale` to `'en' | 'id'`.
  - In `src/core/narratives/narratives.ts` and `src/core/narratives/chronological.ts`, remove `arLocale` imports and `LOCALES.ar`. In `chronological.ts`, remove `locale === 'ar'` branches in `formatSpanDuration`, `formatDualDistance`, and `formatMacroDualDistance`.
  - In `src/core/forensics/metadata.ts`, remove `ar: 'ar-SA'` from `localeMap` in `formatNaturalDate`.
- **Output**: Identical `en` and `id` translations, narratives, and `Intl.DateTimeFormat` date outputs, with zero `ar` dictionary entries or RTL store state.
- **Failure**: Runtime calls to `translate(key, params, 'ar')` or `formatNaturalDate(date, 'ar')` fall back to `'en'` via existing `'en'` dictionary/locale fallback rather than throwing in pure core helpers, while `setLanguage` normalizes unknown runtime values to `'en'` so store state and `document.documentElement.lang` never hold `'ar'`.
- **Method**: Characterization (`method/CHARACTERIZATION.md`)
- **Verification**: Remove `'ar'`/`rtl` test cases as well as `direction`/`document.documentElement.dir` and `'ar'` assertions inside shared `en`/`id` tests in `tests/store/useI18nStore.test.ts`, `tests/core/narratives/chronological.test.ts`, and `tests/core/forensics/metadata.test.ts` (updating shared test titles accordingly) while keeping all `en`/`id` characterization assertions intact; confirm `npm test` and `npm run typecheck` pass with zero errors.
- **Commit**: `test(i18n): remove Arabic and RTL assertions from store and core characterization tests` followed by `refactor(i18n): remove Arabic locale and RTL state from store and core domain`.

### BP-I18N-002: Remove Arabic Option and RTL Styling from Web UI

- **Serves**: Strictly two supported locales (`en` and `id`) and complete removal of RTL infrastructure from Intent, aligned with updated `docs/design/brand.md`.
- **Location**: `src/components/Header.tsx`, `src/views/HomeView.tsx`, `src/views/GuideView.tsx`, `src/views/HistoryView.tsx`, `src/components/dashboard/AssetPreviewCard.tsx`, `src/components/sanitizer/SanitizerWorkspace.tsx`, `src/css/main.css`.
- **Input**: User clicks on Header language selector (`EN` / `ID`) and date rendering across History, Dashboard Preview, and Sanitizer Workspace.
- **Behavior**:
  - In `src/components/Header.tsx`, remove `ar: 'AR'` from `langLabels`, remove the `العربية` dropdown button (`handleSelectLang('ar')`), and remove `dir="ltr"` on `#home-logo`.
  - In `src/css/main.css`, remove `[dir="rtl"] .rtl-flip-icon { transform: scaleX(-1); }`.
  - In `src/views/HomeView.tsx` and `src/views/GuideView.tsx`, remove `className="rtl-flip-icon"` from the `<Play />` icons.
  - In `src/views/HistoryView.tsx`, `src/components/dashboard/AssetPreviewCard.tsx`, and `src/components/sanitizer/SanitizerWorkspace.tsx`, simplify date locale selection to `currentLang === 'id' ? 'id-ID' : 'en-US'`.
- **Output**: Header language selector renders only `English` and `Bahasa Indonesia`, icons render normally in LTR without RTL flip classes, and dates format in `en-US` or `id-ID`.
- **Failure**: Any clipped header buttons, broken dropdown states, or overlapping layout at mobile or desktop viewports fails visual inspection.
- **Method**: Visual Testing (`method/VISUAL_TESTING.md`)
- **Verification**: Start the Vite dev server and run an isolated Visual QA subagent across `#/` and `#/guide` at mobile (`360x640`) and desktop (`1280x800`) viewports, opening the language dropdown, switching between `EN` and `ID`, verifying `<Play />` buttons and header layout against `docs/design/brand.md` via screenshots (or falling back explicitly per `VISUAL_TESTING.md` if headless browser permissions are declined).
- **Commit**: `refactor(ui): remove Arabic option and RTL styling from Web components and CSS`.

### BP-I18N-003: Reject `--locale ar` at CLI Boundary, Update Active Docs, and Rebuild Bundles

- **Serves**: Strictly two supported locales (`en` and `id`), explicit rejection of `'ar'` at CLI boundary, and clean active documentation and fresh build artifacts from Intent.
- **Location**: `src/cli/args.ts`, `src/cli/runner.ts`, `src/cli/formatter.ts`, `README.md`, `tests/cli/cli.test.ts`, `tests/cli/formatter.test.ts`, `dist/`, `bin/exifsense.js`.
- **Input**: CLI argument array (`rawArgs`) passed to `parseCliArgs` / `runCli`, plus `CliOptions` passed to `formatSingleOutput` and `processBatchAssets`.
- **Behavior**:
  - In `src/cli/args.ts`, narrow `SupportedLocale` to `'en' | 'id'` and update `parseCliArgs` locale validation to accept only `'en'` or `'id'`, throwing `CliArgumentError("Unsupported locale '${locale}'. Supported: en, id.")` for `'ar'` or any other locale.
  - In `src/cli/runner.ts`, update `HELP_TEXT` to `--locale <en|id>       Narrative language (default: en)` and narrow `processBatchAssets` `options.locale` type to `'en' | 'id'`.
  - In `src/cli/formatter.ts`, remove `ar: 'ar-SA'` from `DATE_LOCALE_MAP`.
  - In `README.md`, update the Multi-Language Support row and CLI usage comment to reflect English and Bahasa Indonesia only without Arabic or RTL.
  - Rebuild Web and CLI bundles via `npm run build` (`tsc && vite build && npm run build:cli`).
- **Output**: Fresh `dist/` and `bin/exifsense.js` bundles with zero `ar.json` payload, updated `README.md`, and `exifsense --help` listing `<en|id>`.
- **Failure**: Passing `--locale ar` to `parseCliArgs` or `runCli` throws `CliArgumentError` and exits with code `1` and an explicit error message on `stderr` rather than falling back to `'en'`.
- **Method**: Design by Contract (`method/DESIGN_BY_CONTRACT.md`)
- **Verification**: Update `tests/cli/formatter.test.ts` (remove Arabic heading test) and add explicit `--locale ar` rejection tests in `tests/cli/cli.test.ts`. Run `npm test`, `npm run typecheck`, `npm run build`, execute `node bin/exifsense.js --help`, `node bin/exifsense.js scenario baseline --locale id`, and `node bin/exifsense.js scenario baseline --locale ar` (verifying exit code `1`), and run a codebase `rg` search with pattern-specific matching (`ar\.json|arLocale|ar-SA|rtl-flip-icon|dir=["']rtl["']|TextDirection|\bar\b`) confirming zero remaining Arabic or RTL references in `src/`, `tests/`, `README.md`, and `docs/design/brand.md`.
- **Commit**: `test(cli): verify --locale ar rejection and remove Arabic formatter tests`, `refactor(cli): restrict CLI locale support to en and id`, `docs: remove Arabic and RTL references from README`, and `build: rebuild Web dist and standalone CLI bundle`.

## Non-Goals

- **No leftover RTL scaffolding**: Do not retain `direction`, `TextDirection`, `dir="ltr"`, or `rtl-flip-icon` for hypothetical future languages.
- **No silent CLI fallback for `--locale ar`**: Reject `--locale ar` explicitly via `CliArgumentError`.
- **No editing historical archive docs**: Leave past completed files in `docs/intent/` and `docs/blueprint/` (from 2026-10-31 through earlier 2026-11-14 parity work) unchanged.
- **No premature ADR**: Create `docs/decisions/adr_001_drop_arabic_locale_and_rtl.md` only after Phase 2 implementation, `/audit`, and `/proof` verify the codebase is completely clean.
