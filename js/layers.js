/* Pengelolaan layer peta: memuat raster/vektor dari CONFIG, visibilitas, transparansi, legenda, filter wilayah */
const Layers = {
  map: null, bounds: {}, st: {}, tahun: CONFIG.tahunAwal, kabFilter: "", renderer: null,
  kabGeo: null, maskLayer: null, highlight: null,

  async init(map) {
    this.map = map;
    this.renderer = L.canvas({ padding: 0.3 });
    this.bounds = (await U.json(CONFIG.rasterBounds)) || {};
    CONFIG.layers.forEach(c => (this.st[c.id] = { cfg: c, on: false, opacity: c.opacity ?? 0.8, layer: null, status: c.status, key: null }));
    // cek ketersediaan file
    await Promise.all(CONFIG.layers.map(async c => {
      if (c.status !== "tersedia") return;
      const f = this.file(c, this.tahun) + (c.type === "image" ? ".png" : "");
      if (c.type === "image" && !this.bounds[this.file(c, this.tahun)]) { this.st[c.id].status = "belum"; return; }
      if (!(await U.exists(f))) this.st[c.id].status = "belum";
    }));
    for (const c of CONFIG.layers) if (c.visible && this.st[c.id].status === "tersedia") await this.toggle(c.id, true);
  },

  file(c, tahun) { return c.file.replace("{tahun}", tahun); },

  styleFor(c, f) {
    const s = c.style || {};
    const op = this.st[c.id].opacity;
    if (s.garisSaja) return { color: s.garis, weight: 1.4, fill: false, opacity: Math.max(op, .2) };
    let fill = s.warnaTetap || "#888";
    if (s.field && s.warna) fill = s.warna[f.properties[s.field]] || "#999";
    return { color: s.garis || "#333", weight: 0.6, fillColor: fill, fillOpacity: op, opacity: Math.min(1, op + .2) };
  },

  popupVektor(c, f) {
    const p = f.properties || {};
    const rows = (c.popup || []).filter(([k]) => p[k] !== undefined && p[k] !== null && p[k] !== "")
      .map(([k, lbl, fmt]) => `<tr><td>${U.esc(lbl)}</td><td>${fmt === "ha" ? U.n(p[k], 1) : U.esc(p[k])}</td></tr>`).join("");
    return `<div class="pp"><h5>${U.esc(c.nama)}</h5><table>${rows || "<tr><td>Tidak ada atribut</td><td></td></tr>"}</table></div>`;
  },

  async build(c) {
    const key = this.file(c, this.tahun);
    if (c.type === "image") {
      const b = this.bounds[key];
      if (!b) return null;
      return L.imageOverlay(U.url(key + ".png"), b, { opacity: this.st[c.id].opacity, interactive: false, className: "raster-px" });
    }
    const data = c.type === "choropleth" ? (this.kabGeo || (this.kabGeo = await U.json(c.file))) : await U.json(key);
    if (!data) return null;
    if (c.type === "hotspot") {
      const kab = this.kabFilter;
      if (kab) await Grid.ensure();
      const lyr = L.geoJSON(data, {
        filter: f => !kab || Grid.kabAt(f.geometry.coordinates[1], f.geometry.coordinates[0]) === kab,
        pointToLayer: (f, ll) => L.circleMarker(ll, { renderer: this.renderer, radius: 2.4, weight: 0.5, color: "#fff",
          fillColor: c.warna, fillOpacity: this.st[c.id].opacity, opacity: this.st[c.id].opacity }),
        onEachFeature: (f, l) => { l.bindPopup(() => this.popupVektor(c, f)); l.on("click", e => L.DomEvent.stopPropagation(e)); }
      });
      lyr._jumlah = lyr.getLayers().length;
      return lyr;
    }
    if (c.type === "choropleth") {
      return L.geoJSON(data, {
        style: f => {
          const v = f.properties[c.field]; const col = (c.kelasNilai.find(([b]) => v < b) || c.kelasNilai.at(-1))[1];
          return { color: "#555", weight: 0.8, fillColor: col, fillOpacity: this.st[c.id].opacity };
        },
        interactive: false
      });
    }
    // geojson biasa
    const lyr = L.geoJSON(data, {
      style: f => this.styleFor(c, f),
      interactive: !!c.popup,
      onEachFeature: (f, l) => {
        if (c.popup) { l.bindPopup(() => this.popupVektor(c, f)); l.on("click", e => L.DomEvent.stopPropagation(e)); }
        if (c.label && f.properties[c.label]) l.bindTooltip(f.properties[c.label], { permanent: true, direction: "center", className: "kab-label" });
      }
    });
    return lyr;
  },

  async toggle(id, on) {
    const s = this.st[id];
    if (s.status !== "tersedia") { U.toast(`${s.cfg.nama}: data belum tersedia`); return false; }
    if (s.layer) { this.map.removeLayer(s.layer); s.layer = null; }
    s.on = on;
    if (on) {
      s.layer = await this.build(s.cfg);
      if (!s.layer) { s.on = false; U.toast(`${s.cfg.nama}: gagal memuat data`); return false; }
      s.layer.addTo(this.map);
      this.reorder();
    }
    App.onLayersChanged();
    return true;
  },

  async setTahun(t) {
    this.tahun = t;
    for (const s of Object.values(this.st)) if (s.on && s.cfg.temporal) await this.toggle(s.cfg.id, true);
  },

  setOpacity(id, v) {
    const s = this.st[id]; s.opacity = v;
    if (!s.layer) return;
    if (s.cfg.type === "image") s.layer.setOpacity(v);
    else if (s.cfg.type === "hotspot") s.layer.setStyle({ fillOpacity: v, opacity: v });
    else if (s.cfg.type === "choropleth") s.layer.setStyle({ fillOpacity: v });
    else s.layer.setStyle(f => this.styleFor(s.cfg, f));
  },

  // urutan gambar: parameter < model < dampak (raster) < vektor < hotspot < batas
  reorder() {
    const urut = ["parameter", "model", "dampak", "kejadian", "admin"];
    const aktif = Object.values(this.st).filter(s => s.on && s.layer);
    aktif.sort((a, b) => {
      const ra = (a.cfg.type === "image" ? 0 : a.cfg.type === "hotspot" ? 2 : 1) * 10 + urut.indexOf(a.cfg.grup);
      const rb = (b.cfg.type === "image" ? 0 : b.cfg.type === "hotspot" ? 2 : 1) * 10 + urut.indexOf(b.cfg.grup);
      return ra - rb;
    });
    aktif.forEach(s => { if (s.layer.bringToFront) s.layer.bringToFront(); });
    if (this.st.kabupaten?.layer) this.st.kabupaten.layer.bringToFront();
    if (this.highlight) this.highlight.bringToFront();
  },

  aktif() { return Object.values(this.st).filter(s => s.on).map(s => s.cfg); },
  isOn(id) { return !!this.st[id]?.on; },

  /* ---------- legenda dinamis ---------- */
  legendHTML() {
    const parts = [];
    let sudahKelas = false;
    for (const c of this.aktif()) {
      const L_ = c.legend; if (!L_) continue;
      if (L_.type === "kelas") {
        if (sudahKelas) continue; sudahKelas = true;
        const on = CONFIG.kelas.filter(k => this.isOn(["", "kelas_rendah", "kelas_sedang", "kelas_tinggi"][k.kode]));
        parts.push(`<div class="lg-sec"><div class="lg-title">Kelas bahaya ${this.tahun}</div>` +
          on.map(k => `<div class="lg-item"><span class="lg-sw" style="background:${k.warna}"></span><span><b>${k.nama}</b> · ${k.rentang}</span></div>`).join("") + `</div>`);
        continue;
      }
      const judul = (L_.judul || c.nama) + (c.temporal && c.type !== "hotspot" ? ` (${this.tahun})` : c.type === "hotspot" ? ` ${this.tahun}` : "");
      if (L_.type === "gradien") {
        const g = L_.stops.map(([col, v]) => `${col} ${((v - L_.stops[0][1]) / (L_.stops.at(-1)[1] - L_.stops[0][1]) * 100).toFixed(0)}%`).join(",");
        parts.push(`<div class="lg-sec"><div class="lg-title">${judul}</div><div class="lg-grad" style="background:linear-gradient(90deg,${g})"></div>
          <div class="lg-scale"><span>≤ ${L_.stops[0][1]}</span><span>40</span><span>70</span><span>≥ ${L_.stops.at(-1)[1]}</span></div></div>`);
        continue;
      }
      const items = L_.items === "tutupanLahan" ? CONFIG.tutupanLahan.slice(0, 8).map(([n, col, sk]) => [col, n, sk]) : L_.items;
      const cls = L_.type === "garis" ? "lg-sw line" : L_.type === "titik" ? "lg-sw dot" : "lg-sw";
      let extra = "";
      if (c.type === "hotspot" && this.st[c.id].layer) extra = `<div class="muted">${U.n(this.st[c.id].layer._jumlah)} titik ditampilkan${this.kabFilter ? " di " + U.esc(this.kabFilter) : ""}</div>`;
      const adaSkor = items.some(it => it[2] !== undefined);
      parts.push(`<div class="lg-sec"><div class="lg-title">${judul}${adaSkor ? '<span class="lg-skor-h">Skor</span>' : ""}</div>` + items.map(([col, t, sk]) =>
        `<div class="lg-item"><span class="${cls}" style="${L_.type === "garis" ? "border-top-color" : "background"}:${col}"></span><span class="lg-txt">${U.esc(t)}</span>${sk !== undefined ? `<span class="lg-skor">${sk}</span>` : ""}</div>`).join("") + extra + `</div>`);
    }
    return parts.join("") || `<p class="muted">Tidak ada layer aktif.</p>`;
  },

  /* ---------- filter wilayah: sorot + redupkan wilayah lain ---------- */
  async setKab(nama) {
    this.kabFilter = nama;
    if (!this.kabGeo) this.kabGeo = await U.json("admin/kabupaten.geojson");
    if (this.highlight) { this.map.removeLayer(this.highlight); this.highlight = null; }
    if (this.maskLayer) { this.map.removeLayer(this.maskLayer); this.maskLayer = null; }
    if (nama && this.kabGeo) {
      const f = this.kabGeo.features.find(x => x.properties.kab === nama);
      if (f) {
        this.highlight = L.geoJSON(f, { style: { color: "#0b2e1f", weight: 3, fill: false }, interactive: false }).addTo(this.map);
        const holes = [];
        const geom = f.geometry;
        const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
        polys.forEach(p => holes.push(p[0].map(([x, y]) => [y, x])));
        const dunia = [[-90, -180], [-90, 180], [90, 180], [90, -180]];
        this.maskLayer = L.polygon([dunia, ...holes], { stroke: false, fillColor: "#1c2420", fillOpacity: 0.35, interactive: false }).addTo(this.map);
        this.map.fitBounds(this.highlight.getBounds(), { padding: [30, 30] });
      }
    }
    if (this.isOn("hotspot")) await this.toggle("hotspot", true);
    this.reorder();
  }
};

/* Nilai per sel 1 km (untuk pop-up raster) */
const Grid = {
  d: null, pos: null, _p: null,
  ensure() { return this._p || (this._p = this.load()); },
  async load() {
    this.d = await U.json(CONFIG.nilaiSel);
    if (!this.d) return;
    this.pos = new Map(); this.d.idx.forEach((v, i) => this.pos.set(v, i));
    proj4.defs("GRID", CONFIG.projGrid);
  },
  cellAt(lat, lon) {
    if (!this.d) return -1;
    const [x, y] = proj4("EPSG:4326", "GRID", [lon, lat]);
    const j = Math.floor((x - this.d.x0) / this.d.res), i = Math.floor((this.d.y1 - y) / this.d.res);
    if (i < 0 || j < 0 || i >= this.d.ny || j >= this.d.nx) return -1;
    const p = this.pos.get(i * this.d.nx + j);
    return p === undefined ? -1 : p;
  },
  kabAt(lat, lon) { const p = this.cellAt(lat, lon); return p < 0 ? "" : this.d.kab_nama[this.d.kab[p]]; },
  v(field, p) { return this.d && this.d[field] ? this.d[field][p] : undefined; }
};
