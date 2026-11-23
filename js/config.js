/* =====================================================================
   KONFIGURASI DATA SIGMA - WebGIS Karhutla Kalimantan Selatan
   Ubah path, nama, warna, sumber, dan status layer DI FILE INI SAJA.
   - type: "image"   = raster hasil SIG yang sudah diwarnai (PNG + bounds di data/raster_bounds.json)
           "geojson" = vektor GeoJSON (EPSG:4326)
           "hotspot" = titik hotspot GeoJSON (per tahun)
           "choropleth" = poligon kab/kota diwarnai dari field atribut
   - file: path relatif terhadap folder data/. "{tahun}" diganti tahun terpilih.
   - status: "tersedia" | "belum" (layer "belum" tampil sebagai "Data belum tersedia")
   ===================================================================== */
const CONFIG = {
  app: {
    judul: "SIGMA",
    subjudul: "WebGIS Karhutla di Provinsi Kalimantan Selatan",
    periode: "Kalibrasi model 2022–2025 · Uji independen 2026 (Jan–Okt)",
    diperbarui: "22 November 2026",
    pembuat: "Kelompok 2 · GD4103 Sistem Informasi Geografis · Teknik Geodesi dan Geomatika ITB",
    pusat: [-2.95, 115.45],
    zoom: 8,
    batas: [[-4.25, 114.3], [-1.3, 116.6]],   // tampilan awal = seluruh Kalsel
    dataDir: "data/"
  },

  tahun: [2022, 2023, 2024, 2025, 2026],
  tahunAwal: 2026,
  tahunDampak: 2026,              // analisis dampak/keterpaparan hanya untuk tahun uji

  // Ambang kelas MENGIKUTI hasil klasifikasi pengolahan SIG (jangan diubah otomatis)
  kelas: [
    { kode: 1, nama: "Rendah", rentang: "IB100 < 40",       warna: "#f7d000", ket: "Bahaya rendah" },
    { kode: 2, nama: "Sedang", rentang: "40 ≤ IB100 < 70",  warna: "#f28c00", ket: "Bahaya sedang" },
    { kode: 3, nama: "Tinggi", rentang: "IB100 ≥ 70",       warna: "#d7191c", ket: "Bahaya tinggi" }
  ],

  tutupanLahan: [
    ["Air", "#419bdf", 1], ["Pohon/hutan & kebun", "#397d49", 2], ["Rumput", "#88b053", 4],
    ["Vegetasi tergenang", "#7a87c6", 4], ["Tanaman pertanian", "#e49635", 2], ["Semak belukar", "#dfc35a", 5],
    ["Lahan terbangun", "#c4281b", 1], ["Lahan terbuka", "#a59b8f", 5], ["Salju/es", "#b39fe1", 1]
  ],

  basemaps: {
    "OpenStreetMap": { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                       attribution: "&copy; OpenStreetMap contributors", maxZoom: 18 },
    "Esri World Imagery (Satelit)": { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                       attribution: "Tiles &copy; Esri", maxZoom: 18 }
  },

  grupLayer: [
    { id: "parameter", nama: "Parameter Bahaya" },
    { id: "model",     nama: "Hasil Pemodelan" },
    { id: "kejadian",  nama: "Data Kejadian" },
    { id: "dampak",    nama: "Analisis Dampak" },
    { id: "admin",     nama: "Batas Administrasi" }
  ],

  layers: [
    /* ---------------- PARAMETER ---------------- */
    { id: "tutupan_lahan", grup: "parameter", nama: "Tutupan lahan 2024", type: "image",
      file: "parameter/tutupan_lahan_2024", opacity: 0.85, visible: false, status: "tersedia",
      legend: { type: "kategori", judul: "Tutupan lahan (Dynamic World)", items: "tutupanLahan" },
      sumber: "Dynamic World V1 (Brown et al., 2022), Google Earth Engine", tahunData: "2024",
      resolusi: "10 m → kelas dominan per sel 1 km", kriteria: "C1 · bobot 0,394",
      deskripsi: "Kelas tutupan lahan dominan (annual mode 2024) per sel 1 km." },

    { id: "gambut", grup: "parameter", nama: "Lahan gambut", type: "geojson",
      file: "parameter/gambut.geojson", opacity: 0.8, visible: false, status: "tersedia",
      style: { field: "kedalaman", warna: {
        "< 100 cm": "#e6c79c", "tanpa keterangan (diasumsikan dangkal)": "#f3e3c3",
        "100-200 cm": "#c99a5b", "200-300 cm": "#8c5a2b", "> 300 cm": "#4a2c12" }, garis: "#5a3a1a" },
      legend: { type: "kategori", judul: "Kedalaman gambut", items: [
        ["#e6c79c", "< 100 cm · skor 2"], ["#f3e3c3", "Tidak tercatat (diasumsikan dangkal) · skor 2"], ["#c99a5b", "100–200 cm · skor 3"],
        ["#8c5a2b", "200–300 cm · skor 4"], ["#4a2c12", "> 300 cm · skor 5"]] },
      popup: [["kedalaman", "Kedalaman"], ["landform", "Landform"], ["skor_gbt", "Skor kerawanan"], ["luas_ha", "Luas (ha)", "ha"]],
      sumber: "Peta lahan gambut skala 1:50.000, BIG (2024)", tahunData: "2024", resolusi: "Vektor 1:50.000",
      kriteria: "C2 · bobot 0,237", deskripsi: "Poligon lahan gambut dan kelas kedalamannya dari atribut landform." },

    { id: "curah_hujan", grup: "parameter", nama: "Curah hujan Jun–Okt", type: "image", temporal: true,
      file: "parameter/curah_hujan_{tahun}", opacity: 0.75, visible: false, status: "tersedia",
      legend: { type: "kategori", judul: "Curah hujan rata-rata (mm/bulan)", items: [
        ["#b2182b", "< 100 · skor 5"], ["#ef8a62", "100 – 120 · skor 4"], ["#fddbc7", "120 – 150 · skor 3"], ["#67a9cf", "150 – 200 · skor 2"], ["#2166ac", "≥ 200 · skor 1"]] },
      sumber: "CHIRPS v3 bulanan (CHC UCSB), Google Earth Engine", tahunData: "2022–2026 (Juni–Oktober)",
      resolusi: "±5,5 km → grid 1 km", kriteria: "C3 · bobot 0,237",
      deskripsi: "Rata-rata curah hujan bulanan musim kemarau (Juni–Oktober) setiap tahun." },

    { id: "kemiringan_lereng", grup: "parameter", nama: "Kemiringan lereng", type: "image",
      file: "parameter/kemiringan_lereng", opacity: 0.8, visible: false, status: "tersedia",
      legend: { type: "kategori", judul: "Kemiringan lereng (%)", items: [
        ["#ffffcc", "0 – 2 · skor 5"], ["#c2e699", "2 – 8 · skor 4"], ["#78c679", "8 – 15 · skor 3"], ["#31a354", "15 – 25 · skor 2"], ["#006837", "25 – 40 · skor 1"], ["#00341c", "> 40 · skor 1"]] },
      sumber: "Copernicus DEM GLO-30 (ESA), Google Earth Engine", tahunData: "DEM rilis 2021",
      resolusi: "30 m → rata-rata 1 km", kriteria: "C5 · bobot 0,066",
      deskripsi: "Lereng dihitung pada resolusi 30 m lalu dirata-ratakan per sel 1 km." },

    { id: "aksesibilitas", grup: "parameter", nama: "Jarak ke jalan, sungai, kanal", type: "image",
      file: "parameter/aksesibilitas", opacity: 0.8, visible: false, status: "tersedia",
      legend: { type: "kategori", judul: "Jarak (Euclidean)", items: [
        ["#d7191c", "< 1 km · skor 5"], ["#fdae61", "1 – 2 km · skor 4"], ["#ffffbf", "2 – 3 km · skor 3"], ["#a6d96a", "3 – 5 km · skor 2"], ["#1a9641", "≥ 5 km · skor 1"]] },
      sumber: "OpenStreetMap (Geofabrik, 2026)", tahunData: "2026", resolusi: "100 m → titik tengah sel 1 km",
      kriteria: "C4 · bobot 0,066", deskripsi: "Jarak dari titik tengah sel ke jalan, sungai, kanal, atau parit terdekat." },

    /* ---------------- MODEL ---------------- */
    { id: "indeks_bahaya", grup: "model", nama: "Indeks bahaya (IB100)", type: "image", temporal: true,
      file: "model/indeks_bahaya_{tahun}", opacity: 0.8, visible: false, status: "tersedia",
      legend: { type: "gradien", judul: "Indeks bahaya (0–100)", stops: [["#fff7bc", 20], ["#fee391", 40], ["#fe9929", 55], ["#d7191c", 70], ["#67000d", 85]] },
      sumber: "Model AHP–weighted overlay terkunci (kalibrasi putaran 3)", tahunData: "2022–2026",
      resolusi: "1 km", deskripsi: "IB100 = (IB − 1)/4 × 100; IB = Σ bobot × skor 5 kriteria." },
    { id: "kelas_rendah", grup: "model", nama: "Kelas bahaya Rendah", type: "image", temporal: true, kelas: 1,
      file: "model/kelas_{tahun}_1", opacity: 0.75, visible: true, status: "tersedia",
      legend: { type: "kelas", kode: 1 }, sumber: "Model terkunci", tahunData: "2022–2026", resolusi: "1 km",
      deskripsi: "Sel dengan IB100 < 40." },
    { id: "kelas_sedang", grup: "model", nama: "Kelas bahaya Sedang", type: "image", temporal: true, kelas: 2,
      file: "model/kelas_{tahun}_2", opacity: 0.75, visible: true, status: "tersedia",
      legend: { type: "kelas", kode: 2 }, sumber: "Model terkunci", tahunData: "2022–2026", resolusi: "1 km",
      deskripsi: "Sel dengan 40 ≤ IB100 < 70." },
    { id: "kelas_tinggi", grup: "model", nama: "Kelas bahaya Tinggi", type: "image", temporal: true, kelas: 3,
      file: "model/kelas_{tahun}_3", opacity: 0.9, visible: true, status: "tersedia",
      legend: { type: "kelas", kode: 3 }, sumber: "Model terkunci", tahunData: "2022–2026", resolusi: "1 km",
      deskripsi: "Sel dengan IB100 ≥ 70." },

    /* ---------------- KEJADIAN ---------------- */
    { id: "hotspot", grup: "kejadian", nama: "Hotspot VIIRS", type: "hotspot", temporal: true,
      file: "kejadian/hotspot_{tahun}.geojson", opacity: 0.85, visible: true, status: "tersedia", warna: "#111111",
      legend: { type: "titik", judul: "Hotspot", items: [["#111111", "Titik panas VIIRS S-NPP 375 m"]] },
      popup: [["tanggal", "Tanggal"], ["confidence", "Confidence"], ["frp_mw", "FRP (MW)"]],
      sumber: "NASA FIRMS VIIRS S-NPP 375 m (confidence nominal/high, TYPE = 0)",
      tahunData: "2022–2025 (kalibrasi), Jan–Okt 2026 (uji)", resolusi: "375 m",
      deskripsi: "Titik panas yang sudah dibersihkan (duplikat, confidence rendah, sumber panas statis dibuang)." },
    { id: "area_terbakar", grup: "kejadian", nama: "Area bekas terbakar", type: "geojson",
      file: "kejadian/area_terbakar.geojson", status: "belum",
      sumber: "Tidak dipakai dalam metodologi (hanya hotspot)", deskripsi: "Data belum tersedia." },

    /* ---------------- DAMPAK (tahun uji 2026) ---------------- */
    { id: "zona_tinggi", grup: "dampak", nama: "Zona bahaya Tinggi 2026", type: "geojson",
      file: "dampak/zona_tinggi_2026.geojson", opacity: 0.6, visible: false, status: "tersedia",
      style: { warnaTetap: "#d7191c", garis: "#67000d" },
      legend: { type: "kategori", judul: "Zona dampak", items: [["#d7191c", "Sel kelas Tinggi 2026"]] },
      popup: [["kab", "Kab/kota"], ["luas_ha", "Luas (ha)", "ha"]],
      sumber: "Model terkunci, tahun 2026", tahunData: "2026", resolusi: "1 km",
      deskripsi: "Zona dampak = sel kelas Tinggi peta 2026." },
    { id: "lahan_terdampak", grup: "dampak", nama: "Tutupan lahan terdampak", type: "image",
      file: "dampak/tutupan_lahan_terdampak_2026", opacity: 0.9, visible: false, status: "tersedia",
      legend: { type: "kategori", judul: "Tutupan lahan di zona Tinggi", items: "tutupanLahan" },
      sumber: "Dynamic World 2024 × zona Tinggi 2026", tahunData: "2026", resolusi: "1 km",
      deskripsi: "Kelas tutupan lahan pada sel bahaya Tinggi 2026." },
    { id: "gambut_terdampak", grup: "dampak", nama: "Gambut terdampak", type: "geojson",
      file: "dampak/gambut_terdampak_2026.geojson", opacity: 0.85, visible: false, status: "tersedia",
      style: { warnaTetap: "#6b3e1c", garis: "#3b1f0b" },
      legend: { type: "kategori", judul: "Gambut terdampak", items: [["#6b3e1c", "Gambut di zona Tinggi 2026"]] },
      popup: [["kab", "Kab/kota"], ["kedalaman", "Kedalaman"], ["luas_ha", "Luas (ha)", "ha"]],
      sumber: "Gambut BIG × zona Tinggi 2026", tahunData: "2026", resolusi: "Vektor", deskripsi: "Irisan lahan gambut dengan zona Tinggi." },
    { id: "permukiman", grup: "dampak", nama: "Permukiman (OSM)", type: "geojson",
      file: "dampak/permukiman.geojson", opacity: 0.8, visible: false, status: "tersedia",
      style: { field: "di_zona_tinggi", warna: { "Ya": "#d7191c", "Tidak": "#6c757d" }, garis: "#343a40" },
      legend: { type: "kategori", judul: "Permukiman (landuse residential)", items: [["#d7191c", "Bersinggungan zona Tinggi"], ["#6c757d", "Di luar zona Tinggi"]] },
      popup: [["nama", "Nama"], ["luas_ha", "Luas (ha)", "ha"], ["di_zona_tinggi", "Di zona Tinggi"]],
      sumber: "OpenStreetMap landuse=residential (Geofabrik, 2026)", tahunData: "2026", resolusi: "Vektor",
      deskripsi: "Data permukiman OSM masih terbatas di Kalsel; jumlah penduduk (WorldPop) dipakai sebagai indikator utama." },
    { id: "penduduk", grup: "dampak", nama: "Kepadatan penduduk", type: "image",
      file: "dampak/penduduk_2026", opacity: 0.8, visible: false, status: "tersedia",
      legend: { type: "kategori", judul: "Penduduk (jiwa/km²)", items: [
        ["#fef0d9", "1 – 25"], ["#fdcc8a", "25 – 100"], ["#fc8d59", "100 – 250"], ["#e34a33", "250 – 1.000"], ["#b30000", "> 1.000"]] },
      sumber: "WorldPop 2026 1 km (R2025A), dikalibrasi BPS 2026 per kab/kota", tahunData: "2026", resolusi: "1 km",
      deskripsi: "Jumlah penduduk per sel 1 km; total per kab sama dengan angka BPS 2026." },
    { id: "jiwa_terpapar", grup: "dampak", nama: "Jiwa terpapar per kab/kota", type: "choropleth",
      file: "admin/kabupaten.geojson", opacity: 0.75, visible: false, status: "tersedia",
      field: "jiwa_terpapar", kelasNilai: [[500, "#fee5d9"], [2000, "#fcae91"], [4000, "#fb6a4a"], [1e12, "#cb181d"]],
      legend: { type: "kategori", judul: "Jiwa di zona Tinggi 2026", items: [
        ["#fee5d9", "< 500"], ["#fcae91", "500 – 2.000"], ["#fb6a4a", "2.000 – 4.000"], ["#cb181d", "> 4.000"]] },
      sumber: "WorldPop terkalibrasi BPS × zona Tinggi 2026", tahunData: "2026", resolusi: "Kab/kota",
      deskripsi: "Jumlah penduduk pada sel kelas Tinggi 2026 per kabupaten/kota." },
    { id: "infrastruktur", grup: "dampak", nama: "Fasilitas umum & infrastruktur", type: "geojson",
      file: "dampak/infrastruktur.geojson", status: "belum", sumber: "-", deskripsi: "Data belum tersedia." },
    { id: "kawasan_lindung", grup: "dampak", nama: "Kawasan lindung / konsesi", type: "geojson",
      file: "dampak/kawasan_lindung.geojson", status: "belum", sumber: "-", deskripsi: "Data belum tersedia." },

    /* ---------------- ADMIN ---------------- */
    { id: "kabupaten", grup: "admin", nama: "Batas kabupaten/kota", type: "geojson",
      file: "admin/kabupaten.geojson", opacity: 1, visible: true, status: "tersedia",
      style: { garisSaja: true, garis: "#1f3b2d" }, label: "kab",
      legend: { type: "garis", judul: "Batas administrasi", items: [["#1f3b2d", "Kabupaten/kota"]] },
      sumber: "Batas administrasi BIG", tahunData: "Edisi terbaru", resolusi: "Vektor (disederhanakan 30 m)",
      deskripsi: "13 kabupaten/kota Kalimantan Selatan beserta atribut hasil analisis." }
  ],

  // File tabel statistik (dibaca otomatis; jika tidak ada → "Data belum tersedia")
  statistik: {
    tahunan: "statistik/statistik_tahunan.csv",
    kabupaten: "statistik/statistik_kabupaten.csv",
    dampak: "statistik/statistik_dampak_2026.csv",
    lahan: "statistik/statistik_tutupan_lahan.csv",
    validasi: "statistik/validasi_2026.csv"
  },
  nilaiSel: "grid/nilai_sel.json",
  rasterBounds: "raster_bounds.json",

  // proyeksi grid analisis (untuk pop-up nilai sel)
  projGrid: "+proj=utm +zone=50 +south +datum=WGS84 +units=m +no_defs",
  kelasLereng: [[2, 5], [8, 4], [15, 3], [25, 2], [1e9, 1]],
  kelasHujan: [[100, 5], [120, 4], [150, 3], [200, 2], [1e9, 1]],
  kelasJarak: [[1000, 5], [2000, 4], [3000, 3], [5000, 2], [1e12, 1]]
};
