// v31 - cronograma fisico-financeiro com Curva S
(function(){
  const previousSchedule=window.renderSchedule;
  window.__scheduleView=window.__scheduleView||'activities';
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const mk=d=>String(d||'').slice(0,7);
  const dp=s=>s?new Date(String(s).slice(0,10)+'T12:00:00'):null;
  const DAY=86400000;

  const style=document.createElement('style');
  style.textContent=`.sch-view-tabs-v31{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0 12px}.sch-view-tabs-v31 button{border:1px solid var(--line);background:#fff;color:var(--blue);border-radius:10px;padding:10px;font-weight:750}.sch-view-tabs-v31 button.on{background:var(--blue);color:#fff}.s-legend-v31{display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--muted);margin:7px 2px}.s-legend-v31 span:before{content:'—';font-weight:900;margin-right:4px}.s-chart-v31{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px;overflow:hidden}.s-chart-v31 svg{width:100%;height:230px;display:block}.ff-table-v31{width:100%;border-collapse:collapse;font-size:11px}.ff-table-v31 th,.ff-table-v31 td{padding:7px 6px;border-bottom:1px solid var(--line);white-space:nowrap}.ff-table-v31 th{text-align:left;color:var(--muted);font-size:10px}.ff-table-v31 td.num{text-align:right}.pls-chip-v31{display:inline-flex;padding:3px 7px;border-radius:99px;background:#e9eff5;color:var(--blue);font-size:10px;font-weight:750}@media(max-width:520px){.sch-view-tabs-v31{grid-template-columns:1fr 1fr}.s-chart-v31 svg{height:190px}}`;
  document.head.appendChild(style);

  function overlap(a1,a2,b1,b2){const s=Math.max(a1.getTime(),b1.getTime()),e=Math.min(a2.getTime(),b2.getTime());return e<s?0:Math.floor((e-s)/DAY)+1}
  function monthLabel(k){if(!k)return '—';const [y,m]=k.split('-').map(Number);return new Intl.DateTimeFormat('pt-BR',{month:'short',year:'2-digit'}).format(new Date(y,m-1,1))}
  function months(){const set=new Set();(state.tasks||[]).forEach(t=>{const s=mk(t.start),f=mk(t.finish)||s;if(!s)return;let d=new Date(s+'-01T12:00:00'),e=new Date(f+'-01T12:00:00');while(d<=e){set.add(d.toISOString().slice(0,7));d.setMonth(d.getMonth()+1)}});return [...set].sort()}
  function plannedByMonth(){const out={};(state.tasks||[]).forEach(t=>{const s=dp(t.start),f=dp(t.finish||t.start);if(!s||!f)return;const totalDays=Math.max(1,overlap(s,f,s,f)),cost=Number(t.plannedCost)||0;let d=new Date(s.getFullYear(),s.getMonth(),1,12),end=new Date(f.getFullYear(),f.getMonth(),1,12);while(d<=end){const k=d.toISOString().slice(0,7),me=new Date(d.getFullYear(),d.getMonth()+1,0,12),od=overlap(s,f,d,me);out[k]=(out[k]||0)+cost*(od/totalDays);d.setMonth(d.getMonth()+1)}});return out}
  function actualByMonth(){const out={};(state.costs||[]).forEach(c=>{const k=mk(c.date);if(k)out[k]=(out[k]||0)+(Number(c.paid)||0)});return out}
  function currentPhysical(){const total=(state.tasks||[]).reduce((a,t)=>a+(Number(t.plannedCost)||0),0)||1;return (state.tasks||[]).reduce((a,t)=>a+(Number(t.plannedCost)||0)*(Number(t.progress)||0),0)/total}
  function plsForMonth(k){return (state.pls||[]).filter(p=>mk(p.date)===k)}

  function data(){const ms=months(),plan=plannedByMonth(),actual=actualByMonth(),total=(state.tasks||[]).reduce((a,t)=>a+(Number(t.plannedCost)||0),0)||1;let cp=0,ca=0;return ms.map(k=>{cp+=plan[k]||0;ca+=actual[k]||0;return{k,monthPlan:plan[k]||0,planCum:cp,planPct:cp/total,actualMonth:actual[k]||0,actualCum:ca,actualPct:ca/total,pls:plsForMonth(k)}})}

  function svgChart(rows){
    if(!rows.length)return '<div class="empty">Sem dados para gerar a Curva S.</div>';
    const W=760,H=230,L=42,R=15,T=16,B=38,iw=W-L-R,ih=H-T-B,n=Math.max(1,rows.length-1);
    const x=i=>L+(i/n)*iw,y=p=>T+(1-Math.max(0,Math.min(1,p)))*ih;
    const ptsPlan=rows.map((r,i)=>`${x(i)},${y(r.planPct)}`).join(' '),ptsAct=rows.map((r,i)=>`${x(i)},${y(r.actualPct)}`).join(' ');
    const grid=[0,.25,.5,.75,1].map(p=>`<line x1="${L}" y1="${y(p)}" x2="${W-R}" y2="${y(p)}" stroke="currentColor" opacity=".10"/><text x="${L-6}" y="${y(p)+4}" text-anchor="end" font-size="10" fill="currentColor" opacity=".65">${Math.round(p*100)}%</text>`).join('');
    const labels=rows.map((r,i)=>i%Math.max(1,Math.ceil(rows.length/7))===0||i===rows.length-1?`<text x="${x(i)}" y="${H-12}" text-anchor="middle" font-size="9" fill="currentColor" opacity=".65">${esc(monthLabel(r.k))}</text>`:'').join('');
    return `<div class="s-chart-v31"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="Curva S">${grid}<polyline points="${ptsPlan}" fill="none" stroke="#245b92" stroke-width="3" vector-effect="non-scaling-stroke"/><polyline points="${ptsAct}" fill="none" stroke="#25805e" stroke-width="3" stroke-dasharray="7 5" vector-effect="non-scaling-stroke"/>${labels}</svg></div><div class="s-legend-v31"><span>Previsto acumulado</span><span>Financeiro realizado acumulado</span></div>`;
  }

  function tabs(active){return `<div class="sch-view-tabs-v31"><button class="${active==='activities'?'on':''}" onclick="setScheduleViewV31('activities')">Atividades</button><button class="${active==='ff'?'on':''}" onclick="setScheduleViewV31('ff')">Físico-financeiro</button></div>`}

  function renderFF(){
    const el=document.getElementById('schedule');if(!el)return;
    const rows=data(),total=rows.reduce((a,r)=>a+r.monthPlan,0),paid=rows.reduce((a,r)=>a+r.actualMonth,0),phys=currentPhysical(),fin=total?paid/total:0;
    const today=mk(new Date().toISOString().slice(0,10)),plannedNow=rows.filter(r=>r.k<=today).at(-1)?.planPct||0;
    el.innerHTML=`<div class="section-title">Cronograma <span>Físico-financeiro</span></div>${tabs('ff')}
      <div class="grid"><div class="card kpi"><div class="label">Avanço físico atual</div><div class="value">${pct(phys)}</div><div class="sub">ponderado pelo orçamento das atividades</div></div><div class="card kpi"><div class="label">Físico previsto até agora</div><div class="value">${pct(plannedNow)}</div></div><div class="card kpi"><div class="label">Financeiro realizado</div><div class="value">${pct(fin)}</div><div class="sub">${brl(paid)} pagos</div></div><div class="card kpi"><div class="label">Custo planejado</div><div class="value">${brl(total)}</div></div></div>
      <div class="section-title">Curva S <span>acumulado</span></div>${svgChart(rows)}
      <div class="section-title">Físico-financeiro mensal <span>${rows.length} meses</span></div>
      <div class="scroll-table"><table class="ff-table-v31" style="min-width:860px"><thead><tr><th>Mês</th><th>Previsto mês</th><th>Previsto acum.</th><th>% físico/financeiro prev.</th><th>Pago mês</th><th>Pago acum.</th><th>% financeiro real.</th><th>PLS</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(monthLabel(r.k))}</b></td><td class="num">${brl(r.monthPlan)}</td><td class="num">${brl(r.planCum)}</td><td class="num">${pct(r.planPct)}</td><td class="num">${brl(r.actualMonth)}</td><td class="num">${brl(r.actualCum)}</td><td class="num">${pct(r.actualPct)}</td><td>${r.pls.length?r.pls.map(p=>`<span class="pls-chip-v31">Etapa ${p.stage} · ${pct(p.cumPct)}</span>`).join(' '):'—'}</td></tr>`).join('')}</tbody></table></div>
      <div class="item" style="margin-top:10px"><div class="meta"><span><b>Nota:</b> o avanço físico realizado é o retrato atual das atividades. O aplicativo ainda não possui histórico diário/mensal de progresso físico, portanto não inventa uma curva histórica de físico realizado.</span></div></div>`;
  }

  function injectTabs(){const el=document.getElementById('schedule');if(!el)return;const title=el.querySelector('.section-title');if(title&&!el.querySelector('.sch-view-tabs-v31'))title.insertAdjacentHTML('afterend',tabs('activities'))}
  window.setScheduleViewV31=function(view){window.__scheduleView=view;if(view==='ff')return renderFF();previousSchedule();setTimeout(injectTabs,0)};
  window.renderSchedule=function(){if(window.__scheduleView==='ff')return renderFF();const out=previousSchedule();setTimeout(injectTabs,0);return out};
  try{renderSchedule()}catch(e){console.error('Cronograma físico-financeiro v31',e)}
  window.__physicalFinancialV31=true;
})();