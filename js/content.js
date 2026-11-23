/* =====================================================================
   ISI PANEL METODOLOGI — gaya ringkas laporan teknis. Boleh diedit langsung.
   Sumber angka: log pengolahan 01-prep/, 05-validasi/, 06-dampak/ dan
   docs/model_terkunci.md. Tabel uji 2026 dibaca dari validasi_2026.csv.
   ===================================================================== */
const KONTEN = [
  { id: "gambaran", judul: "Ringkasan model", html: `
    <table class="tbl"><tbody>
    <tr><th>Metode</th><td>AHP – <i>weighted overlay</i>, 5 kriteria</td></tr>
    <tr><th>Unit analisis</th><td>Grid 1 × 1 km, 37.124 sel (13 kab/kota)</td></tr>
    <tr><th>CRS analisis</th><td>WGS 84 / UTM 50S (EPSG:32750)</td></tr>
    <tr><th>Kalibrasi</th><td>Titik api VIIRS Jun–Okt 2022–2025</td></tr>
    <tr><th>Uji independen</th><td>Titik api VIIRS Jan–Okt 2026</td></tr>
    <tr><th>Keluaran</th><td>IB100 (0–100), 3 kelas bahaya, zona dampak 2026</td></tr>
    </tbody></table>
    <p class="note">Peta adalah hasil model terkunci (putaran 3) yang diolah di QGIS; dashboard tidak menghitung ulang.</p>` },

  { id: "parameter", judul: "Kriteria, bobot & skor", html: `
    <table class="tbl"><thead><tr><th>Kriteria</th><th>Dataset</th><th class="r">Bobot</th></tr></thead><tbody>
    <tr><td>C1 Tutupan lahan</td><td>Dynamic World 2024, 10 m</td><td class="r">0,3944</td></tr>
    <tr><td>C2 Gambut</td><td>BIG 2024, vektor</td><td class="r">0,2372</td></tr>
    <tr><td>C3 Curah hujan Jun–Okt</td><td>CHIRPS v3, 2022–2026</td><td class="r">0,2372</td></tr>
    <tr><td>C4 Jarak jalan/sungai</td><td>OSM, raster 100 m</td><td class="r">0,0656</td></tr>
    <tr><td>C5 Lereng</td><td>Copernicus GLO-30, 30 m</td><td class="r">0,0656</td></tr></tbody></table>
    <ul class="list">
    <li><b>C1</b>: semak, lahan terbuka 5 · rumput, vegetasi tergenang 4 · hutan/kebun, pertanian 2 · air, terbangun 1</li>
    <li><b>C2</b>: &gt; 300 cm 5 · 200–300 cm 4 · 100–200 cm 3 · &lt; 100 cm / tanpa keterangan 2 · non-gambut 1</li>
    <li><b>C3</b> (mm/bln): &lt; 100 5 · 100–120 4 · 120–150 3 · 150–200 2 · ≥ 200 1</li>
    <li><b>C4</b> (km): &lt; 1 5 · 1–2 4 · 2–3 3 · 3–5 2 · ≥ 5 1</li>
    <li><b>C5</b> (%): 0–2 5 · 2–8 4 · 8–15 3 · 15–25 2 · ≥ 25 1</li></ul>` },

  { id: "sumber", judul: "Sumber data", html: `
    <table class="tbl"><thead><tr><th>Data</th><th>Sumber</th><th>Resolusi / periode</th></tr></thead><tbody>
    <tr><td>Tutupan lahan</td><td>Dynamic World V1</td><td>10 m · 2024</td></tr>
    <tr><td>Gambut</td><td>BIG 1:50.000</td><td>vektor · 2024</td></tr>
    <tr><td>Curah hujan</td><td>CHIRPS v3 bulanan</td><td>0,05° · Jun–Okt 2022–2026</td></tr>
    <tr><td>Elevasi</td><td>Copernicus DEM GLO-30</td><td>30 m</td></tr>
    <tr><td>Jalan, sungai, kanal, permukiman</td><td>OpenStreetMap (Geofabrik)</td><td>vektor · 2026</td></tr>
    <tr><td>Titik api</td><td>NASA FIRMS VIIRS S-NPP</td><td>375 m · 2022–2025 arsip; 2026 arsip + NRT</td></tr>
    <tr><td>Penduduk</td><td>WorldPop R2025A + BPS</td><td>1 km · 2026</td></tr>
    <tr><td>Batas administrasi</td><td>BIG</td><td>vektor · 13 kab/kota</td></tr></tbody></table>
    <p class="note">Analisis: EPSG:32750, grid 1 km. Tampilan: Web Mercator (EPSG:3857).</p>` },

  { id: "prep", judul: "Pra-pengolahan", html: `
    <ul class="list">
    <li>LULC 10 m → kelas modus per sel (100 × 100 piksel)</li>
    <li>CHIRPS → grid 1 km, rata-rata Jun–Okt (mm/bln)</li>
    <li>DEM 30 m → lereng (%) → rata-rata per sel; rerata 12,66%</li>
    <li>OSM: 128.636 ruas jalan, 5.830 sungai/kanal → raster 100 m → jarak Euclidean</li>
    <li>Gambut: 24 poligon (46.086 ha) → raster 100 m → skor modus</li>
    <li>Titik api: confidence n/h, TYPE = 0, duplikat dibuang, hanya sel Kalsel</li>
    <li>WorldPop: resampling <i>sum</i> 1 km, faktor BPS per kab 0,982–1,089</li></ul>` },

  { id: "ahp", judul: "Pembobotan AHP", html: `
    <table class="tbl mono"><thead><tr><th></th><th>C1</th><th>C2</th><th>C3</th><th>C4</th><th>C5</th></tr></thead><tbody>
    <tr><th>C1</th><td>1</td><td>2</td><td>2</td><td>5</td><td>5</td></tr>
    <tr><th>C2</th><td>1/2</td><td>1</td><td>1</td><td>4</td><td>4</td></tr>
    <tr><th>C3</th><td>1/2</td><td>1</td><td>1</td><td>4</td><td>4</td></tr>
    <tr><th>C4</th><td>1/5</td><td>1/4</td><td>1/4</td><td>1</td><td>1</td></tr>
    <tr><th>C5</th><td>1/5</td><td>1/4</td><td>1/4</td><td>1</td><td>1</td></tr></tbody></table>
    <p class="note">λmaks 5,0355 · CI 0,0089 · RI 1,12 · CR 0,0079 (≤ 0,10)</p>` },

  { id: "overlay", judul: "Overlay & klasifikasi", html: `
    <p><code>IB = Σ w<sub>k</sub> · s<sub>k</sub></code> &nbsp; <code>IB100 = (IB − 1) / 4 × 100</code></p>
    <table class="tbl"><thead><tr><th>Kelas</th><th>Rentang IB100</th></tr></thead><tbody>
    <tr><td>Rendah</td><td>&lt; 40</td></tr><tr><td>Sedang</td><td>40 – &lt; 70</td></tr><tr><td>Tinggi</td><td>≥ 70</td></tr></tbody></table>
    <p class="note">Ambang tetap untuk 2022–2026 agar antartahun dapat dibandingkan.</p>` },

  { id: "validasi", judul: "Kalibrasi & validasi", html: `
    <table class="tbl"><thead><tr><th>Putaran</th><th>Perubahan</th><th class="r">AUC</th></tr></thead><tbody>
    <tr><td>0</td><td>Skor dan bobot awal</td><td class="r">0,560</td></tr>
    <tr><td>1</td><td>Skor C1 mengikuti FR</td><td class="r">0,565</td></tr>
    <tr><td>2</td><td>Bobot C4 = C5</td><td class="r">0,571</td></tr>
    <tr><td>3</td><td>Kelas lereng 0–2% dipisah</td><td class="r"><b>0,587</b></td></tr></tbody></table>
    <p class="note">AUC putaran 3: 2022 0,528 · 2023 0,686 · 2024 0,557 · 2025 0,579.</p>
    <p class="lbl">Uji independen 2026 (validasi_2026.csv)</p>
    <div id="tabel-validasi" class="muted">Memuat…</div>` },

  { id: "dampak", judul: "Analisis dampak", html: `
    <ul class="list">
    <li>Zona dampak: sel kelas Tinggi 2026 (486 km²)</li>
    <li>Penduduk: WorldPop 2026 terkalibrasi BPS per kab/kota</li>
    <li>Permukiman: OSM <code>landuse=residential</code></li>
    <li>Gambut dan tutupan lahan: irisan dengan zona Tinggi</li>
    <li>Prioritas: rata-rata peringkat jiwa terpapar dan % luas Tinggi</li></ul>` },

  { id: "keterbatasan", judul: "Keterbatasan", html: `
    <ul class="list">
    <li>Resolusi 1 km menggeneralisasi kebakaran kecil</li>
    <li>LULC statis 2024 untuk seluruh periode 2022–2026</li>
    <li>62% luas gambut tanpa data kedalaman (skor 2)</li>
    <li>CHIRPS seragam dalam satu tahun (2026: seluruh sel skor 5)</li>
    <li>72,41% sel &lt; 1 km dari jalan/sungai; permukiman OSM belum lengkap</li>
    <li>Titik api ≠ area terbakar; NRT 2026 tanpa atribut TYPE</li>
    <li>Kelas Sedang lebar: 80,45% luas, rasio kepadatan 1,056</li></ul>` },

  { id: "lanjutan", judul: "Pengembangan", html: `
    <p class="note">Skor per sel tersedia di <code>data/grid/nilai_sel.json</code> untuk simulasi bobot di peramban (belum diimplementasikan).</p>` }
];
