// v28 - edicao direta dos itens do orcamento detalhado
(function(){
  const previous=window.renderBudget;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const n=v=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:0};

  const style=document.createElement('style');
  style.textContent=`.detail-v24-row{cursor:pointer}.detail-v24-row:hover{background:#f7fafc}.budget-edit-hint-v28{display:inline-flex;margin-top:5px;font-size:10px;color:var(--blue);font-weight:750}.budget-edit-summary-v28{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.budget-edit-summary-v28 .mini{background:#f5f8fa;border-radius:10px;padding:10px}.budget-edit-summary-v28 small{display:block;color:var(--muted);font-size:10px}.budget-edit-summary-v28 b{font-size:15px}`;
  document.head.appendChild(style);

  function currentService(code){return (state.services||[]).find(s=>String(s.code||'')===String(code))}
  function decorate(){
    document.querySelectorAll('.detail-v24-row').forEach(r=>{
      const code=r.dataset.code;if(!code||r.dataset.editV28)return;
      r.dataset.editV28='1';r.setAttribute('role','button');r.setAttribute('tabindex','0');
      r.addEventListener('click',()=>window.openBudgetEditV28(code));
      r.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.openBudgetEditV28(code)}});
      const td=r.children[1];if(td&&!td.querySelector('.budget-edit-hint-v28'))td.insertAdjacentHTML('beforeend','<br><span class="budget-edit-hint-v28">✎ editar item</span>');
    });
  }

  window.budgetEditCalcV28=function(){
    const q=n(document.getElementById('beQty28')?.value),m=n(document.getElementById('beMat28')?.value),l=n(document.getElementById('beLab28')?.value),eo=n(document.getElementById('beEO28')?.value);
    const unit=m+l+eo,total=q*unit;
    const u=document.getElementById('beUnitTotal28'),t=document.getElementById('beTotal28');
    if(u)u.textContent=brl(unit);if(t)t.textContent=brl(total);
  };

  window.openBudgetEditV28=function(code){
    const s=currentService(code);if(!s)return;
    const eo=(Number(s.equipUnit)||0)+(Number(s.otherUnit)||0);
    openModal(`<h2>Editar item do orçamento</h2>
      <div class="meta"><span>${esc(s.code)}</span><span>${esc(s.macro||'')}</span><span>${esc(s.unit||'')}</span></div>
      <label>Nome do serviço</label><input id="beName28" value="${esc(s.name||'')}">
      <label>Quantidade</label><input id="beQty28" type="number" min="0" step="any" value="${Number(s.qty)||0}" oninput="budgetEditCalcV28()">
      <label>Material unitário</label><input id="beMat28" type="number" min="0" step="0.01" value="${Number(s.materialUnit)||0}" oninput="budgetEditCalcV28()">
      <label>Mão de obra unitária</label><input id="beLab28" type="number" min="0" step="0.01" value="${Number(s.laborUnit)||0}" oninput="budgetEditCalcV28()">
      <label>Equipamentos / outros unitário</label><input id="beEO28" type="number" min="0" step="0.01" value="${eo}" oninput="budgetEditCalcV28()">
      <div class="budget-edit-summary-v28"><div class="mini"><small>Preço unitário total</small><b id="beUnitTotal28">${brl((Number(s.materialUnit)||0)+(Number(s.laborUnit)||0)+eo)}</b></div><div class="mini"><small>Total do serviço</small><b id="beTotal28">${brl(Number(s.total)||0)}</b></div></div>
      <div class="meta" style="margin-top:10px"><span>Quantidade zero desativa o item no aplicativo.</span><span>As alterações também serão usadas na próxima exportação do Excel.</span></div>
      <div class="actions"><button class="btn alt" onclick="closeModal()">Cancelar</button><button class="btn" onclick="saveBudgetEditV28('${esc(String(s.code))}')">Salvar</button></div>`);
  };

  window.saveBudgetEditV28=async function(code){
    const s=currentService(code);if(!s)return;
    const name=String(document.getElementById('beName28')?.value||'').trim();
    const qty=n(document.getElementById('beQty28')?.value),materialUnit=n(document.getElementById('beMat28')?.value),laborUnit=n(document.getElementById('beLab28')?.value),eoUnit=n(document.getElementById('beEO28')?.value);
    if(!name){alert('Informe o nome do serviço.');return}
    if(qty<0||materialUnit<0||laborUnit<0||eoUnit<0){alert('Quantidade e preços não podem ser negativos.');return}
    state.budgetOverrides=state.budgetOverrides&&typeof state.budgetOverrides==='object'?state.budgetOverrides:{};
    state.budgetOverrides[String(code)]={...(state.budgetOverrides[String(code)]||{}),name,qty,materialUnit,laborUnit,eoUnit};
    state.budgetEditMeta={code:String(code),at:new Date().toISOString()};
    closeModal();
    try{await save()}catch(e){console.error(e);alert('A alteração foi salva localmente, mas houve erro na sincronização.')}
  };

  window.renderBudget=function(tab,month){
    const active=tab||window.__budgetTab||'summary';
    const out=previous(tab,month);
    if(active==='detail')setTimeout(decorate,0);
    return out;
  };
  try{if((window.__budgetTab||'')==='detail')decorate()}catch(e){console.error(e)}
  window.__budgetEditV28=true;
})();