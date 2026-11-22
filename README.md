# SIGMA — WebGIS Karhutla Kalimantan Selatan

Dashboard WebGIS hasil PjBL GD4103 SIG (Kelompok 2). Peta interaktif Leaflet + grafik Chart.js yang
menampilkan **data asli hasil pengolahan SIG di QGIS** (tidak ada data sintetis).

## Struktur

```
web/
├── index.html            halaman utama
├── css/style.css         tampilan (warna, tata letak, responsif, cetak)
├── js/
│   ├── config.js         ← KONFIGURASI: nama layer, path file, warna, legenda, sumber, status
│   ├── content.js        ← ISI PANEL METODOLOGI (boleh diedit)
│   ├── util.js           memuat file, format angka, CSV
│   ├── layers.js         pengelolaan layer peta, legenda, filter wilayah, nilai sel
│   ├── stats.js          kartu statistik & grafik
│   └── app.js            interaksi dashboard
└── data/
    ├── raster_bounds.json    batas (lat/lon) tiap PNG raster
    ├── parameter/  model/  kejadian/  dampak/  admin/
    ├── statistik/            tabel CSV untuk kartu & grafik
    └── grid/nilai_sel.json   nilai tiap sel 1 km (untuk pop-up)
```

Semua file di `data/` dibuat oleh `scripts/s11_webgis_data.py` dari hasil QGIS.

## Menjalankan di komputer sendiri

Peramban tidak bisa membaca file data langsung dari `file://`, jadi jalankan server lokal:

```
cd 07-webgis/web
python -m http.server 8000
```

lalu buka `http://localhost:8000`. (Bisa juga dengan ekstensi *Live Server* di VS Code.)

## Publikasi ke GitHub Pages (URL untuk KAK)

1. Buat repository **publik** di GitHub, misalnya `sigma-karhutla-kalsel`.
2. Unggah **seluruh isi folder `web/`** (index.html, css, js, data, README.md) ke repository.
   Lewat situs GitHub: *Add file → Upload files*, seret semua isi folder, lalu *Commit*.
3. Buka *Settings → Pages*, pilih *Branch: main* dan folder */ (root)*, lalu *Save*.
4. Tunggu 1–2 menit. URL-nya: `https://<username>.github.io/sigma-karhutla-kalsel/`.
5. Uji di jendela penyamaran (incognito) dan di HP.

## Mengganti atau menambah data

- **Ganti file**: timpa file di `data/` dengan nama yang sama, atau ubah `file:` di `js/config.js`.
- **Tambah layer**: tambahkan satu objek di `CONFIG.layers` (lihat contoh yang ada).
  Raster harus berupa PNG berwarna + entri batas di `data/raster_bounds.json` (dibuat otomatis oleh skrip).
- **Layer yang belum ada datanya** cukup diberi `status: "belum"`; dashboard menampilkan "Data belum tersedia".
- **Statistik**: kartu dan grafik membaca CSV di `data/statistik/`. Jika file tidak ada, grafik tampil "Data belum tersedia".
- **Ambang kelas bahaya** (`CONFIG.kelas`) mengikuti hasil klasifikasi SIG (Rendah < 40, Sedang 40–69,9, Tinggi ≥ 70).

## Catatan

- Layer analisis dampak hanya untuk tahun uji **2026**.
- Area bekas terbakar, fasilitas umum/infrastruktur, dan kawasan lindung/konsesi **belum tersedia** (tidak dipakai dalam metodologi).
- Fitur simulasi bobot belum diimplementasikan; semua peta adalah hasil model terkunci.
