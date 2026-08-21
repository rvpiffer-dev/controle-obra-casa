// v19 - override isolado da aba Compras; zero dependencias auxiliares
(function(){
  const previous = window.renderBudget;

  function esc(v){
    return String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  }

  function qty(v,u){
    const n=Number(v)||0;
    return n.toLocaleString('pt-BR',{maximumFractionDigits:3})+(u?' '+esc(u):'');
  }

  function renderBuy(){
    const el=document.getElementById('budget');
    if(!el) return;
    window.__budgetTab='buy';
    const items=Array.isArray(state?.purchases)?state.purchases:[];
    const total=items.reduce((s,p)=>s+(Number(p.estimatedCost)||0),0);
    el.innerHTML=`
      <div class="section-title">Programação de compras <span>${items.length} itens</span></div>
      <div class="tabs">
        <button onclick="renderBudget('summary')">Resumo</button>
        <button onclick="renderBudget('detail')">Detalhado</button>
        <button onclick="renderBudget('abc')">Curva ABC</button>
        <button class="on" onclick="renderBudget('buy')">Compras</button>
      </div>
      <div class="grid">
        <div class="card kpi"><div class="label">Itens cadastrados</div><div class="value">${items.length}</div></div>
        <div class="card kpi"><div class="label">Estimativa total</div><div class="value">${brl(total)}</div></div>
      </div>
      <div class="search"><input placeholder="Buscar compra..." oninput="window.filterBuyV19(this.value)"></div>
      <div class="section-title">Itens de compra</div>
      <div class="list" id="buyListV19">
        ${items.length?items.map((p,i)=>`<div class="item buy-v19-row" data-q="${esc(((p.name||'')+' '+(p.source||'')+' '+(p.unit||'')+' '+(p.taskId||'')).toLowerCase())}"><div class="row"><div class="grow"><h3>${esc(p.name||('Item '+(i+1)))}</h3><div class="meta"><span>${esc(p.source||'Sem referência')}</span><span>atividade ${esc(p.taskId||'—')}</span></div></div><div class="money">${brl(Number(p.estimatedCost)||0)}</div></div><div class="meta" style="margin-top:6px"><span>${qty(p.qty,p.unit)}</span></div></div>`).join(''):'<div class="empty">Nenhum item de compra cadastrado.</div>'}
      </div>`;
  }

  window.filterBuyV19=function(q){
    q=String(q||'').toLowerCase();
    document.querySelectorAll('.buy-v19-row').forEach(r=>r.style.display=!q||r.dataset.q.includes(q)?'':'none');
  };

  window.renderBudget=function(tab,month){
    tab=tab||window.__budgetTab||'summary';
    if(tab==='buy'){
      try{ return renderBuy(); }
      catch(e){
        console.error('Compras v19',e);
        const el=document.getElementById('budget');
        if(el) el.innerHTML='<div class="empty">Erro ao abrir Compras v19: '+esc(e.message||e)+'</div>';
        return;
      }
    }
    return previous(tab,month);
  };

  window.__buyOverrideV19=true;
})();