/* Excel reading and data preparation */
const FWExcel = (() => {
  const COL = { sku:0, desc:1, pack:2, price:3, qty:4, cases:6, sales:8, profit:11, gp:12, group:25, type:26, country:27, department:30 };
  const toNum = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(String(v).replace(/[€,£,%\s,]/g,''));
    return Number.isFinite(n) ? n : 0;
  };
  const normSku = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v).trim();
    if (!s) return '';
    const n = Number(s);
    return Number.isFinite(n) ? String(Math.trunc(n)) : s.replace(/\.0$/,'');
  };
  const txt = (v) => (v === null || v === undefined || String(v).trim()==='' ? 'Unclassified' : String(v).trim());

  async function readWorkbook(file){
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type:'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header:1, raw:true, defval:'' });
  }

  function parseRows(rows, year){
    const out = [];
    rows.slice(1).forEach(r => {
      const sku = normSku(r[COL.sku]);
      if (!sku) return;
      out.push({
        sku,
        description: txt(r[COL.desc]),
        packSize: toNum(r[COL.pack]),
        sellingPrice: toNum(r[COL.price]),
        qty: toNum(r[COL.qty]),
        cases: toNum(r[COL.cases]),
        sales: toNum(r[COL.sales]),
        profit: toNum(r[COL.profit]),
        gpPct: toNum(r[COL.gp]),
        productGroup: txt(r[COL.group]),
        productType: txt(r[COL.type]),
        country: txt(r[COL.country]),
        department: txt(r[COL.department]),
        year
      });
    });
    return out;
  }

  function aggregateBySku(rows){
    const map = new Map();
    rows.forEach(r => {
      if (!map.has(r.sku)) map.set(r.sku, {...r});
      else {
        const a = map.get(r.sku);
        a.qty += r.qty; a.cases += r.cases; a.sales += r.sales; a.profit += r.profit;
        a.gpPct = a.sales ? (a.profit / a.sales) * 100 : 0;
      }
    });
    return [...map.values()];
  }

  function compareProducts(rows2024, rows2025){
    const a24 = new Map(aggregateBySku(rows2024).map(r => [r.sku, r]));
    const a25 = new Map(aggregateBySku(rows2025).map(r => [r.sku, r]));
    const skus = new Set([...a24.keys(), ...a25.keys()]);
    return [...skus].map(sku => {
      const y24 = a24.get(sku) || {};
      const y25 = a25.get(sku) || {};
      const base = y25.sku ? y25 : y24;
      const sales24 = y24.sales || 0, sales25 = y25.sales || 0;
      const qty24 = y24.qty || 0, qty25 = y25.qty || 0;
      const growth = sales25 - sales24;
      return {
        sku,
        description: base.description || 'Unknown',
        productGroup: base.productGroup || 'Unclassified',
        productType: base.productType || 'Unclassified',
        country: base.country || 'Unclassified',
        department: base.department || 'Unclassified',
        sales2024: sales24,
        sales2025: sales25,
        salesGrowth: growth,
        salesGrowthPct: sales24 ? (growth / sales24) * 100 : (sales25 ? 100 : 0),
        qty2024: qty24,
        qty2025: qty25,
        qtyGrowth: qty25 - qty24,
        cases2025: y25.cases || 0,
        profit2025: y25.profit || 0,
        gpPct2025: sales25 ? ((y25.profit || 0) / sales25) * 100 : 0,
        sellingPrice: base.sellingPrice || 0
      };
    });
  }

  function groupBy(rows, key){
    const map = new Map();
    rows.forEach(r => {
      const k = r[key] || 'Unclassified';
      if (!map.has(k)) map.set(k, { name:k, sales2024:0, sales2025:0, qty2024:0, qty2025:0, profit2025:0, cases2025:0 });
      const a = map.get(k);
      a.sales2024 += r.sales2024; a.sales2025 += r.sales2025; a.qty2024 += r.qty2024; a.qty2025 += r.qty2025; a.profit2025 += r.profit2025; a.cases2025 += r.cases2025;
    });
    return [...map.values()].map(a => ({...a, growth:a.sales2025-a.sales2024, growthPct:a.sales2024 ? ((a.sales2025-a.sales2024)/a.sales2024)*100 : (a.sales2025?100:0), gpPct:a.sales2025 ? (a.profit2025/a.sales2025)*100 : 0}));
  }

  return { readWorkbook, parseRows, compareProducts, groupBy };
})();
