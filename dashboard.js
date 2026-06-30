/* Dashboard rendering */
const FWDashboard = (() => {
  const euro = v => new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v||0);
  const num = v => new Intl.NumberFormat('en-IE',{maximumFractionDigits:0}).format(v||0);
  const pct = v => `${(v||0).toFixed(1)}%`;
  const cls = v => v >= 0 ? 'positive' : 'negative';

  function kpiCard(label, value, sub='', extraClass=''){
    return `<div class="kpi"><div class="label">${label}</div><div class="value ${extraClass}">${value}</div><div class="sub">${sub}</div></div>`;
  }

  function renderKPIs(rows){
    const totals = rows.reduce((a,r)=>{
      a.s24 += r.sales2024; a.s25 += r.sales2025; a.q25 += r.qty2025; a.p25 += r.profit2025; a.c25 += r.cases2025; return a;
    },{s24:0,s25:0,q25:0,p25:0,c25:0});
    const growth = totals.s25 - totals.s24;
    const growthPct = totals.s24 ? growth / totals.s24 * 100 : 0;
    const gpPct = totals.s25 ? totals.p25 / totals.s25 * 100 : 0;
    document.getElementById('kpiGrid').innerHTML = [
      kpiCard('2025 Sales', euro(totals.s25), `2024: ${euro(totals.s24)}`),
      kpiCard('Sales Growth', pct(growthPct), euro(growth), cls(growth)),
      kpiCard('2025 Volume', num(totals.q25), 'Column E quantity'),
      kpiCard('2025 Profit', euro(totals.p25), `GP: ${pct(gpPct)}`),
      kpiCard('2025 Cases', num(totals.c25), 'Cases sold'),
      kpiCard('Products', num(rows.length), 'Compared by SKU')
    ].join('');
  }

  function renderBarChart(elId, data, valueKey='sales2025', maxItems=12){
    const el = document.getElementById(elId);
    const sorted = [...data].sort((a,b)=>b[valueKey]-a[valueKey]).slice(0,maxItems);
    const max = Math.max(...sorted.map(d=>Math.abs(d[valueKey])), 1);
    el.innerHTML = sorted.map(d => {
      const w = Math.max(1, Math.abs(d[valueKey]) / max * 100);
      const growthClass = d.growth >= 0 ? 'positive' : 'negative';
      return `<div class="bar-row"><div class="bar-name" title="${d.name}">${d.name}</div><div class="bar-track"><div class="bar-fill" style="width:${w}%"></div></div><div class="bar-value">${euro(d[valueKey])}<br><span class="${growthClass}">${pct(d.growthPct)}</span></div></div>`;
    }).join('') || '<p class="muted">No data.</p>';
  }

  function renderRankList(elId, rows, direction='winners'){
    const sorted = [...rows].filter(r => direction==='winners' ? r.salesGrowth>0 : r.salesGrowth<0).sort((a,b)=> direction==='winners' ? b.salesGrowth-a.salesGrowth : a.salesGrowth-b.salesGrowth).slice(0,12);
    document.getElementById(elId).innerHTML = sorted.map(r => `<div class="rank-item"><div><strong>${r.description}</strong><small>${r.sku} · ${r.productGroup}</small></div><div class="num">${euro(r.salesGrowth)}</div><div class="${cls(r.salesGrowth)}">${pct(r.salesGrowthPct)}</div></div>`).join('') || '<p class="muted">No data.</p>';
  }

  function renderTable(rows){
    const tbody = document.querySelector('#productsTable tbody');
    const displayRows = [...rows].sort((a,b)=>b.sales2025-a.sales2025).slice(0,500);
    tbody.innerHTML = displayRows.map(r => `<tr>
      <td>${r.sku}</td><td>${r.description}</td><td>${r.productGroup}</td><td>${r.productType}</td><td>${r.country}</td><td>${r.department}</td>
      <td class="num">${euro(r.sales2024)}</td><td class="num">${euro(r.sales2025)}</td><td class="num ${cls(r.salesGrowth)}">${euro(r.salesGrowth)}</td><td class="num ${cls(r.salesGrowth)}">${pct(r.salesGrowthPct)}</td>
      <td class="num">${num(r.qty2024)}</td><td class="num">${num(r.qty2025)}</td><td class="num ${cls(r.qtyGrowth)}">${num(r.qtyGrowth)}</td><td class="num">${euro(r.profit2025)}</td><td class="num">${pct(r.gpPct2025)}</td><td class="num">${num(r.cases2025)}</td>
    </tr>`).join('');
  }

  function fillSelect(id, values){
    const el = document.getElementById(id);
    const first = el.options[0].outerHTML;
    el.innerHTML = first + [...new Set(values.filter(Boolean))].sort().map(v=>`<option value="${v}">${v}</option>`).join('');
  }

  return { euro, num, pct, renderKPIs, renderBarChart, renderRankList, renderTable, fillSelect };
})();
