/* Interaksi dashboard: peta, panel layer, filter, waktu, wilayah, pop-up, unduhan */
const App = {
  map: null, tahun: CONFIG.tahunAwal, kab: "",

  async init() {
    this.header();
    this.initMap();
    this.initUI();
    await Stats.load();
    await Layers.init(this.map);
    this.buildLayerPanel();
    this.buildFilters();
    this.buildWilayah();
    this.buildMetodologi();
    this.buildUnduhan();
    this.refresh();
  },

  header() {
    const a = CONFIG.app;
    document.getElementById("judul").textContent = a.judul;
    document.getElementById("subjudul").textContent = a.subjudul;
    document.getElementById("chip-periode").textContent = a.periode;
    document.getElementById("chip-update").textContent = "Pembaruan data: " + a.diperbarui;
    document.getElementById("credit").innerHTML = `${U.esc(a.pembuat)}<br>Data hasil pengolahan SIG (QGIS) · Diperbarui ${U.esc(a.diperbarui)}`;
  },

  /* ---------------- peta ---------------- */
  initMap() {
    const a = CONFIG.app;
    this.map = L.map("map", { zoomControl: false, preferCanvas: false, minZoom: 6, maxZoom: 16 });
    this.map.fitBounds(a.batas);
    const bases = {};
    Object.entries(CONFIG.basemaps).forEach(([n, b], i) => {
      bases[n] = L.tileLayer(b.url, { attribution: b.attribution, maxZoom: b.maxZoom, crossOrigin: true });
      if (i === 0) bases[n].addTo(this.map);
    });
    L.control.zoom({ position: "topleft" }).addTo(this.map);
    L.control.layers(bases, null, { position: "topleft", collapsed: true }).addTo(this.map);
    L.control.scale({ metric: true, imperial: false, position: "bottomleft" }).addTo(this.map);

    // tombol: reset, unduh peta, cetak
    const Btns = L.Control.extend({
      options: { position: "topleft" },
      onAdd: () => {
        const d = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        const mk = (sym, title, fn) => { const a = L.DomUtil.create("a", "ctrl-btn", d); a.href = "#"; a.title = title; a.innerHTML = sym;
          L.DomEvent.on(a, "click", e => { L.DomEvent.preventDefault(e); L.DomEvent.stopPropagation(e); fn(); }); };
        mk("⟲", "Reset tampilan peta", () => this.reset());
        mk("⤓", "Unduh peta (PNG)", () => this.unduhPeta());
        mk("⎙", "Cetak peta", () => window.print());
        return d;
      }
    });
    new Btns().addTo(this.map);

    // koordinat kursor
    const Koord = L.Control.extend({ options: { position: "bottomleft" },
      onAdd: () => { const d = L.DomUtil.create("div", "coord"); d.id = "koord"; d.textContent = "Lat –, Lon –"; return d; } });
    new Koord().addTo(this.map);
    this.map.on("mousemove", e => (document.getElementById("koord").textContent =
      `Lat ${e.latlng.lat.toFixed(4)}°, Lon ${e.latlng.lng.toFixed(4)}° · zoom ${this.map.getZoom()}`));
    this.map.on("click", e => this.popupSel(e.latlng));
  },

  reset() {
    this.map.fitBounds(CONFIG.app.batas);
    if (this.kab) this.pilihKab("");
  },

  async unduhPeta() {
    if (typeof html2canvas === "undefined") { U.toast("Fitur unduh tidak tersedia, gunakan Cetak"); return; }
    U.toast("Menyiapkan gambar peta…");
    try {
      await new Promise(r => setTimeout(r, 400));
      const c = await html2canvas(document.querySelector(".map-wrap"), { useCORS: true, backgroundColor: "#ffffff", scale: 1.5,
        ignoreElements: el => el.id === "slider-tahun" || el.classList?.contains("leaflet-control-zoom") || el.classList?.contains("leaflet-control-layers") || el.classList?.contains("leaflet-bar") });
      c.toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `SIGMA_peta_${this.tahun}${this.kab ? "_" + this.kab.replace(/\s+/g, "_") : ""}.png`; a.click(); });
    } catch (e) { console.error(e); U.toast("Gagal membuat gambar, gunakan tombol Cetak"); }
  },

  /* ---------------- UI dasar ---------------- */
  initUI() {
    document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === t));
      document.querySelectorAll(".tab-body").forEach(b => b.classList.toggle("active", b.id === t.dataset.tab));
    }));
    document.getElementById("modal-tutup").onclick = () => (document.getElementById("modal").hidden = true);
    document.getElementById("modal").addEventListener("click", e => { if (e.target.id === "modal") e.currentTarget.hidden = true; });
    if (window.innerWidth < 760) { document.getElementById("legend").classList.add("min"); document.getElementById("btn-legend").textContent = "+"; }
    document.getElementById("btn-legend").onclick = e => { const l = document.getElementById("legend"); l.classList.toggle("min"); e.target.textContent = l.classList.contains("min") ? "+" : "–"; };
    document.getElementById("btn-kiri").onclick = () => document.getElementById("panel-kiri").classList.toggle("open");
    document.getElementById("btn-kanan").onclick = () => document.getElementById("panel-kanan").classList.toggle("open");
    document.getElementById("btn-sumber").onclick = () => U.modal("Sumber data", (KONTEN.find(k => k.id === "sumber") || {}).html || "");

    // slider tahun
    const sl = document.getElementById("slider-tahun"); const th = CONFIG.tahun;
    sl.max = th.length - 1; sl.value = th.indexOf(this.tahun);
    const ticks = document.getElementById("tb-ticks");
    th.forEach((t, i) => ticks.appendChild(U.el("button", { "data-i": i, onclick: () => { sl.value = i; this.setTahun(t); } }, String(t))));
    sl.addEventListener("input", () => this.setTahun(th[+sl.value]));
  },

  async setTahun(t) {
    this.tahun = t;
    document.getElementById("slider-tahun").value = CONFIG.tahun.indexOf(t);
    await Layers.setTahun(t);
    this.refresh();
  },

  refresh() {
    document.querySelectorAll("#tb-ticks button").forEach(b => b.classList.toggle("on", CONFIG.tahun[+b.dataset.i] === this.tahun));
    document.getElementById("tb-note").textContent = this.tahun === 2026 ? "Uji independen · Jan–Okt" : "Data kalibrasi";
    Stats.cards(this.tahun, this.kab);
    Stats.charts(this.tahun, this.kab);
    this.infoWilayah();
    this.onLayersChanged();
  },

  onLayersChanged() {
    document.getElementById("legend-body").innerHTML = Layers.legendHTML();
    Object.values(Layers.st).forEach(s => {
      const row = document.querySelector(`.lyr[data-id="${s.cfg.id}"]`); if (!row) return;
      row.classList.toggle("on", s.on); const cb = row.querySelector("input[type=checkbox]"); if (cb) cb.checked = s.on;
    });
    document.querySelectorAll("#f-kelas input").forEach(cb => (cb.checked = Layers.isOn(cb.value)));
    const fp = document.getElementById("f-param"), fd = document.getElementById("f-dampak");
    if (fp) fp.value = [...fp.options].map(o => o.value).find(v => v && Layers.isOn(v)) || "";
    if (fd) fd.value = [...fd.options].map(o => o.value).find(v => v && Layers.isOn(v)) || "";
  },

  /* ---------------- panel layer ---------------- */
  buildLayerPanel() {
    const box = document.getElementById("daftar-layer"); box.innerHTML = "";
    CONFIG.grupLayer.forEach(g => {
      const items = CONFIG.layers.filter(c => c.grup === g.id);
      const grp = U.el("div", { class: "grp" + (g.id === "dampak" || g.id === "parameter" ? " closed" : "") });
      const head = U.el("div", { class: "grp-head" }, `<span>${g.nama}</span><span class="count">${items.length} layer ▾</span>`);
      head.onclick = () => grp.classList.toggle("closed");
      const list = U.el("div", { class: "grp-items" });
      items.forEach(c => {
        const s = Layers.st[c.id]; const ada = s.status === "tersedia";
        const row = U.el("div", { class: "lyr" + (ada ? "" : " na"), "data-id": c.id });
        const badge = !ada ? `<span class="badge warn">Data belum tersedia</span>` : c.temporal ? `<span class="badge temporal">per tahun</span>`
          : (c.grup === "dampak" ? `<span class="badge">2026</span>` : "");
        row.innerHTML = `<div class="lyr-top"><input type="checkbox" ${ada ? "" : "disabled"} aria-label="${U.esc(c.nama)}">
          <span class="lyr-name">${U.esc(c.nama)}</span>${badge}<button class="mini" title="Metadata layer">i</button></div>
          ${ada ? `<div class="lyr-opa"><span>Transparansi</span><input type="range" min="0" max="1" step="0.05" value="${s.opacity}"><span class="ov">${Math.round(s.opacity * 100)}%</span></div>` : ""}`;
        const cb = row.querySelector("input[type=checkbox]");
        cb.onchange = () => Layers.toggle(c.id, cb.checked);
        row.querySelector(".lyr-name").onclick = () => { if (ada) { cb.checked = !cb.checked; Layers.toggle(c.id, cb.checked); } };
        row.querySelector(".mini").onclick = () => this.metadata(c);
        const op = row.querySelector(".lyr-opa input");
        if (op) op.oninput = () => { Layers.setOpacity(c.id, +op.value); row.querySelector(".ov").textContent = Math.round(op.value * 100) + "%"; };
        list.appendChild(row);
      });
      grp.append(head, list); box.appendChild(grp);
    });
  },

  metadata(c) {
    const s = Layers.st[c.id];
    const baris = [["Nama layer", c.nama], ["Kelompok", CONFIG.grupLayer.find(g => g.id === c.grup)?.nama], ["Status", s.status === "tersedia" ? "Tersedia" : "Data belum tersedia"],
      ["Jenis data", { image: "Raster (PNG hasil SIG)", geojson: "Vektor (GeoJSON)", hotspot: "Titik (GeoJSON)", choropleth: "Vektor kab/kota" }[c.type]],
      ["Kriteria model", c.kriteria], ["Sumber", c.sumber], ["Tahun/periode data", c.tahunData], ["Resolusi", c.resolusi],
      ["File", "data/" + c.file + (c.type === "image" ? ".png" : "")], ["Keterangan", c.deskripsi],
      ["Sistem koordinat", "Analisis EPSG:32750 (UTM 50S); tampilan EPSG:3857"], ["Tahun pengolahan", "2026"]].filter(r => r[1]);
    U.modal("Metadata layer", `<table class="tbl">${baris.map(([k, v]) => `<tr><th>${k}</th><td>${U.esc(v)}</td></tr>`).join("")}</table>`);
  },

  /* ---------------- filter ---------------- */
  buildFilters() {
    const fk = document.getElementById("f-kab"); const dl = document.getElementById("dl-kab");
    this.namaKab = [...new Set((Stats.d.kab || []).map(r => r.kab))].sort();
    this.namaKab.forEach(n => { fk.appendChild(U.el("option", { value: n }, n)); dl.appendChild(U.el("option", { value: n })); });
    fk.onchange = () => this.pilihKab(fk.value);

    const seg = document.getElementById("f-kelas");
    CONFIG.kelas.forEach(k => {
      const id = ["", "kelas_rendah", "kelas_sedang", "kelas_tinggi"][k.kode];
      const lb = U.el("label", {}, `<input type="checkbox" value="${id}"><span class="sw" style="background:${k.warna}"></span>${k.nama}`);
      lb.querySelector("input").onchange = e => Layers.toggle(id, e.target.checked);
      seg.appendChild(lb);
    });
    const isi = (sel, grup) => CONFIG.layers.filter(c => c.grup === grup && Layers.st[c.id].status === "tersedia")
      .forEach(c => sel.appendChild(U.el("option", { value: c.id }, c.nama)));
    const fp = document.getElementById("f-param"), fd = document.getElementById("f-dampak");
    isi(fp, "parameter"); isi(fd, "dampak");
    const pilihSatu = async (sel, grup) => {
      for (const c of CONFIG.layers.filter(x => x.grup === grup)) if (Layers.isOn(c.id) && c.id !== sel.value) await Layers.toggle(c.id, false);
      if (sel.value && !Layers.isOn(sel.value)) await Layers.toggle(sel.value, true);
    };
    fp.onchange = () => pilihSatu(fp, "parameter");
    fd.onchange = () => pilihSatu(fd, "dampak");
  },

  async pilihKab(nama) {
    this.kab = nama || "";
    document.getElementById("f-kab").value = this.kab;
    document.getElementById("cari-kab").value = this.kab;
    await Layers.setKab(this.kab);
    if (!this.kab) this.map.fitBounds(CONFIG.app.batas);
    this.refresh();
  },

  /* ---------------- wilayah ---------------- */
  buildWilayah() {
    const inp = document.getElementById("cari-kab");
    inp.addEventListener("change", () => {
      const all = this.namaKab || [];
      const m = all.find(n => n.toLowerCase() === inp.value.trim().toLowerCase()) || all.find(n => n.toLowerCase().includes(inp.value.trim().toLowerCase()));
      if (m) this.pilihKab(m); else if (inp.value) U.toast("Wilayah tidak ditemukan");
    });
    const box = document.getElementById("daftar-prioritas");
    const d = (Stats.d.dampak || []).slice().sort((a, b) => a.peringkat_prioritas - b.peringkat_prioritas);
    if (!d.length) { box.textContent = "Data belum tersedia"; return; }
    box.classList.remove("muted"); box.innerHTML = "";
    const tb = U.el("table", { class: "attr" }, `<thead><tr><th class="r">No.</th><th>Kab/kota</th><th class="r">Jiwa</th><th class="r">% Tinggi</th></tr></thead>`);
    const body = U.el("tbody");
    d.forEach(r => {
      const tr = U.el("tr", { class: "klik" }, `<td class="r idx">${String(r.peringkat_prioritas).padStart(2, "0")}.</td><td>${U.esc(r.kab)}</td>
        <td class="r">${U.n(r.jiwa_terpapar)}</td><td class="r">${U.n(r.pct_tinggi, 2)}</td>`);
      tr.onclick = () => this.pilihKab(r.kab);
      body.appendChild(tr);
    });
    tb.appendChild(body); box.appendChild(tb);
    box.appendChild(U.el("p", { class: "note" }, "Urutan = rata-rata peringkat jiwa terpapar dan % luas kelas Tinggi."));
  },

  infoWilayah() {
    const box = document.getElementById("info-wilayah");
    if (!this.kab) { box.innerHTML = ""; box.hidden = true; return; }
    box.hidden = false;
    const r = Stats.rowKab(this.kab, this.tahun), d = Stats.rowDampak(this.kab);
    if (!r) { box.innerHTML = `<h3>${U.esc(this.kab)}</h3><p class="muted">Data belum tersedia</p>`; return; }
    const K = CONFIG.kelas;
    let h = `<h3>${U.esc(this.kab)}</h3>
      <div class="stack">${[r.pct_rendah, r.pct_sedang, r.pct_tinggi].map((p, i) => `<span style="width:${p}%;background:${K[i].warna}" title="${K[i].nama} ${U.n(p, 1)}%"></span>`).join("")}</div>
      <div class="kv">
        <span class="k">Luas wilayah</span><span class="v">${U.n(r.luas_km2)} km²</span>
        <span class="k">Bahaya rendah ${this.tahun}</span><span class="v">${U.n(r.rendah_km2)} km² (${U.pct(r.pct_rendah)})</span>
        <span class="k">Bahaya sedang ${this.tahun}</span><span class="v">${U.n(r.sedang_km2)} km² (${U.pct(r.pct_sedang)})</span>
        <span class="k">Bahaya tinggi ${this.tahun}</span><span class="v">${U.n(r.tinggi_km2)} km² (${U.pct(r.pct_tinggi, 2)})</span>
        <span class="k">Indeks rata-rata (IB100)</span><span class="v">${U.n(r.ib100_rata2, 1)}</span>
        <span class="k">Hotspot ${this.tahun}</span><span class="v">${U.n(r.hotspot_titik)} titik</span>
        <span class="k">Curah hujan Jun–Okt</span><span class="v">${U.n(r.hujan_rata2_mm_bulan, 1)} mm/bln</span>
      </div>`;
    if (d) {
      const lahan = ["water", "trees", "grass", "flooded_veg", "crops", "shrub", "built", "bare"].map((k, i) => [CONFIG.tutupanLahan[i][0], d["lulc_tinggi_" + k + "_ha"] || 0]).filter(x => x[1] > 0);
      h += `<div class="lg-title" style="margin-top:10px">Dampak di zona Tinggi ${CONFIG.tahunDampak}</div><div class="kv">
        <span class="k">Penduduk terpapar</span><span class="v">${U.n(d.jiwa_terpapar)} jiwa</span>
        <span class="k">Penduduk total (BPS)</span><span class="v">${U.n(d.pop_total)} jiwa</span>
        <span class="k">Permukiman OSM terpapar</span><span class="v">${U.n(d.permukiman_tinggi_ha, 1)} ha (${U.pct(d.pct_permukiman_terpapar, 2)})</span>
        <span class="k">Gambut terdampak</span><span class="v">${U.n(d.gambut_tinggi_ha, 1)} ha</span>
        <span class="k">Peringkat prioritas</span><span class="v">#${d.peringkat_prioritas} dari 13</span></div>
        <table class="tbl"><thead><tr><th>Tutupan lahan terdampak</th><th>Luas (ha)</th></tr></thead><tbody>
        ${lahan.length ? lahan.map(([n, v]) => `<tr><td>${n}</td><td>${U.n(v)}</td></tr>`).join("") : "<tr><td colspan=2>Tidak ada sel Tinggi</td></tr>"}</tbody></table>`;
    }
    h += `<div class="btn-col" style="margin-top:8px"><button class="btn" id="unduh-kab">Unduh tabel wilayah (CSV)</button><button class="btn" id="hapus-kab">Tampilkan seluruh Kalsel</button></div>`;
    box.innerHTML = h;
    document.getElementById("hapus-kab").onclick = () => this.pilihKab("");
    document.getElementById("unduh-kab").onclick = () => {
      const rows = (Stats.d.kab || []).filter(x => x.kab === this.kab);
      const csv = U.toCSV(rows) + (d ? "\n\nDampak 2026\n" + U.toCSV([d]) : "");
      U.download(`statistik_${this.kab.replace(/\s+/g, "_")}.csv`, csv);
    };
  },

  /* ---------------- metodologi ---------------- */
  async buildMetodologi() {
    const box = document.getElementById("metodologi");
    box.innerHTML = KONTEN.map((k, i) => `<details class="met"${i === 0 ? " open" : ""}><summary>${k.judul}</summary><div class="met-body">${k.html}</div></details>`).join("");
    const v = document.getElementById("tabel-validasi");
    if (v) { v.classList.remove("muted"); v.innerHTML = await Stats.validasiHTML(); }
  },

  /* ---------------- unduhan ---------------- */
  buildUnduhan() {
    const box = document.getElementById("unduhan");
    const s = CONFIG.statistik;
    [["Statistik tahunan Kalsel", s.tahunan], ["Statistik per kabupaten/kota", s.kabupaten], ["Tabel dampak 2026 (13 kab/kota)", s.dampak],
     ["Tutupan lahan di zona Tinggi", s.lahan], ["Hasil validasi 2026", s.validasi]].forEach(([n, f]) => {
      const a = U.el("a", { class: "btn", href: U.url(f), download: f.split("/").pop() }, "⤓ " + n + " (CSV)");
      box.appendChild(a);
    });
    box.appendChild(U.el("button", { class: "btn primary", onclick: () => this.unduhPeta() }, "⤓ Unduh tampilan peta (PNG)"));
    box.appendChild(U.el("button", { class: "btn", onclick: () => window.print() }, "⎙ Cetak peta"));
  },

  /* ---------------- pop-up nilai sel ---------------- */
  async popupSel(ll) {
    if (!Grid.d) { U.toast("Memuat nilai sel…", 1500); await Grid.ensure(); }
    const p = Grid.cellAt(ll.lat, ll.lng);
    if (p < 0) return;
    const t = this.tahun, v = f => Grid.v(f, p);
    const kabN = Grid.d.kab_nama[v("kab")];
    const ib = v("ib_" + t), k = U.kelasDari(ib);
    const on = id => Layers.isOn(id);
    const row = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
    let h = `<div class="pp"><h5>${U.esc(kabN)}</h5><table>` + row("Sel 1 km", `${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}`) + `</table>`;
    h += `<div class="sec">Model ${t}</div><table>` + row("Indeks bahaya (IB100)", U.n(ib, 1)) + row("Kelas bahaya", U.pill(k)) + `</table>`;
    const par = [];
    if (on("tutupan_lahan") || on("lahan_terdampak")) { const tl = CONFIG.tutupanLahan[v("lulc")]; par.push(row("Tutupan lahan", tl?.[0] ?? "–"), row("Skor C1", v("skor_lulc"))); }
    if (on("gambut")) par.push(row("Skor gambut C2", v("skor_gambut") + (v("skor_gambut") === 1 ? " (non-gambut)" : "")));
    if (on("curah_hujan")) { const hj = v("hujan_" + t); par.push(row(`Curah hujan ${t}`, U.n(hj, 1) + " mm/bln"), row("Skor C3", U.skorDari(hj, CONFIG.kelasHujan))); }
    if (on("aksesibilitas")) par.push(row("Jarak jalan/sungai", U.n(v("jarak_m")) + " m"), row("Skor C4", U.skorDari(v("jarak_m"), CONFIG.kelasJarak)));
    if (on("kemiringan_lereng")) par.push(row("Kemiringan lereng", U.n(v("lereng_pct"), 1) + " %"), row("Skor C5", U.skorDari(v("lereng_pct"), CONFIG.kelasLereng)));
    if (par.length) h += `<div class="sec">Parameter</div><table>${par.join("")}</table>`;
    const lain = [];
    if (on("hotspot")) lain.push(row(`Hotspot ${t} di sel ini`, U.n(v("hs_" + t)) + " titik"));
    if (on("penduduk") || on("jiwa_terpapar") || on("zona_tinggi")) lain.push(row("Penduduk di sel", U.n(v("penduduk")) + " jiwa"));
    if (lain.length) h += `<div class="sec">Kejadian & dampak</div><table>${lain.join("")}</table>`;
    if (on("jiwa_terpapar")) { const d = Stats.rowDampak(kabN); if (d) h += `<table>${row("Jiwa terpapar kab/kota", U.n(d.jiwa_terpapar))}</table>`; }
    h += `<div style="margin-top:8px"><button class="btn" onclick="App.pilihKab('${kabN.replace(/'/g, "\\'")}');App.map.closePopup()">Pilih wilayah ini</button></div></div>`;
    L.popup({ maxWidth: 280 }).setLatLng(ll).setContent(h).openOn(this.map);
  }
};

document.addEventListener("DOMContentLoaded", () => App.init().catch(e => { console.error(e); U.toast("Terjadi kesalahan saat memuat dashboard"); }));
