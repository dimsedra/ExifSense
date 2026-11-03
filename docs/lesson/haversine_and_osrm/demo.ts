// docs/lesson/haversine_and_osrm/demo.ts
//
// Educational companion script for learning:
// 1. Haversine distance formula (great-circle straight-line displacement).
// 2. Real-world road routing via OSRM (Open Source Routing Machine).
//
// This script breaks down the mathematics line-by-line and contrasts
// geometric coordinate math against real graph-based road networks.

// Radius rata-rata bumi dalam kilometer.
// Bumi sebenarnya berbentuk oblate spheroid (agak pepat di kutub), namun untuk
// kebutuhan umum EXIF dan pemetaan jarak, aproksimasi bola bulat dengan radius
// 6.371 km memberikan akurasi sangat tinggi dengan deviasi di bawah 0.5%.
const EARTH_RADIUS_KM = 6371;

/**
 * Konversi derajat sudut (0-360) ke radian (0-2*PI).
 *
 * Mengapa ini diperlukan:
 * Fungsi trigonometri bawaan JavaScript (Math.sin, Math.cos) beroperasi pada satuan
 * radian, bukan derajat. 1 putaran penuh (360 derajat) sama dengan 2 * PI radian.
 * Rumusnya: radian = derajat * (PI / 180).
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export interface HaversineTrace {
  lat1Rad: number;
  lat2Rad: number;
  dLatRad: number;
  dLonRad: number;
  termLat: number;
  cosScaling: number;
  termLon: number;
  a: number;
  clampedA: number;
  cRad: number;
  distanceKm: number;
}

/**
 * Menghitung jarak Haversine dengan mencatat setiap langkah kalkulasi internal.
 */
export function calculateHaversineWithTrace(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): HaversineTrace {
  // Baris 1-2: Hitung selisih lintang (delta latitude) dan selisih bujur (delta longitude)
  // lalu langsung konversi ke radian. Nilai ini mewakili perpindahan sudut relatif.
  const dLatRad = toRadians(lat2 - lat1);
  const dLonRad = toRadians(lon2 - lon1);

  // Baris 3-4: Konversi kedua latitude absolut ke radian.
  // Nilai ini dibutuhkan untuk menghitung penyusutan jarak garis bujur saat menjauhi khatulistiwa.
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  // Baris 5: Hitung kontribusi perpindahan utara-selatan (latitude).
  // Menggunakan sin^2(dLat / 2). Tidak memerlukan faktor pengali karena jarak antar
  // garis lintang relatif konstan dari khatulistiwa hingga kutub.
  const termLat = Math.sin(dLatRad / 2) * Math.sin(dLatRad / 2);

  // Baris 6: Hitung faktor skala kelengkungan (latitude scaling factor).
  // Garis bujur (longitude) semakin menyempit saat mendekati kutub dan melebar di khatulistiwa.
  // Perkalian cos(lat1) * cos(lat2) menyusutkan jarak bujur secara proporsional terhadap garis lintang.
  const cosScaling = Math.cos(lat1Rad) * Math.cos(lat2Rad);

  // Baris 7: Hitung kontribusi perpindahan timur-barat (longitude).
  // Komponen sin^2(dLon / 2) dikalikan dengan cosScaling agar pergeseran garis bujur di kutub
  // tidak menghasilkan jarak fisik yang sama dengan di khatulistiwa.
  const termLon = cosScaling * Math.sin(dLonRad / 2) * Math.sin(dLonRad / 2);

  // Baris 8: Jumlahkan kedua komponen untuk mendapatkan nilai `a`.
  // Nilai `a` ini secara geometris adalah kuadrat dari separuh panjang tali busur
  // (half-chord length squared) yang menembus bola bumi di antara kedua titik.
  const a = termLat + termLon;

  // Baris 9: Pengamanan pembulatan bilangan pecahan (floating-point clamping).
  // Karena keterbatasan presisi biner pada komputer, untuk dua titik yang saling berlawanan
  // persis di muka bumi (titik antipodal), nilai `a` bisa sedikit melebihi 1 (misal 1.0000000000000002).
  // Jika `a > 1`, operasi Math.sqrt(1 - a) pada langkah berikutnya akan mencoba mengakarkan
  // bilangan negatif sehingga menghasilkan NaN (Not-a-Number). Baris ini mencegah bug tersebut.
  const clampedA = Math.min(1, Math.max(0, a));

  // Baris 10: Hitung sudut sentral lengkungan bumi `c` dalam radian.
  // Kita menggunakan Math.atan2(sqrt(a), sqrt(1 - a)) alih-alih acos(1 - 2*a).
  // Alasan: fungsi acos memiliki presisi numerik yang sangat buruk di komputer saat sudut mendekati nol
  // (misal dua foto diambil hanya berjarak 5 meter). Math.atan2 menjaga stabilitas presisi tinggi.
  const cRad = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(Math.max(0, 1 - clampedA)));

  // Baris 11: Hitung jarak fisik di permukaan bumi.
  // Dari definisi sudut radian (panjang busur = radius * sudut radian), kita cukup
  // mengalikan jari-jari bumi EARTH_RADIUS_KM dengan besar sudut sentral cRad.
  const distanceKm = EARTH_RADIUS_KM * cRad;

  return {
    lat1Rad,
    lat2Rad,
    dLatRad,
    dLonRad,
    termLat,
    cosScaling,
    termLon,
    a,
    clampedA,
    cRad,
    distanceKm,
  };
}

/**
 * Mengambil detail rute jalan berkendara dari server OSRM (Open Source Routing Machine).
 */
export async function fetchOsrmDrivingDistance(
  coords: Array<{ lat: number; lng: number }>
): Promise<{ totalDistanceKm: number; legDistancesKm: number[]; code: string } | null> {
  // Format koordinat OSRM mengikuti standar GeoJSON: longitude,latitude (bukan lat,lng!).
  // Beberapa titik dihubungkan dengan tanda titik-koma (;).
  const coordsStr = coords.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=false`;

  try {
    // Kita pasang AbortController dengan batas waktu 5 detik agar jika koneksi internet terputus
    // atau server OSRM mengalami gangguan, proses analisis tidak akan hang (graceful timeout).
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;

    // Response OSRM memuat `distance` total dalam satuan meter dan array `legs` untuk tiap segmen jalan.
    const data = (await response.json()) as {
      code: string;
      routes?: Array<{
        distance?: number;
        legs?: Array<{ distance?: number }>;
      }>;
    };

    if (data.code === 'Ok' && data.routes?.[0]) {
      const primary = data.routes[0];
      // Konversi meter ke kilometer untuk disetarakan dengan satuan Haversine.
      const totalDistanceKm = (primary.distance || 0) / 1000;
      const legDistancesKm = (primary.legs || []).map((leg) => (leg.distance || 0) / 1000);
      return { totalDistanceKm, legDistancesKm, code: data.code };
    }
  } catch {
    // Jika offline atau fetch gagal, kita tangkap error secara bersih dan kembalikan null
    // sehingga sistem tetap bisa melanjutkan analisis menggunakan jarak Haversine.
    return null;
  }
  return null;
}

async function runDemo() {
  console.log('--- DEMO 1: Kalkulasi Haversine Langkah Demi Langkah ---');
  // Titik nyata: Monas ke Bundaran HI di Jakarta
  const monas = { lat: -6.175392, lng: 106.827153, label: 'Monas' };
  const bundaranHi = { lat: -6.195000, lng: 106.823000, label: 'Bundaran HI' };

  console.log(`Input Titik A (${monas.label})      : lat=${monas.lat}, lon=${monas.lng}`);
  console.log(`Input Titik B (${bundaranHi.label}): lat=${bundaranHi.lat}, lon=${bundaranHi.lng}`);

  const trace = calculateHaversineWithTrace(monas.lat, monas.lng, bundaranHi.lat, bundaranHi.lng);

  console.log('\n[Langkah 1: Konversi Derajat ke Radian]');
  console.log(`  dLatRad = (${bundaranHi.lat} - ${monas.lat}) * PI / 180 = ${trace.dLatRad.toFixed(8)} rad`);
  console.log(`  dLonRad = (${bundaranHi.lng} - ${monas.lng}) * PI / 180 = ${trace.dLonRad.toFixed(8)} rad`);

  console.log('\n[Langkah 2: Menghitung Komponen a (Separuh Kuadrat Tali Busur)]');
  console.log(`  termLat    = sin²(dLatRad / 2)             = ${trace.termLat.toExponential(6)}`);
  console.log(`  cosScaling = cos(lat1Rad) * cos(lat2Rad)    = ${trace.cosScaling.toFixed(6)}`);
  console.log(`  termLon    = cosScaling * sin²(dLonRad / 2) = ${trace.termLon.toExponential(6)}`);
  console.log(`  a          = termLat + termLon              = ${trace.a.toExponential(6)}`);

  console.log('\n[Langkah 3: Pengamanan & Sudut Sentral Lengkungan Bumi]');
  console.log(`  clampedA   = Math.min(1, Math.max(0, a))    = ${trace.clampedA.toExponential(6)}`);
  console.log(`  cRad       = 2 * atan2(√a, √(1-a))          = ${trace.cRad.toFixed(8)} rad`);
  console.log(`  distanceKm = 6371 * cRad                    = ${trace.distanceKm.toFixed(3)} km (${(trace.distanceKm * 1000).toFixed(1)} m)`);

  console.log('\n--- DEMO 2: Pembuktian Pentingnya Faktor Skala cos(lat) ---');
  // Menghitung jarak fisik dari pergeseran 1 derajat garis bujur di lintang berbeda
  const distEquator = calculateHaversineWithTrace(0, 0, 0, 1).distanceKm;
  const distNearPole = calculateHaversineWithTrace(80, 0, 80, 1).distanceKm;
  console.log(`Pergeseran 1° bujur di Khatulistiwa (lat 0°) : ${distEquator.toFixed(2)} km`);
  console.log(`Pergeseran 1° bujur di dekat Kutub  (lat 80°): ${distNearPole.toFixed(2)} km`);
  console.log(`Rasio penyusutan fisik: ${(distNearPole / distEquator).toFixed(4)} (persis sama dengan nilai cos(80°) = ${Math.cos(toRadians(80)).toFixed(4)})`);

  console.log('\n--- DEMO 3: Mengapa atan2 Lebih Aman Dibanding acos pada Jarak Pendek ---');
  // Simulasi dua foto yang diambil berjarak ~5 meter (0.000045 derajat lintang)
  const fiveMetersDeltaLat = 5 / 111000;
  const shortTrace = calculateHaversineWithTrace(0, 0, fiveMetersDeltaLat, 0);
  const naiveAcosRad = Math.acos(Math.max(-1, Math.min(1, 1 - 2 * shortTrace.clampedA)));
  console.log(`Jarak target pergeseran: ~5 meter`);
  console.log(`Hasil via atan2 : ${(shortTrace.distanceKm * 1000).toFixed(4)} meter`);
  console.log(`Hasil via acos  : ${(EARTH_RADIUS_KM * naiveAcosRad * 1000).toFixed(4)} meter`);

  console.log('\n--- DEMO 4: Kontras Haversine (Garis Lurus) vs OSRM (Rute Jalan Nyata) ---');
  console.log('Mengambil data rute jalan berkendara dari server publik OSRM...');
  const osrm = await fetchOsrmDrivingDistance([
    { lat: monas.lat, lng: monas.lng },
    { lat: bundaranHi.lat, lng: bundaranHi.lng },
  ]);

  if (osrm) {
    console.log(`1. Displacement (Garis Lurus Haversine): ${trace.distanceKm.toFixed(3)} km`);
    console.log(`2. Road Route   (Rute Jalan OSRM)     : ${osrm.totalDistanceKm.toFixed(3)} km`);
    const ratio = (osrm.totalDistanceKm / trace.distanceKm).toFixed(2);
    console.log(`Faktor perbedaan jarak: ${ratio}x lebih jauh lewat jalan raya dibanding garis lurus.`);
  } else {
    console.log('Panggilan ke OSRM gagal atau offline. Analisis sistem tetap berjalan dengan fallback Haversine.');
  }
}

runDemo();
