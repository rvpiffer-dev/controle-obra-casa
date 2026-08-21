// v25 - Compras mensal com ABC/calendario e exclusao de insumos duplicados da alvenaria
(function(){
  const previous = window.renderBudget;

  function esc(v){
    return String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  }
  function qty(v,u){
    const n=Number(v)||0;
    return n.toLocaleString('pt-BR',{maximumFractionDigits:3})+(u?' '+esc(u):'');
  }
  function monthKey(d){ return String(d||'').slice(0,7); }
  function parseDate(s){ return s?new Date(String(s).slice(0,10)+'T12:00:00'):null; }
  function dayMs(){ return 86400000; }
  function overlapDays(a1,a2,b1,b2){
    const s=new Date(Math.max(a1.getTime(),b1.getTime()));
    const e=new Date(Math.min(a2.getTime(),b2.getTime()));
    return e<s?0:Math.floor((e-s)/dayMs())+1;
  }
  function fmtDate(d){ return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'}).format(d); }
  function monthLabel(k){
    if(!k) return '—';
    const p=k.split('-');
    return new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(Number(p[0]),Number(p[1])-1,1));
  }

  // O serviço 04.01 foi ajustado para retirar blocos/canaletas da composição SINAPI.
  // Esses insumos aparecem novamente como linhas específicas 04.02, 04.03 e 04.05,
  // com os preços válidos do orçamento/EAP. Portanto, os insumos analíticos abaixo
  // não podem entrar novamente em Compras/ABC/calendário.
  function isAdjustedMasonryDuplicate(p){
    if(String(p.serviceCode||'')!=='04.01') return false;
    if(String(p.source||'').toLowerCase()!=='sinapi analítico') return false;
    return ['34586','34649','34788'].includes(String(p.inputCode||''));
  }
  function validPurchases(){
    return (Array.isArray(state.purchases)?state.purchases:[]).filter(p=>!isAdjustedMasonryDuplicate(p));
  }

  function months(){
    const set=new Set();
    (state.tasks||[]).forEach(t=>{
      const s=monthKey(t.start), f=monthKey(t.finish);
      if(!s) return;
      const sd=new Date(s+'-01T12:00:00');
      const fd=new Date((f||s)+'-01T12:00:00');
      const d=new Date(sd);
      while(d<=fd){set.add(d.toISOString().slice(0,7));d.setMonth(d.getMonth()+1)}
    });
    return [...set].sort();
  }
  function defaultMonth(){
    const ms=months();
    if(window.__budgetMonth && ms.includes(window.__budgetMonth)) return window.__budgetMonth;
    const now=new Date().toISOString().slice(0,7);
    return ms.find(x=>x>=now)||ms[0]||now;
  }
  function taskActiveInMonth(t,k){
    const s=monthKey(t.start), f=monthKey(t.finish)||s;
    return s && s<=k && f>=k;
  }
  function itemsForMonth(k){
    const ids=new Set((state.tasks||[]).filter(t=>taskActiveInMonth(t,k)).map(t=>String(t.id)));
    return validPurchases().filter(p=>ids.has(String(p.taskId)));
  }
  function groupedItems(items){
    const m=new Map();
    items.forEach(p=>{
      const key=(p.name||'')+'|'+(p.unit||'');
      if(!m.has(key))m.set(key,{name:p.name||'Item',unit:p.unit||'',qty:0,estimatedCost:0,sources:new Set(),tasks:new Set()});
      const x=m.get(key);x.qty+=Number(p.qty)||0;x.estimatedCost+=Number(p.estimatedCost)||0;
      if(p.source)x.sources.add(p.source);if(p.taskId!==undefined)x.tasks.add(p.taskId);
    });
    return [...m.values()].map(x=>({...x,sources:[...x.sources],tasks:[...x.tasks]}));
  }
  function abcData(items){
    const rows=groupedItems(items).sort((a,b)=>b.estimatedCost-a.estimatedCost);
    const total=rows.reduce((s,x)=>s+x.estimatedCost,0);
    let cum=0;
    return rows.map((x,i)=>{
      const part=total?x.estimatedCost/total:0;cum+=part;
      const cls=cum<=0.80?'A':cum<=0.95?'B':'C';
      return {...x,rank:i+1,part,cum,cls};
    });
  }
  function weekRanges(k){
    const [y,m]=k.split('-').map(Number);
    const first=new Date(y,m-1,1,12), last=new Date(y,m,0,12);
    const start=new Date(first);const dow=(start.getDay()+6)%7;start.setDate(start.getDate()-dow);
    const weeks=[];let d=new Date(start);
    while(d<=last){const ws=new Date(d),we=new Date(d);we.setDate(we.getDate()+6);weeks.push([ws,we]);d.setDate(d.getDate()+7)}
    return weeks;
  }
  function weekData(k){
    return weekRanges(k).map(([ws,we],idx)=>{
      const tasks=(state.tasks||[]).filter(t=>{
        const ts=parseDate(t.start),tf=parseDate(t.finish||t.start);return ts&&tf&&overlapDays(ts,tf,ws,we)>0;
      });
      let planned=0;
      tasks.forEach(t=>{
        const ts=parseDate(t.start),tf=parseDate(t.finish||t.start);if(!ts||!tf)return;
        const totalDays=Math.max(1,overlapDays(ts,tf,ts,tf));
        const od=overlapDays(ts,tf,ws,we);
        planned+=(Number(t.plannedCost)||0)*(od/totalDays);
      });
      const ids=new Set(tasks.map(t=>String(t.id)));
      const materials=groupedItems(validPurchases().filter(p=>ids.has(String(p.taskId)))).sort((a,b)=>b.estimatedCost-a.estimatedCost);
      const materialTotal=materials.reduce((s,x)=>s+x.estimatedCost,0);
      return {idx:idx+1,ws,we,tasks,planned,materials,materialTotal};
    });
  }

  function renderABC(items){
    const rows=abcData(items),total=rows.reduce((s,x)=>s+x.estimatedCost,0);
    const sums={A:0,B:0,C:0};rows.forEach(x=>sums[x.cls]+=x.estimatedCost);
    return `<div class="section-title">Curva ABC das compras <span>${rows.length} itens agrupados</span></div>
      <div class="grid">
        <div class="card kpi"><div class="label">Classe A</div><div class="value">${brl(sums.A)}</div><div class="sub">até 80% acumulado</div></div>
        <div class="card kpi"><div class="label">Classe B</div><div class="value">${brl(sums.B)}</div><div class="sub">80% a 95%</div></div>
        <div class="card kpi"><div class="label">Classe C</div><div class="value">${brl(sums.C)}</div><div class="sub">acima de 95%</div></div>
        <div class="card kpi"><div class="label">Total analisado</div><div class="value">${brl(total)}</div><div class="sub">mês selecionado</div></div>
      </div>
      <div class="scroll-table" style="margin-top:10px"><table class="detail-table" style="min-width:760px"><thead><tr><th>#</th><th>Classe</th><th>Item</th><th>Qtd.</th><th>Valor</th><th>%</th><th>Acum.</th></tr></thead><tbody>
      ${rows.map(x=>`<tr><td>${x.rank}</td><td><span class="badge cls${x.cls}">${x.cls}</span></td><td><b>${esc(x.name)}</b></td><td>${qty(x.qty,x.unit)}</td><td class="num">${brl(x.estimatedCost)}</td><td class="num">${(x.part*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}%</td><td class="num">${(x.cum*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}%</td></tr>`).join('')}
      </tbody></table></div>`;
  }

  function renderCalendar(k){
    const weeks=weekData(k);
    return `<div class="section-title">Calendário semanal da obra <span>${esc(monthLabel(k))}</span></div>
      <div class="list">${weeks.map(w=>`<div class="item">
        <div class="row"><div class="grow"><h3>Semana ${w.idx} · ${fmtDate(w.ws)} a ${fmtDate(w.we)}</h3><div class="meta"><span>${w.tasks.length} atividades</span><span>${w.materials.length} itens de compra</span></div></div><div class="money">${brl(w.planned)}</div></div>
        <div class="mini-grid" style="margin-top:10px"><div class="mini"><small>Gasto planejado da semana</small><b>${brl(w.planned)}</b></div><div class="mini"><small>Materiais/contratações previstos</small><b>${brl(w.materialTotal)}</b></div></div>
        <details style="margin-top:10px"><summary>O que será feito</summary><div class="inside">${w.tasks.length?w.tasks.map(t=>`<div style="padding:5px 0"><b>${esc(t.name)}</b><div class="meta"><span>${esc(t.phase||'')}</span><span>${esc(t.start||'')} → ${esc(t.finish||t.start||'')}</span></div></div>`).join(''):'<div class="empty">Sem atividades nesta semana.</div>'}</div></details>
        <details><summary>O que será usado</summary><div class="inside">${w.materials.length?w.materials.map(p=>`<div class="purchase"><div><b>${esc(p.name)}</b><br><small>${esc(p.sources.join(', ')||'Sem referência')}</small></div><div class="qty">${qty(p.qty,p.unit)}<br><small>${brl(p.estimatedCost)}</small></div></div>`).join(''):'<div class="empty">Sem compras vinculadas às atividades desta semana.</div>'}</div></details>
      </div>`).join('')}</div>`;
  }

  function renderBuy(month){
    const el=document.getElementById('budget');if(!el)return;
    window.__budgetTab='buy';
    const ms=months();const k=(month&&ms.includes(month))?month:defaultMonth();window.__budgetMonth=k;
    const items=itemsForMonth(k),total=items.reduce((s,p)=>s+(Number(p.estimatedCost)||0),0);
    const opts=ms.map(x=>`<option value="${x}" ${x===k?'selected':''}>${esc(monthLabel(x))}</option>`).join('');
    el.innerHTML=`
      <div class="section-title">Programação de compras <span>${esc(monthLabel(k))}</span></div>
      <div class="tabs"><button onclick="renderBudget('summary')">Resumo</button><button onclick="renderBudget('detail')">Detalhado</button><button onclick="renderBudget('abc')">Curva ABC</button><button class="on" onclick="renderBudget('buy')">Compras</button></div>
      <div class="card"><label>Mês de execução</label><select id="buyMonthSelectV25" onfocus="window.__buyMonthSelecting=true" onpointerdown="window.__buyMonthSelecting=true" onchange="window.__buyMonthSelecting=false;renderBudget('buy',this.value)" onblur="setTimeout(()=>{window.__buyMonthSelecting=false},150)">${opts}</select></div>
      <div class="grid" style="margin-top:10px"><div class="card kpi"><div class="label">Itens no mês</div><div class="value">${items.length}</div></div><div class="card kpi"><div class="label">Estimativa do mês</div><div class="value">${brl(total)}</div></div></div>
      ${renderABC(items)}
      ${renderCalendar(k)}
      <div class="search"><input placeholder="Buscar compra neste mês..." oninput="window.filterBuyV25(this.value)"></div>
      <div class="section-title">Itens de compra <span>${items.length}</span></div>
      <div class="list" id="buyListV25">${items.length?items.map((p,i)=>`<div class="item buy-v25-row" data-q="${esc(((p.name||'')+' '+(p.source||'')+' '+(p.unit||'')+' '+(p.taskId||'')).toLowerCase())}"><div class="row"><div class="grow"><h3>${esc(p.name||('Item '+(i+1)))}</h3><div class="meta"><span>${esc(p.source||'Sem referência')}</span><span>atividade ${esc(p.taskId||'—')}</span></div></div><div class="money">${brl(Number(p.estimatedCost)||0)}</div></div><div class="meta" style="margin-top:6px"><span>${qty(p.qty,p.unit)}</span></div></div>`).join(''):'<div class="empty">Nenhum item de compra previsto para este mês.</div>'}</div>`;
  }

  window.filterBuyV25=function(q){q=String(q||'').toLowerCase();document.querySelectorAll('.buy-v25-row').forEach(r=>r.style.display=!q||r.dataset.q.includes(q)?'':'none')};
  window.renderBudget=function(tab,month){
    const implicitCall=arguments.length===0;tab=tab||window.__budgetTab||'summary';
    if(implicitCall&&tab==='buy'&&window.__buyMonthSelecting)return;
    if(tab==='buy'){
      try{return renderBuy(month)}catch(e){console.error('Compras v25',e);const el=document.getElementById('budget');if(el)el.innerHTML='<div class="empty">Erro ao abrir Compras v25: '+esc(e.message||e)+'</div>';return}
    }
    return previous(tab,month);
  };
  window.__buyOverrideV25=true;
})();