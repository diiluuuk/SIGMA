/* Statistik & grafik (Chart.js). Semua angka diambil dari file CSV di data/statistik/ */
const Stats = {
  d: {}, ch: {},
  async load() {
    const s = CONFIG.statistik;
    const [tahunan, kab, dampak, lahan] = await Promise.all([U.csv(s.tahunan), U.csv(s.kabupaten), U.csv(s.dampak), U.csv(s.lahan)]);
    Object.assign(this.d, { tahunan, kab, dampak, lahan });
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 11;
    Chart.defaults.color = "#5b6660";
  },

  rowTahun(t) { return this.d.tahunan?.find(r => r.tahun === t); },
  rowKab(nama, t) { return this.d.kab?.find(r => r.kab === nama && r.tahun === t); },
  rowDampak(nama) { return this.d.dampak?.find(r => r.kab === nama); },

  /* ---------- kartu ---------- */
  cards(tahun, kab) {
    const box = document.getElementById("cards");
    document.getElementById("stat-judul").textContent = kab ? `Ringkasan ${kab}` : "Ringkasan Kalimantan Selatan";
    document.getElementById("stat-tahun").textContent = tahun;
    const r = kab ? this.rowKab(kab, tahun) : this.rowTahun(tahun);
    const row = (k, v, p, col, note) => `<tr><td class="k">${col ? `<span class="sq" style="background:${col}"></span>` : ""}${k}${note ? `<span class="nt">${note}</span>` : ""}</td>
      <td class="v">${v}</td><td class="p">${p ?? ""}</td></tr>`;
    if (!r) { box.innerHTML = `<table class="mtab"><tbody>${row("Data belum tersedia", "–", "")}</tbody></table>`; return; }
    const luas = kab ? r.luas_km2 : r.luas_total_km2;
    const kel = CONFIG.kelas;
    let jiwa = null;
    if (tahun === CONFIG.tahunDampak) jiwa = kab ? this.rowDampak(kab)?.jiwa_terpapar : this.d.dampak?.reduce((a, x) => a + (x.jiwa_terpapar || 0), 0);
    box.innerHTML = `<table class="mtab"><thead><tr><th>Atribut</th><th class="v">Nilai</th><th class="p">%</th></tr></thead><tbody>` +
      row("Luas wilayah studi", U.n(luas) + " km²", "", null, kab ? "sel 1 km" : "13 kab/kota") +
      row("Kelas Rendah", U.n(r.rendah_km2) + " km²", U.n(r.pct_rendah ?? 100 * r.rendah_km2 / luas, 1), kel[0].warna) +
      row("Kelas Sedang", U.n(r.sedang_km2) + " km²", U.n(r.pct_sedang ?? 100 * r.sedang_km2 / luas, 1), kel[1].warna) +
      row("Kelas Tinggi", U.n(r.tinggi_km2) + " km²", U.n(r.pct_tinggi ?? 100 * r.tinggi_km2 / luas, 2), kel[2].warna) +
      row("Titik api " + tahun, U.n(r.hotspot_titik), "", null, tahun === 2026 ? "Jan–Okt, uji" : "Jun–Okt, kalibrasi") +
      row("Jiwa di zona Tinggi", jiwa === null || jiwa === undefined ? "–" : U.n(jiwa), "", null, tahun === CONFIG.tahunDampak ? "WorldPop × BPS" : "hanya 2026") +
      `</tbody></table>`;
  },

  /* ---------- grafik ---------- */
  draw(id, cfg) {
    const cv = document.getElementById(id);
    const box = cv.parentElement; box.querySelector(".empty-chart")?.remove();
    if (!cfg) {
      if (this.ch[id]) { this.ch[id].destroy(); delete this.ch[id]; }
      box.appendChild(U.el("div", { class: "empty-chart" }, "Data belum tersedia"));
      return;
    }
    if (this.ch[id]) { this.ch[id].destroy(); }
    this.ch[id] = new Chart(cv, cfg);
  },

  charts(tahun, kab) {
    const K = CONFIG.kelas;
    const opsiBar = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

    // 1. luas per kelas
    const r = kab ? this.rowKab(kab, tahun) : this.rowTahun(tahun);
    const totKl = r ? r.rendah_km2 + r.sedang_km2 + r.tinggi_km2 : 0;
    this.draw("ch-kelas", r ? { type: "doughnut",
      data: { labels: K.map((k, i) => `${k.nama}  ${U.n(100 * [r.rendah_km2, r.sedang_km2, r.tinggi_km2][i] / totKl, i === 2 ? 2 : 1)}%`),
        datasets: [{ data: [r.rendah_km2, r.sedang_km2, r.tinggi_km2], backgroundColor: K.map(k => k.warna), borderWidth: 1, borderColor: "#ffffff" }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: "62%", layout: { padding: 2 },
        plugins: { legend: { position: "right", align: "center", labels: { boxWidth: 10, boxHeight: 10, padding: 6, font: { size: 11 } } },
          tooltip: { callbacks: { label: c => ` ${K[c.dataIndex].nama}: ${U.n(c.raw)} km²` } } } } } : null);

    // 2. distribusi kelas per kab
    const rows = this.d.kab?.filter(x => x.tahun === tahun).sort((a, b) => b.pct_tinggi - a.pct_tinggi || b.pct_sedang - a.pct_sedang);
    this.draw("ch-kab", rows?.length ? { type: "bar",
      data: { labels: rows.map(x => x.kab), datasets: K.map((k, i) => ({ label: k.nama, data: rows.map(x => [x.pct_rendah, x.pct_sedang, x.pct_tinggi][i]),
        backgroundColor: k.warna, borderColor: rows.map(x => x.kab === kab ? "#0b2e1f" : k.warna), borderWidth: rows.map(x => x.kab === kab ? 2 : 0) })) },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false,
        scales: { x: { stacked: true, max: 100, ticks: { callback: v => v + "%" } }, y: { stacked: true, ticks: { font: c => ({ weight: rows[c.index]?.kab === kab ? "bold" : "normal" }) } } },
        plugins: { legend: { position: "top", labels: { boxWidth: 12 } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${U.n(c.raw, 1)}%` } } },
        onClick: (e, el) => { if (el.length) App.pilihKab(rows[el[0].index].kab); } } } : null);

    // 3. hotspot per tahun
    const th = CONFIG.tahun;
    const hsVal = th.map(t => kab ? this.rowKab(kab, t)?.hotspot_titik : this.rowTahun(t)?.hotspot_titik);
    this.draw("ch-hotspot", hsVal.some(v => v !== undefined) ? { type: "bar",
      data: { labels: th.map(t => t === 2026 ? "2026*" : t), datasets: [{ data: hsVal, backgroundColor: th.map(t => t === tahun ? "#1f3b2d" : "#9bb5a6") }] },
      options: { ...opsiBar, scales: { y: { beginAtZero: true, ticks: { callback: v => U.n(v) } } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${U.n(c.raw)} titik`, footer: c => c[0].label === "2026*" ? "Jan–Okt (data uji)" : "" } } } } } : null);

    // 4. curah hujan per tahun
    const hj = th.map(t => kab ? this.rowKab(kab, t)?.hujan_rata2_mm_bulan : this.rowTahun(t)?.hujan_rata2_mm_bulan);
    this.draw("ch-hujan", hj.some(v => v !== undefined) ? { type: "bar",
      data: { labels: th, datasets: [
        { type: "line", label: "Batas skor 5 (100 mm)", data: th.map(() => 100), borderColor: "#d7191c", borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5 },
        { label: "Rata-rata Jun–Okt", data: hj, backgroundColor: th.map((t, i) => t === tahun ? "#2166ac" : (hj[i] < 100 ? "#ef8a62" : "#9ecae1")) }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: "mm/bulan" } } },
        plugins: { legend: { position: "top", labels: { boxWidth: 12 } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${U.n(c.raw, 1)} mm/bulan` } } } } } : null);

    // 5 & 6. tutupan lahan di zona tinggi
    let lab = [], tinggi = [], pct = [], warna = [];
    if (kab && tahun === CONFIG.tahunDampak && this.rowDampak(kab)) {
      const d = this.rowDampak(kab); const keys = ["water", "trees", "grass", "flooded_veg", "crops", "shrub", "built", "bare"];
      const tot = this.d.lahan?.filter(x => x.tahun === tahun) || [];
      keys.forEach((k, i) => { lab.push(CONFIG.tutupanLahan[i][0]); warna.push(CONFIG.tutupanLahan[i][1]); tinggi.push((d["lulc_tinggi_" + k + "_ha"] || 0) / 100); });
      pct = null;
    } else {
      const rr = this.d.lahan?.filter(x => x.tahun === tahun) || [];
      rr.forEach(x => { const i = CONFIG.tutupanLahan.findIndex(t => t[0] === x.kelas_lahan); lab.push(x.kelas_lahan); warna.push(CONFIG.tutupanLahan[i]?.[1] || "#999");
        tinggi.push(x.luas_zona_tinggi_km2); pct.push(x.pct_kelas_di_zona_tinggi); });
    }
    this.draw("ch-lahan", lab.length ? { type: "bar",
      data: { labels: lab, datasets: [{ data: tinggi, backgroundColor: warna }] },
      options: { ...opsiBar, indexAxis: "y", scales: { x: { beginAtZero: true, title: { display: true, text: "km² di zona Tinggi " + tahun } } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${U.n(c.raw)} km²` } } } } } : null);
    this.draw("ch-lahan-pct", pct && pct.length ? { type: "bar",
      data: { labels: lab, datasets: [{ data: pct, backgroundColor: warna }] },
      options: { ...opsiBar, indexAxis: "y", scales: { x: { beginAtZero: true, title: { display: true, text: "% luas jenis lahan (Kalsel) " + tahun }, ticks: { callback: v => v + "%" } } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${U.n(c.raw, 2)}% dari luas ${c.label}` } } } } } : null);
    if (pct === null) {
      const box = document.getElementById("ch-lahan-pct").parentElement;
      box.querySelector(".empty-chart").textContent = "Pembanding persentase tersedia untuk tingkat provinsi";
    }
  },

  /* tabel validasi 2026 untuk panel metodologi */
  async validasiHTML() {
    try {
      const r = await fetch(U.url(CONFIG.statistik.validasi)); if (!r.ok) throw 0;
      const L_ = U.rawLines(await r.text());
      const auc = L_.find(l => l[0] === "AUC_2026");
      const ki = L_.findIndex(l => l[0] === "KELAS");
      const kelas = L_.slice(ki + 1, ki + 4);
      const kor = L_.filter(l => l[0] === "KORELASI");
      let h = `<table class="tbl"><thead><tr><th>Kelas</th><th class="r">% luas</th><th class="r">% titik</th><th class="r">Rasio</th></tr></thead><tbody>`;
      kelas.forEach(c => (h += `<tr><td>${c[1]}</td><td class="r">${U.n(+c[3], 2)}</td><td class="r">${U.n(+c[5], 2)}</td><td class="r"><b>${U.n(+c[6], 3)}</b></td></tr>`));
      h += `</tbody></table><p class="note">AUC 2026 = ${U.n(Number(auc[1]), 3)}</p>`;
      h += `<table class="tbl"><thead><tr><th>IB100 kab vs</th><th class="r">Pearson r</th><th class="r">Spearman ρ</th></tr></thead><tbody>`;
      kor.forEach(k => (h += `<tr><td>${k[1]}</td><td class="r">${U.n(+k[3], 3)} (p ${U.n(+k[5], 3)})</td><td class="r">${U.n(+k[7], 3)} (p ${U.n(+k[9], 4)})</td></tr>`));
      return h + "</tbody></table>";
    } catch (e) { return `<p class="muted">Data belum tersedia</p>`; }
  }
};
