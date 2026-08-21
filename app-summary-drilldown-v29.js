// v29 - drill-down do Resumo para o Orçamento Detalhado filtrado por macroetapa
(function(){
  const previous=window.renderBudget;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  const style=document.createElement('style');
  style.textContent=`.budget-summary-stage-v29{cursor:pointer}.budget-summary-stage-v29:hover{background:#f7fafc}.budget-summary-stage-v29 .budget-drill-v29{font-size:10px;color:var(--blue);font-weight:750;margin-top:5px;display:inline-flex}`;
  document.head.appendChild(style);

  window.openBudgetMacroV29=function(macro){
    window.__detailFilters=window.__detailFilters||{q:'',macro:'all',type:'all',status:'all',sort:'code'};
    window.__detailFilters.q='';
    window.__detailFilters.macro=String(macro||'');
    window.__detailFilters.type='all';
    window.__detailFilters.status='all';
    window.__detailFilters.sort='code';
    renderBudget('detail');
    try{window.scrollTo({top:0,behavior:'smooth'})}catch(e){window.scrollTo(0,0)}
  };

  function decorateSummary(){
    const el=document.getElementById('budget');
    if(!el || window.__budgetTab!=='summary')return;
    const items=[...el.querySelectorAll('.list > .item')];
    const macros=state.macros||[];
    items.forEach((item,i)=>{
      const m=macros[i];if(!m||item.dataset.drillV29)return;
      item.dataset.drillV29='1';
      item.classList.add('budget-summary-stage-v29');
      item.setAttribute('role','button');
      item.setAttribute('tabindex','0');
      item.addEventListener('click',()=>window.openBudgetMacroV29(m.name));
      item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.openBudgetMacroV29(m.name)}});
      const grow=item.querySelector('.grow');
      if(grow&&!grow.querySelector('.budget-drill-v29'))grow.insertAdjacentHTML('beforeend',`<span class="budget-drill-v29">ver orçamento detalhado desta etapa ›</span>`);
    });
  }

  window.renderBudget=function(tab,month){
    const active=tab||window.__budgetTab||'summary';
    const out=previous(tab,month);
    if(active==='summary')setTimeout(decorateSummary,0);
    return out;
  };

  try{if((window.__budgetTab||'summary')==='summary')decorateSummary()}catch(e){console.error(e)}
  window.__summaryDrilldownV29=true;
})();
