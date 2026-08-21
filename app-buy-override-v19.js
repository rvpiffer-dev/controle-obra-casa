// v21 - Compras mensal sem fechar o seletor durante sincronizacao/renderAll
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

  function monthLabel(k){
    if(!k) return '—';
    const p=k.split('-');
    return new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(Number(p[0]),Number(p[1])-1,1));
  }

  function months(){
    const set=new Set();
    (state.tasks||[]).forEach(t=>{
      const s=monthKey(t.start), f=monthKey(t.finish);
      if(!s) return;
      const sd=new Date(s+'-01T12:00:00');
      const fd=new Date((f||s)+'-01T12:00:00');
      const d=new Date(sd);
      while(d<=fd){
        set.add(d.toISOString().slice(0,7));
        d.setMonth(d.getMonth()+1);
      }
    });
    return [...set].sort();
  }

  function defaultMonth(){
    const ms=months();
    if(window.__budgetMonth && ms.includes(window.__budgetMonth)) return window.__budgetMonth;
    const now=new Date().toISOString().slice(0,7);
    return ms.find(x=>x>=now)||ms[0]||now;
  }

  function itemsForMonth(k){
    const ids=new Set((state.tasks||[])
      .filter(t=>{
        const s=monthKey(t.start), f=monthKey(t.finish)||s;
        return s && s<=k && f>=k;
      })
      .map(t=>String(t.id)));
    return (Array.isArray(state.purchases)?state.purchases:[]).filter(p=>ids.has(String(p.taskId)));
  }

  function renderBuy(month){
    const el=document.getElementById('budget');
    if(!el) return;
    window.__budgetTab='buy';
    const ms=months();
    const k=(month && ms.includes(month))?month:defaultMonth();
    window.__budgetMonth=k;
    const items=itemsForMonth(k);
    const total=items.reduce((s,p)=>s+(Number(p.estimatedCost)||0),0);
    const opts=ms.map(x=>`<option value="${x}" ${x===k?'selected':''}>${esc(monthLabel(x))}</option>`).join('');

    el.innerHTML=`
      <div class="section-title">Programação de compras <span>${esc(monthLabel(k))}</span></div>
      <div class="tabs">
        <button onclick="renderBudget('summary')">Resumo</button>
        <button onclick="renderBudget('detail')">Detalhado</button>
        <button onclick="renderBudget('abc')">Curva ABC</button>
        <button class="on" onclick="renderBudget('buy')">Compras</button>
      </div>
      <div class="card">
        <label>Mês de execução</label>
        <select id="buyMonthSelectV21"
          onfocus="window.__buyMonthSelecting=true"
          onpointerdown="window.__buyMonthSelecting=true"
          onchange="window.__buyMonthSelecting=false;renderBudget('buy',this.value)"
          onblur="setTimeout(()=>{window.__buyMonthSelecting=false},150)">${opts}</select>
      </div>
      <div class="grid" style="margin-top:10px">
        <div class="card kpi"><div class="label">Itens no mês</div><div class="value">${items.length}</div></div>
        <div class="card kpi"><div class="label">Estimativa do mês</div><div class="value">${brl(total)}</div></div>
      </div>
      <div class="search"><input placeholder="Buscar compra neste mês..." oninput="window.filterBuyV19(this.value)"></div>
      <div class="section-title">Itens de compra</div>
      <div class="list" id="buyListV19">
        ${items.length?items.map((p,i)=>`<div class="item buy-v19-row" data-q="${esc(((p.name||'')+' '+(p.source||'')+' '+(p.unit||'')+' '+(p.taskId||'')).toLowerCase())}"><div class="row"><div class="grow"><h3>${esc(p.name||('Item '+(i+1)))}</h3><div class="meta"><span>${esc(p.source||'Sem referência')}</span><span>atividade ${esc(p.taskId||'—')}</span></div></div><div class="money">${brl(Number(p.estimatedCost)||0)}</div></div><div class="meta" style="margin-top:6px"><span>${qty(p.qty,p.unit)}</span></div></div>`).join(''):'<div class="empty">Nenhum item de compra previsto para este mês.</div>'}
      </div>`;
  }

  window.filterBuyV19=function(q){
    q=String(q||'').toLowerCase();
    document.querySelectorAll('.buy-v19-row').forEach(r=>r.style.display=!q||r.dataset.q.includes(q)?'':'none');
  };

  window.renderBudget=function(tab,month){
    const implicitCall = arguments.length===0;
    tab=tab||window.__budgetTab||'summary';

    // renderAll()/Firebase nao recriam a aba enquanto o usuario esta escolhendo o mes.
    if(implicitCall && tab==='buy' && window.__buyMonthSelecting){
      return;
    }

    if(tab==='buy'){
      try{ return renderBuy(month); }
      catch(e){
        console.error('Compras v21',e);
        const el=document.getElementById('budget');
        if(el) el.innerHTML='<div class="empty">Erro ao abrir Compras v21: '+esc(e.message||e)+'</div>';
        return;
      }
    }
    return previous(tab,month);
  };

  window.__buyOverrideV21=true;
})();