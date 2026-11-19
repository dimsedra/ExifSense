---
title: "Intent: Factual Narrative Cleanup and Dual-Distance Export Parity"
type: intent
last_updated: 2026-11-19
---

# Intent: Factual Narrative Cleanup and Dual-Distance Export Parity

## The Goal

Menyelaraskan seluruh narasi, aturan kelengkapan metadata, kamus bahasa (`en.json` dan `id.json`), pemformat baris perintah (`cli/formatter.ts`), serta hasil ekspor Web (`exporter.ts`) dengan posisi baru ExifSense: pembangkitan teks bahasa alami berbasis templat aturan tetap (*template-based NLG*) yang murni faktual, terlokalisasi penuh dalam bahasa Indonesia dan Inggris, bebas dari tebakan atau asumsi, serta transparan memisahkan jarak perpindahan garis lurus dan estimasi rute jalan pada kalimat ringkasan geospasial baik di dasbor Web maupun di berkas hasil ekspor.

## The Rationale

Audit atas kode dan kamus bahasa terhadap kontrak skripsi terbaru mengungkapkan empat sumber ketidakselarasan yang masih tersisa dari rancangan awal sebelum *reframing*:

1. Terdapat 26 kunci mati (*dead keys*) di bagian `narratives` pada `src/locales/en.json` dan `src/locales/id.json` yang tidak lagi dipanggil di kode produksi.
2. Masih aktif berjalan 7 aturan deteksi manipulasi warisan proposal lama (6 jenis peringatan di `src/core/forensics/integrity.ts` dan `velocityAlert` di `src/core/forensics/collective.ts` beserta penanda anomali di `src/cli/formatter.ts`) yang memuat frasa bernada vonis dan tidak lagi menjadi cakupan penelitian baru.
3. Sejumlah templat aktif masih menyelipkan spekulasi seolah-olah fakta (seperti menebak moda transportasi, menyimpulkan foto diambil orang yang sama, atau mengklaim keaslian data GPS), belum setara antara bahasa Indonesia dan Inggris, serta masih mencetak pesan bawaan berbahasa Inggris langsung dari `integrity.ts` tanpa melalui kamus bahasa dan membedakan ambang 1 vs 2 kategori metadata hilang secara tidak seragam.
4. Ringkasan geospasial pada `generateCollectiveNarratives` di `src/core/narratives/narratives.ts` dan fungsi ekspor di `src/core/exporter/exporter.ts` belum menerima jarak rute jalan dari mesin perutean (*Open Source Routing Machine* atau OSRM) yang sudah diambil oleh dasbor Web, padahal berkas hasil ekspor digunakan sebagai bahan uji pemahaman pengguna.

## What We Want

1. Depresiasi total warisan deteksi manipulasi dan kunci mati: Hapus 26 kunci mati di kamus `narratives`, hapus 6 tipe peringatan manipulasi atau pemalsuan (`future_capture_date`, `capture_after_file_modification`, `missing_original_metadata`, `dimension_mismatch`, `null_island`, dan `integer_coordinate_precision`) dari `integrity.ts` dan `types.ts`, hapus `velocityAlert` dan `velocity_warning` dari `collective.ts` dan `narratives.ts`, serta hapus `time_anomaly_tag`, `velocity_anomaly_label`, dan `velocity_anomaly_desc` dari `cli/formatter.ts` dan kamus `ui`.
2. Pelaporan kelengkapan metadata yang seragam, faktual, dan terlokalisasi: Hilangkan ambang `missingPillars.length >= 2` pada `integrity.ts` agar kondisi hilangnya 1, 2, maupun seluruh kategori inti (GPS, waktu, dan perangkat) dilaporkan secara seragam dan jujur melalui kamus bahasa `en.json` dan `id.json`, tanpa pesan berbahasa Inggris yang ditulis langsung di kode dan tanpa asumsi penghapusan selektif.
3. Penghapusan cabang sisa yang asumtif serta pemurnian kalimat templat: Hapus `hardware_analysis`, `exp_standard`, dan `timeline_mod_note`; tulis ulang `integrity_clean`, `geospatial`, `no_geo`, `combined_integrity_stripped_all`, `combined_hw_consistent`, `combined_geo_concentrated`, `combined_geo_localized`, dan `combined_geo_trail` agar hanya menyatakan fakta yang langsung terbaca dari tag atau perhitungan, dan selaraskan informasi antara `en.json` dan `id.json`.
4. Pembaruan label antarmuka paradigma lama: Ganti istilah warisan seperti heuristik manipulasi, deteksi pemalsuan, dan perlindungan pemalsuan (*spoofing*) pada kunci `ui` (`hero_subtitle`, `dropzone_subtitle_single`, `feature_integrity_desc`, `guide_feat_integrity_desc`, `feature_spoof_title`, `guide_feat_spoof_title`) agar mencerminkan inspeksi metadata deskriptif, validasi tanda tangan biner berkas, dan rekonstruksi lini masa.
5. Transparansi jarak ganda pada narasi gabungan di Web dan berkas ekspor: Perluas `generateCollectiveNarratives` untuk menerima jarak total rute jalan OSRM secara opsional sehingga `combined_geo_localized` dan `combined_geo_trail` menyebut secara eksplisit angka perpindahan garis lurus dan menyertakan estimasi rute jalan OSRM di kalimat yang sama bila tersedia, lalu teruskan data rute tersebut dari `CombinedIntelligenceCard.tsx` dan `App.tsx` ke `exporter.ts` (PDF, Markdown, dan Teks/Clipboard) tanpa menambah bagian baru di struktur laporan ekspor.

## What We Do NOT Want

1. Tidak ada asumsi yang menyamar sebagai fakta: Jangan memasukkan tebakan tentang niat pengguna, identitas pemotret, jenis kendaraan, kesetaraan jarak jalan kaki, ataupun penilaian keaslian foto di dalam kalimat templat mana pun.
2. Tidak ada ketergantungan jaringan di dalam `src/core/`: Fungsi di `narratives.ts` dan `exporter.ts` harus tetap murni menerima nilai jarak rute yang sudah diperoleh lapisan pemanggil (`App.tsx` atau `CombinedIntelligenceCard.tsx`), tidak melakukan pemanggilan jaringan langsung dari `src/core/`, dan selalu turun mulus ke perpindahan garis lurus saja saat luring atau saat rute jalan tidak tersedia.
3. Tidak ada penambahan bagian baru pada format ekspor dan tidak ada penghapusan fitur sanitasi Web: Pertahankan struktur bagian yang ada di `exporter.ts`, dan tetap biarkan fitur pembersihan metadata khusus Web (`src/core/sanitizer/` dan `SanitizerView.tsx`) sesuai keputusan ADR-002.
