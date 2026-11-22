/* Utilitas umum: memuat data, format angka, CSV */
const U = {
  url(path) { return CONFIG.app.dataDir + path; },

  async json(path) {
    try {
      const r = await fetch(U.url(path), { cache: "no-cache" });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) { console.warn("Gagal memuat", path, e); return null; }
  },

  async csv(path) {
    try {
      const r = await fetch(U.url(path), { cache: "no-cache" });
      if (!r.ok) throw new Error(r.status);
      return U.parseCSV(await r.text());
    } catch (e) { console.warn("Gagal memuat", path, e); return null; }
  },

  async exists(path) {
    try { const r = await fetch(U.url(path), { method: "HEAD" }); return r.ok; } catch (e) { return false; }
  },

  /* CSV sederhana (tanpa koma di dalam nilai) → array objek; baris kosong diabaikan */
  parseCSV(text) {
    const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter(l => l.trim() !== "");
    if (!lines.length) return [];
    const head = lines[0].split(",").map(s => s.trim());
    return lines.slice(1).map(l => {
      const c = l.split(","); const o = {};
      head.forEach((h, i) => { const v = (c[i] ?? "").trim(); o[h] = v !== "" && !isNaN(v) ? Number(v) : v; });
      return o;
    });
  },
  rawLines(text) { return text.replace(/^﻿/, "").split(/\r?\n/).map(l => l.split(",")); },

  toCSV(rows) {
    if (!rows || !rows.length) return "";
    const head = Object.keys(rows[0]);
    return [head.join(",")].concat(rows.map(r => head.map(h => r[h]).join(","))).join("\n");
  },
  download(name, text, type = "text/csv") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  },

  n(v, d = 0) {
    if (v === null || v === undefined || v === "" || Number.isNaN(v)) return "–";
    return Number(v).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
  },
  pct(v, d = 1) { return U.n(v, d) + "%"; },

  el(tag, attrs = {}, html = "") {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") e.className = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
    }
    if (html) e.innerHTML = html;
    return e;
  },
  esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); },

  toast(msg, ms = 2600) {
    const t = document.getElementById("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(U._t); U._t = setTimeout(() => (t.hidden = true), ms);
  },
  modal(judul, html) {
    document.getElementById("modal-judul").textContent = judul;
    document.getElementById("modal-isi").innerHTML = html;
    document.getElementById("modal").hidden = false;
  },
  kelasDari(ib) {
    if (ib === null || ib === undefined || Number.isNaN(ib)) return null;
    return CONFIG.kelas[ib < 40 ? 0 : ib < 70 ? 1 : 2];
  },
  skorDari(v, aturan) { for (const [batas, s] of aturan) if (v < batas) return s; return aturan[aturan.length - 1][1]; },
  pill(k) { return k ? `<span class="pill" style="background:${k.warna};color:${k.kode === 1 ? "#3a3000" : "#fff"}">${k.nama}</span>` : "–"; }
};
