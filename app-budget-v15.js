// orçamento completo v17 - compras renderizadas diretamente, sem depender do renderer legado
(function(){
  window.__budgetTab=window.__budgetTab||'summary';
  window.__budgetMonth=window.__budgetMonth||null;

  const tabs=a=>`<div class="tabs"><button class="${a==='summary'?'on':''}" onclick="renderBudget('summary')">Resumo</button><button class="${a==='detail'?'on':''}" onclick="renderBudget('detail')">Detalhado</button><button class="${a==='abc'?'on':''}" onclick="renderBudget('abc')">Curva ABC</button><button class="${a==='buy'?'on':''}" onclick="renderBudget('buy')">Compras</button></div>`;

  function summary(el){
    const ms=state.macros||[],tot=ms.reduce((s,m)=>s+(+m.total||0),0),mat=ms.reduce((s,m)=>s+(+m.material||0),0),lab=ms.reduce((s,m)=>s+(+m.labor||0),0),eq=ms.reduce((s,m)=>s+(+m.equipment||0),0),oth=ms.reduce((s,m)=>s+(+m.others||0),0);
    el.innerHTML=`<div class="section-title">Orçamento completo <span>${(state.services||[]).length} serviços</span></div>${tabs('summary')}<div class="grid"><div class="card kpi"><div class="label">Total</div><div class="value">${brl(tot)}</div></div><div class="card kpi"><div class="label">Materiais</div><div class="value">${brl(mat)}</div></div><div class="card kpi"><div class="label">Mão de obra</div><div class="value">${brl(lab)}</div></div><div class="card kpi"><div class="label">Equip. + outros</div><div class="value">${brl(eq+oth)}</div></div></div><div class="section-title">Etapas</div><div class="list">${ms.map(m=>`<div class="item"><div class="row"><div class="grow"><h3>${m.name}</h3><div class="meta"><span>Material ${brl(m.material)}</span><span>M.O. ${brl(m.labor)}</span></div></div><div class="money">${brl(m.total)}</div></div><div class="progress" style="margin-top:8px"><i style="width:${tot?Math.min(100,m.total/tot*100):0}%"></i></div><div class="meta" style="margin-top:5px"><span>${tot?pct(m.total/tot):'0,0%'} do orçamento</span></div></div>`).join('')}</div>`;
  }

  function detail(el){
    const ss=state.services||[];
    el.innerHTML=`<div class="section-title">Orçamento detalhado <span>${ss.length} itens</span></div>${tabs('detail')}<div class="search"><input placeholder="Buscar serviço ou código..." oninput="budgetFilter(this.value)"></div><div class="scroll-table"><table class="detail-table"><thead><tr><th>Código</th><th>Serviço</th><th>Qtd.</th><th>Un.</th><th>Unit.</th><th>Total</th></tr></thead><tbody>${ss.map(s=>`<tr class="budget-row" data-search="${(s.code+' '+s.name+' '+(s.reference||'')).toLowerCase().replaceAll('"','&quot;')}"><td>${s.code}</td><td><b>${s.name}</b><br><small>${s.macro||''}</small></td><td class="num">${Number(s.qty||0).toLocaleString('pt-BR',{maximumFractionDigits:3})}</td><td>${s.unit||''}</td><td class="num">${brl(s.unitCost)}</td><td class="num"><b>${brl(s.total)}</b></td></tr>`).join('')}</tbody></table></div>`;
  }

  window.budgetFilter=q=>{q=String(q||'').toLowerCase();document.querySelectorAll('.budget-row').forEach(r=>r.style.display=!q||r.dataset.search.includes(q)?'':'none')};

  function abc(el){
    const a=state.abc||[];
    el.innerHTML=`<div class="section-title">Curva ABC <span>${a.length} itens</span></div>${tabs('abc')}<div class="list">${a.map(x=>`<div class="item"><div class="row"><div class="grow"><h3>${x.rank}. ${x.code} · ${x.name}</h3><div class="meta"><span>${x.macro}</span><span>${pct(x.pct)} do total</span><span>Acum. ${pct(x.cumPct)}</span></div></div><div><div class="money">${brl(x.total)}</div><span class="badge cls${x.class}">${x.class}</span></div></div></div>`).join('')}</div>`;
  }

  function buy(el,month){
    const months=projectMonths();
    const k=month||window.__budgetMonth||defaultBuyMonth();
    window.__budgetMonth=k;
    const a=purchasesForMonth(k);
    const opts=months.map(x=>`<option value="${x}" ${x===k?'selected':''}>${monthLabel(x)}</option>`).join('');
    let estimated=0,quoted=0,paid=0,pending=0,delivered=0;
    a.forEach(p=>{
      estimated+=+p.estimatedCost||0;
      const m=(typeof purchaseMeta==='function')?purchaseMeta(k,p):{status:'A comprar',supplier:'',quotedTotal:0,paidAmount:0,deadline:''};
      quoted+=+m.quotedTotal||0; paid+=+m.paidAmount||0;
      if(['Entregue','Pago'].includes(m.status)) delivered++; else pending++;
    });
    el.innerHTML=`<div class="section-title">Programação de compras <span>${monthLabel(k)}</span></div>${tabs('buy')}<div class="card"><label>Mês de execução</label><select onchange="renderBudget('buy',this.value)">${opts}</select><div class="mini-grid" style="margin-top:10px"><div class="mini"><small>Itens previstos</small><b>${a.length}</b></div><div class="mini"><small>Pendentes</small><b>${pending}</b></div><div class="mini"><small>Estimado</small><b>${brl(estimated)}</b></div><div class="mini"><small>Cotado/Pedido</small><b>${brl(quoted)}</b></div><div class="mini"><small>Entregues</small><b>${delivered}</b></div><div class="mini"><small>Pago</small><b>${brl(paid)}</b></div></div>${typeof exportPurchasesCSV==='function'?`<button class="btn alt" style="margin-top:10px;width:100%" onclick="exportPurchasesCSV('${k}')">Exportar compras do mês</button>`:''}</div><div class="section-title">Comprar / contratar</div><div class="list">${a.length?a.map(p=>{const m=(typeof purchaseMeta==='function')?purchaseMeta(k,p):{status:'A comprar',supplier:'',quotedTotal:0,deadline:''};const click=typeof purchasePlanForm==='function'?`onclick="purchasePlanForm('${k}',${JSON.stringify(p.name)},${JSON.stringify(p.unit)})"`:'';return `<div class="item" ${click}><div class="row"><div class="grow"><h3>${p.name}</h3><div class="meta"><span>${p.source||''}</span><span>atividades ${(p.tasks||[]).join(', ')}</span>${m.supplier?`<span>${m.supplier}</span>`:''}</div></div><span class="badge">${m.status||'A comprar'}</span></div><div class="purchase"><div><small>${m.deadline?'Comprar até '+date(m.deadline):'Sem prazo definido'}</small></div><div class="qty">${fmtQty(p.qty,p.unit)}<br><small>${m.quotedTotal?brl(m.quotedTotal):brl(p.estimatedCost)}</small></div></div></div>`}).join(''):'<div class="empty">Nenhuma compra identificada para este mês.</div>'}</div>`;
  }

  window.renderBudget=function(tab,month){
    tab=tab||window.__budgetTab||'summary';
    window.__budgetTab=tab;
    if(month) window.__budgetMonth=month;
    const el=document.getElementById('budget');if(!el)return;
    if(!(state.services||[]).length){el.innerHTML='<div class="empty">Carregando orçamento completo...</div>';return;}
    if(tab==='detail')return detail(el);
    if(tab==='abc')return abc(el);
    if(tab==='buy')return buy(el,month);
    return summary(el);
  };

  window.renderBudgetV15Ready=true;
  try{renderBudget(window.__budgetTab)}catch(e){console.error(e)}
})();
