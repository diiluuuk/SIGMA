/* =====================================================================
   ISI PANEL METODOLOGI & INFORMASI — boleh diedit langsung.
   Angka di sini berasal dari dokumen hasil analisis:
   docs/log_kalibrasi.md, docs/model_terkunci.md, 05-validasi/validasi_2026.csv
   ===================================================================== */
const KONTEN = [
  { id: "gambaran", judul: "Gambaran umum", html: `
    <p>Kalimantan Selatan memiliki lahan rawa dan gambut di dataran rendah bagian barat–selatan serta Pegunungan Meratus
    di bagian tengah–timur. Kebakaran hutan dan lahan (karhutla) berulang pada musim kemarau, terutama pada tahun kering
    seperti El Niño 2023 dan 2026.</p>
    <p>Dashboard ini menyajikan <b>model bahaya titik api</b> (fokus hotspot) berbasis AHP–weighted overlay pada grid 1 km,
    validasinya terhadap hotspot VIIRS, serta <b>analisis dampak</b> (penduduk, permukiman, gambut, tutupan lahan) pada zona bahaya Tinggi 2026.</p>
    <p class="muted">Dashboard ini adalah media visualisasi hasil pengolahan SIG di QGIS, bukan alat pemodelan.</p>` },

  { id: "parameter", judul: "Parameter model", html: `
    <table class="tbl"><thead><tr><th>Kriteria</th><th>Data</th><th>Bobot</th></tr></thead><tbody>
    <tr><td>C1 Tutupan lahan</td><td>Dynamic World 2024</td><td>0,394</td></tr>
    <tr><td>C2 Gambut</td><td>Peta gambut BIG 1:50.000</td><td>0,237</td></tr>
    <tr><td>C3 Curah hujan Jun–Okt</td><td>CHIRPS v3 2022–2026</td><td>0,237</td></tr>
    <tr><td>C4 Akses (jalan, sungai, kanal)</td><td>OpenStreetMap 2026</td><td>0,066</td></tr>
    <tr><td>C5 Kemiringan lereng</td><td>Copernicus DEM GLO-30</td><td>0,066</td></tr></tbody></table>
    <p>Setiap parameter direklasifikasi ke skor 1–5 (5 = paling rawan). Lereng dibalik: lahan datar 0–2% diberi skor 5.</p>` },

  { id: "sumber", judul: "Sumber data & tahun", html: `
    <ul class="list">
    <li>Tutupan lahan: Dynamic World V1 2024 (Brown et al., 2022) — Google Earth Engine</li>
    <li>Lahan gambut: BIG, skala 1:50.000 (2024)</li>
    <li>Curah hujan: CHIRPS v3 bulanan Juni–Oktober 2022–2026 (CHC UCSB)</li>
    <li>Jalan, sungai, kanal, permukiman: OpenStreetMap (Geofabrik, 2026)</li>
    <li>DEM: Copernicus DEM GLO-30 (ESA)</li>
    <li>Hotspot: NASA FIRMS VIIRS S-NPP 375 m, 2022–2025 (arsip) dan Jan–Okt 2026 (arsip + NRT)</li>
    <li>Penduduk: WorldPop 2026 1 km (R2025A) dikalibrasi BPS 2026 per kab/kota</li>
    <li>Batas administrasi: BIG</li></ul>
    <p class="muted">Sistem koordinat analisis: WGS 1984 UTM Zona 50S (EPSG:32750), grid 1 km. Ditampilkan di Web Mercator.</p>` },

  { id: "ahp", judul: "Pembobotan AHP", html: `
    <p>Matriks perbandingan berpasangan skala Saaty 1–9 (hasil kalibrasi putaran 2–3):</p>
    <table class="tbl mono"><thead><tr><th></th><th>C1</th><th>C2</th><th>C3</th><th>C4</th><th>C5</th></tr></thead><tbody>
    <tr><th>C1</th><td>1</td><td>2</td><td>2</td><td>5</td><td>5</td></tr>
    <tr><th>C2</th><td>1/2</td><td>1</td><td>1</td><td>4</td><td>4</td></tr>
    <tr><th>C3</th><td>1/2</td><td>1</td><td>1</td><td>4</td><td>4</td></tr>
    <tr><th>C4</th><td>1/5</td><td>1/4</td><td>1/4</td><td>1</td><td>1</td></tr>
    <tr><th>C5</th><td>1/5</td><td>1/4</td><td>1/4</td><td>1</td><td>1</td></tr></tbody></table>
    <p>λmax = 5,035 · CI = 0,009 · RI = 1,12 · <b>CR = 0,008</b> (≤ 0,10, konsisten).</p>` },

  { id: "overlay", judul: "Weighted overlay & klasifikasi", html: `
    <p><code>IB = 0,394·S<sub>LULC</sub> + 0,237·S<sub>gambut</sub> + 0,237·S<sub>hujan</sub> + 0,066·S<sub>akses</sub> + 0,066·S<sub>lereng</sub></code></p>
    <p><code>IB100 = (IB − 1) / 4 × 100</code></p>
    <p>Kelas (Suryoprayogo et al., 2026): <b>Rendah</b> IB100 &lt; 40 · <b>Sedang</b> 40–69,9 · <b>Tinggi</b> ≥ 70.
    Ambang sama untuk semua tahun sehingga peta antartahun dapat dibandingkan.</p>` },

  { id: "validasi", judul: "Kalibrasi & validasi", html: `
    <p><b>Kalibrasi 2022–2025</b> (3 putaran revisi, data hotspot 2022–2025):</p>
    <table class="tbl"><thead><tr><th>Putaran</th><th>Perubahan</th><th>AUC rata-rata</th></tr></thead><tbody>
    <tr><td>0</td><td>Model sesuai deck</td><td>0,560</td></tr>
    <tr><td>1</td><td>Skor tutupan lahan mengikuti FR</td><td>0,565</td></tr>
    <tr><td>2</td><td>Bobot akses = lereng</td><td>0,571</td></tr>
    <tr><td>3</td><td>Kelas lereng 0–2% dipisah</td><td><b>0,587</b></td></tr></tbody></table>
    <p class="muted">AUC per tahun (putaran 3): 2022 0,528 · 2023 0,686 · 2024 0,557 · 2025 0,579. AUC sel–tahun gabungan 0,776.</p>
    <p><b>Uji independen 2026</b> (model terkunci, dibaca dari <code>validasi_2026.csv</code>):</p>
    <div id="tabel-validasi" class="muted">Memuat…</div>` },

  { id: "dampak", judul: "Analisis dampak", html: `
    <p>Zona dampak = sel kelas <b>Tinggi</b> peta 2026. Dihitung per kabupaten/kota: luas per kelas, jumlah penduduk
    (WorldPop terkalibrasi BPS), permukiman OSM, gambut, dan tutupan lahan di zona Tinggi.</p>
    <p>Peringkat prioritas = rata-rata peringkat jiwa terpapar dan peringkat % luas zona Tinggi (1 = paling prioritas).</p>` },

  { id: "keterbatasan", judul: "Keterbatasan & ketidakpastian", html: `
    <ul class="list">
    <li>AUC belum mencapai target 0,75: kemampuan membedakan lokasi dalam satu tahun masih lemah.</li>
    <li>Tutupan lahan global: 87% sel berkelas pohon (perkebunan ikut di dalamnya).</li>
    <li>Data gambut BIG hanya 46.086 ha; 62% poligon tanpa keterangan kedalaman (diasumsikan dangkal).</li>
    <li>CHIRPS kasar (±5,5 km) dan hampir seragam dalam satu tahun.</li>
    <li>Jaringan OSM rapat (72% sel &lt; 1 km dari jalan/sungai) dan data permukiman OSM belum lengkap.</li>
    <li>Hotspot tidak selalu berarti kebakaran; data NRT 2026 tidak memiliki atribut TYPE.</li>
    <li>Copernicus DEM merekam permukaan termasuk tajuk pohon.</li></ul>` },

  { id: "lanjutan", judul: "Pengembangan lanjutan", html: `
    <p>Struktur nilai skor per sel sudah tersedia di <code>data/grid/nilai_sel.json</code> sehingga simulasi bobot
    di peramban dapat dikembangkan.</p>
    <button class="btn" disabled title="Belum diimplementasikan">Simulasi bobot (belum tersedia)</button>
    <p class="muted">Fitur ini belum diimplementasikan; seluruh peta di dashboard adalah hasil model terkunci.</p>` }
];
