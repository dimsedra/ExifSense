---
title: "Lesson: Haversine Algorithm and OSRM Road Routing"
type: lesson
topic: haversine_and_osrm
scripts:
  - docs/lesson/haversine_and_osrm/demo.ts
last_updated: 2026-11-03
---

# Lesson: Haversine Algorithm and OSRM Road Routing

## Part 1: For You (The Concept & Mental Model)

### The Core Idea
Dalam rekayasa perangkat lunak geospasial, kita sering berhadapan dengan data koordinat (latitude dan longitude) dan perlu mengukur jarak perpindahan fisik di dunia nyata. Namun, mengukur jarak antara dua titik koordinat bumi memiliki dua dimensi yang sama sekali berbeda:
1. **Perpindahan garis lurus di permukaan bola (straight-line displacement)**: Jarak minimum geometris antara dua titik koordinat absolut menggunakan algoritma Haversine.
2. **Estimasi rute jaringan jalan (road network distance)**: Jarak tempuh berkendara di atas infrastruktur jalan raya menggunakan mesin pencarian rute berbasis graf seperti OSRM (Open Source Routing Machine).

Masalah klasik yang sering terjadi adalah mencampuradukkan kedua nilai ini—misalnya memberi label "Total Jarak Tempuh" padahal hanya dihitung dari garis lurus Haversine, atau memaksakan rute OSRM pada pergerakan non-darat (seperti di atas danau atau penerbangan udara).

### How It Works (Cause and Effect)

#### Asal-Usul di Proyek ExifSense
Pelajaran ini berakar dari penyelarasan arsitektur *dual-distance* di ExifSense (`docs/intent/20261103_dual_distance_displacement_and_road_route.md`). Sebelumnya, antarmuka pengguna menampilkan kalkulasi Haversine dengan label "Total Travel Distance" disertai catatan kaki yang keliru menyebut jarak tersebut berdasarkan rute jalan. Kita memisahkannya secara tegas: Haversine sebagai fakta dasar perpindahan koordinat (*displacement*), dan OSRM sebagai inferensi kontekstual rute darat (*estimated road route*).

#### Model Mental Haversine: Tiga Langkah Fisik (Tanpa Rumus Rumit)
Kamu tidak perlu menghafal rumus trigonometrinya di luar kepala. Cara berpikir perekayasa perangkat lunak adalah melihat 3 fakta fisik sebab-akibat:

1. **Penyusutan Garis Bujur (Longitude Scaling)**:
   Garis lintang (utara-selatan) memiliki jarak yang konstan dari khatulistiwa hingga kutub. Namun, garis bujur (timur-barat) semakin mengerucut dan menyempit saat mendekati kutub. Sebelum menghitung jarak bujur, kita kalikan dengan cosinus latitude (`cos(lat1) * cos(lat2)`). Di khatulistiwa faktornya bernilai 1 (100%), dan di kutub faktornya bernilai 0 (semua bujur bertemu di satu titik).
2. **Garis Tembus Interior Bumi Lalu Dibuka (Chord to Arc)**:
   Menghitung lengkungan permukaan bumi secara langsung itu rumit. Variabel `a` menarik garis lurus khayal yang menembus bagian dalam bumi di antara kedua titik (panjang tali busur). Kemudian fungsi sudut `atan2` membukanya kembali menjadi besar sudut lengkungan sentral di permukaan bumi (variabel `c` dalam radian).
3. **Mengalikan Sudut dengan Jari-Jari Bumi (Radian to Distance)**:
   Berdasarkan definisi matematika radian, panjang busur lengkungan sama dengan besar sudut radian dikalikan jari-jari bola. Kita cukup mengalikan sudut sentral `c` dengan rata-rata jari-jari bumi (6.371 km). Hasilnya langsung berupa jarak kilometer di permukaan bumi.

#### Dua Baris Kritis untuk Ketahanan Sistem Komputer (Software Resilience)
Di luar matematika, ada dua baris pengaman yang wajib kamu pertahankan saat code review:
- `clampedA = Math.min(1, Math.max(0, a))`: Keterbatasan presisi desimal biner di komputer (floating-point arithmetic) bisa membuat nilai `a` bernilai `1.0000000000000002` untuk dua titik yang saling berlawanan di bumi (titik antipodal). Tanpa pembatasan ini, operasi $\sqrt{1 - a}$ akan mencoba mengakarkan bilangan negatif dan menghasilkan `NaN` (*Not-a-Number*).
- `atan2(sqrt(a), sqrt(1 - a))`: Digunakan menggantikan fungsi $\arccos$ sederhana karena $\arccos$ kehilangan presisi drastis di komputer ketika sudut mendekati 0 (misalnya dua foto yang diambil berjarak kurang dari 5 meter).

#### Mekanisme OSRM (Open Source Routing Machine)
OSRM bekerja dengan memproses data OpenStreetMap (OSM) menjadi graf jalan:
1. **Coordinate Snapping**: Titik GPS dari foto ditarik/diproyeksikan ke ruas jalan terdekat yang valid untuk kendaraan bermotor.
2. **Contraction Hierarchies (CH)**: Menggunakan graf jalan yang telah dipra-proses sehingga query rute terpendek antar waypoint dapat diselesaikan dalam hitungan milidetik.
3. **GeoJSON Response**: Mengembalikan `totalDistanceMeters`, array segmen `legs` antar titik singgah, dan `geometry` berupa garis kelokan jalan nyata.

### Trade-Offs & When Not to Use It

| Dimensi | Algoritma Haversine | Rute OSRM |
| :--- | :--- | :--- |
| **Sifat Eksekusi** | Pure function, lokal, offline, O(1) | Network I/O, asynchronous, tergantung server eksternal |
| **Kebutuhan Jaringan** | Tanpa internet, 0 latensi | Membutuhkan HTTP request, terkena kuota rate-limit |
| **Representasi** | Garis lurus perpindahan ruang (*displacement*) | Jarak tempuh di atas graf jalan (*road transit*) |
| **Kapan Gagal / Tidak Cocok** | Mengabaikan rintangan fisik (laut, gunung, tata kota) | Gagal/keliru di atas air (danau/laut), di udara, atau di area hutan tanpa jalan |

### How to Spot It in Other Projects
1. **Symptom**: Sebuah aplikasi ride-hailing atau pelacak armada menghitung ongkos atau estimasi waktu tiba (ETA) menggunakan rumus jarak lurus, sehingga pengguna komplain karena rute memutar sungai tidak terhitung.
   - *Solusi*: Pisahkan displacement (Haversine) sebagai filter query spasial awal (bounding box) dan OSRM/routing engine untuk kalkulasi rute navigasi sebenarnya.
2. **Symptom**: Penggunaan `fetch` ke routing engine eksternal ditaruh di dalam fungsi inti domain yang sinkron, menyebabkan fungsi tidak bisa diuji secara offline dan crash saat koneksi terputus.
   - *Solusi*: Terapkan arsitektur graceful degradation seperti di ExifSense. Jadikan Haversine sebagai baseline sinkron yang selalu tersedia, lalu ambil data rute jalan secara asinkron di lapisan boundary (UI/CLI) sebagai data opsional.

### Walking Through the Example Script

Skrip pendamping berada di `docs/lesson/haversine_and_osrm/demo.ts`.

Cara menjalankannya:
```bash
node docs/lesson/haversine_and_osrm/demo.ts
```

Apa yang dibuktikan oleh output skrip:
1. **Breakdown Langkah Demi Langkah (Demo 1)**: Menguji koordinat Monas ke Bundaran HI di Jakarta. Menunjukkan nilai radian, kontribusi utara-selatan (`termLat`), kontribusi bujur (`termLon`), dan faktor koreksi `cosScaling = 0.988392` (menyusut 1,16% karena berada di lintang -6°). Hasil Haversine: 2,228 km.
2. **Uji Batas Faktor Cosinus (Demo 2)**: Menghitung jarak pergeseran 1 derajat bujur di Khatulistiwa (111,19 km) versus di lintang 80° (19,31 km). Rasio fisiknya `0.1736`, persis senilai `cos(80°)`.
3. **Uji Batas Presisi Jarak Pendek (Demo 3)**: Menunjukkan kestabilan `atan2` pada jarak 5 meter tanpa kehilangan angka desimal.
4. **Kontras Haversine vs OSRM (Demo 4)**: Menghubungi server OSRM secara nyata. Jarak rute jalan berkendara tercatat 4,011 km (1,8 kali lebih panjang dari jarak lurus 2,228 km) karena tata kelola jalan satu arah dan putaran balik di Jakarta Pusat.

---

## Part 2: For the Agent (Reproducible Teaching Playbook)

### What Clicked & Stuck Points from Our Session
- **Stuck Point (Math Intimidation)**: Eds merasa "not so great at mathematics". Ketika disajikan rumus trigonometri murni ($\sin^2$, $\cos$, $\text{atan2}$), pemahaman konsep bisa tertutup oleh rumus.
- **What Clicked (The 3 Physical Steps)**: Pemahaman langsung mengalir ketika penjelasan dialihkan dari rumus matematika ke model mental sebab-akibat fisik:
  1. Garis bujur menyusut ke kutub (dikalikan cosinus lintang).
  2. Garis tembus interior bumi dibuka kembali menjadi busur lengkungan via `atan2`.
  3. Sudut radian dikalikan jari-jari bumi 6.371 km.
- **Teaching Execution Correction**: Jangan pernah melompat langsung merangkum angka output terminal tanpa menyandingkannya baris demi baris dengan kode sumber skrip pendamping. Tunjukkan potongan kodenya, jelaskan barisnya, lalu sandingkan dengan baris output terminal yang dihasilkan.
- **Verification Anchor**: Skenario perahu motor di tengah danau. Eds langsung mengenali bahwa OSRM akan salah/error karena memaksakan snapping ke jalan darat di tepi danau, sementara Haversine memberikan fakta objektif perpindahan 2 km di ruang terbuka.

### Step-by-Step Teaching Flow
1. **Anchoring**: Mulai dari masalah nyata di ExifSense (kenapa ada label yang membingungkan antara jarak garis lurus dan rute jalan pada batch foto).
2. **Core Distinction**: Bedakan Haversine (geometri permukaan bola) dan OSRM (graf jaringan jalan berbasis OpenStreetMap).
3. **Companion Script Walkthrough**:
   - Tulis skrip mandiri dengan komentar edukatif menyeluruh di `docs/lesson/<topic_slug>/demo.ts`.
   - Jalankan di terminal.
   - Telusuri baris per baris: `toRadians` -> `termLat` & `cosScaling` -> `clampedA` & `atan2` -> perkalian radius bumi -> OSRM fetch dengan `AbortController`.
   - Sandingkan setiap baris kode dengan baris output terminal yang bersesuaian.
4. **Resilience Focus**: Jelaskan kenapa ada `clampedA` (mencegah NaN pada floating-point biner) dan `atan2` (mencegah pembulatan buruk pada foto berjarak < 5 meter).
5. **Verification**: Uji pemahaman dengan skenario pergerakan non-darat (kapal di danau atau pesawat terbang) untuk memastikan pembedaan antara fakta koordinat murni dan inferensi rute jalan benar-benar tertanam.

### Verification Question
"Jika ada dua foto berurutan dengan jeda 10 menit diambil dari atas perahu di tengah danau, dan OSRM menghasilkan rute memutar sepanjang 18 km karena tidak ada jalan di atas air sementara Haversine menghasilkan 2 km garis lurus: metrik mana yang menjadi fakta utama pergerakan, dan mengapa?"
- *Target Answer*: Haversine adalah fakta utama karena tidak terikat infrastruktur jalan darat (infrastructure-agnostic) dan mengukur perpindahan koordinat fisik (displacement). OSRM tidak akurat karena melakukan snapping ke jalan raya terdekat di daratan yang tidak pernah dilalui perahu.
