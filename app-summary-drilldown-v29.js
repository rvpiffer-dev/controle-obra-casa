// v40 - drill-down + gestão + físico-financeiro + UI + composições + exportação + serviços + SINAPI + cronograma + código automático
(function(){
  const previous=window.renderBudget;
  const style=document.createElement('style');style.textContent=`.budget-summary-stage-v29{cursor:pointer}.budget-summary-stage-v29:hover{background:#f7fafc}.budget-summary-stage-v29 .budget-drill-v29{font-size:10px;color:var(--blue);font-weight:750;margin-top:5px;display:inline-flex}`;document.head.appendChild(style);
  window.openBudgetMacroV29=function(macro){window.__detailFilters=window.__detailFilters||{q:'',macro:'all',type:'all',status:'all',sort:'code'};window.__detailFilters.q='';window.__detailFilters.macro=String(macro||'');window.__detailFilters.type='all';window.__detailFilters.status='all';window.__detailFilters.sort='code';renderBudget('detail');try{window.scrollTo({top:0,behavior:'smooth'})}catch(e){window.scrollTo(0,0)}};
  function decorateSummary(){const el=document.getElementById('budget');if(!el||window.__budgetTab!=='summary')return;const items=[...el.querySelectorAll('.list > .item')],macros=state.macros||[];items.forEach((item,i)=>{const m=macros[i];if(!m||item.dataset.drillV29)return;item.dataset.drillV29='1';item.classList.add('budget-summary-stage-v29');item.setAttribute('role','button');item.setAttribute('tabindex','0');item.addEventListener('click',()=>window.openBudgetMacroV29(m.name));item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.openBudgetMacroV29(m.name)}});const grow=item.querySelector('.grow');if(grow&&!grow.querySelector('.budget-drill-v29'))grow.insertAdjacentHTML('beforeend','<span class="budget-drill-v29">ver orçamento detalhado desta etapa ›</span>')})}
  window.renderBudget=function(tab,month){const active=tab||window.__budgetTab||'summary';const out=previous(tab,month);if(active==='summary')setTimeout(decorateSummary,0);return out};try{if((window.__budgetTab||'summary')==='summary')decorateSummary()}catch(e){console.error(e)}window.__summaryDrilldownV29=true;
  function load(src,flag,msg,onload){if(window[flag]){if(onload)onload();return}const s=document.createElement('script');s.src=src;s.onload=()=>{if(onload)onload()};s.onerror=()=>console.error(msg);document.head.appendChild(s)}
  load('app-management-v30.js?v=40','__managementV30','Falha ao carregar painel de gestão');
  load('app-physical-financial-v31.js?v=40','__physicalFinancialV31','Falha ao carregar físico-financeiro');
  load('app-ui-v32.js?v=40','__uiV32','Falha ao carregar UI');
  load('app-compositions-v33.js?v=40','__compositionsV33','Falha ao carregar composições');
  load('app-budget-export-v34.js?v=40','__budgetExportV34','Falha ao carregar exportação');
  load('app-service-manager-v35.js?v=40','__serviceManagerV35','Falha ao carregar gerenciador de serviços');
  load('app-detail-composition-v37.js?v=40','__detailCompositionV37','Falha ao carregar composição na lista');
  load('app-sinapi-v38.js?v=40','__sinapiV38','Falha ao carregar busca SINAPI',()=>load('app-schedule-service-v39.js?v=40','__scheduleServiceV39','Falha ao carregar integração cronograma v39'));
})();