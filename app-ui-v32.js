// v32 - filtros recolhiveis + agrupamento visual por macroetapa no orçamento detalhado
(function(){
  const oldSchedule=window.renderSchedule;
  const oldBudget=window.renderBudget;
  const oldDetailApply=window.detailApplyFiltersV24;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  window.__filterPanelsV32=window.__filterPanelsV32||{schedule:false,detail:false,abc:false};

  const st=document.createElement('style');
  st.textContent=`
    .filter-panel-v32{display:none;margin-bottom:10px}.filter-panel-v32.open{display:block}
    .filter-title-actions-v32{display:flex;align-items:center;gap:7px;margin-left:auto}
    .filter-toggle-v32{border:1px solid var(--line);background:#fff;color:var(--blue);border-radius:9px;padding:6px 9px;font-size:11px;font-weight:750;white-space:nowrap;cursor:pointer}
    .filter-toggle-v32.active{background:#e9eff5}
    .macro-head-v32 td{background:#e9eff5!important;color:var(--blue);font-weight:800;font-size:12px;padding:10px 8px!important;border-top:2px solid #d5dee7;border-bottom:1px solid #d5dee7}
    .macro-head-v32 .macro-total-v32{float:right;font-weight:750;color:var(--text)}
    .detail-v24-row td:nth-child(2) small{display:none}
    @media(max-width:520px){.filter-toggle-v32{padding:6px 8px}.macro-head-v32 td{font-size:11px}}
  `;
  document.head.appendChild(st);

  function titleButton(page,label){
    const root=document.getElementById(page==='schedule'?'schedule':'budget');if(!root)return;
    const title=root.querySelector('.section-title');if(!title)return;
    if(title.querySelector(`[data-filter-toggle="${page}"]`))return;
    const existing=title.querySelector('span');
    const wrap=document.createElement('div');wrap.className='filter-title-actions-v32';
    if(existing){existing.replaceWith(wrap);wrap.appendChild(existing)}else title.appendChild(wrap);
    const b=document.createElement('button');b.className='filter-toggle-v32'+(window.__filterPanelsV32[page]?' active':'');b.dataset.filterToggle=page;b.innerHTML='⌯ Filtros';b.onclick=e=>{e.stopPropagation();toggleFiltersV32(page)};wrap.appendChild(b);
  }

  function findFilterCard(root){
    return [...root.querySelectorAll('.card')].find(c=>c.querySelector('.filter-grid-v24'))||null;
  }
  function decorateFilters(page){
    const root=document.getElementById(page==='schedule'?'schedule':'budget');if(!root)return;
    const card=findFilterCard(root);if(!card)return;
    card.classList.add('filter-panel-v32');card.classList.toggle('open',!!window.__filterPanelsV32[page]);
    titleButton(page);
  }
  window.toggleFiltersV32=function(page){
    window.__filterPanelsV32[page]=!window.__filterPanelsV32[page];
    const root=document.getElementById(page==='schedule'?'schedule':'budget');if(!root)return;
    const card=findFilterCard(root);if(card)card.classList.toggle('open',window.__filterPanelsV32[page]);
    const b=root.querySelector(`[data-filter-toggle="${page}"]`);if(b)b.classList.toggle('active',window.__filterPanelsV32[page]);
  };

  function macroInfo(name,rows){
    const macros=state.macros||[];
    const m=macros.find(x=>String(x.name||'')===String(name||''));
    let code=String(m?.code||'').trim();
    if(!code){const c=rows[0]?.dataset.code||'';code=String(c).split('.')[0]||''}
    code=code.replace(/^0+(?=\d)/,'');
    let label=String(m?.name||name||'Etapa').trim();
    label=label.replace(/^\s*\d{1,2}\s*[-–—·.]?\s*/,'').trim()||String(m?.name||name||'Etapa');
    const total=rows.reduce((s,r)=>s+(Number(r.dataset.total)||0),0);
    return {code,label,total};
  }
  function macroOrder(){const a=state.macros||[];return new Map(a.map((m,i)=>[String(m.name||''),i]))}
  function regroupDetail(){
    const body=document.getElementById('detailBody24');if(!body)return;
    body.querySelectorAll('.macro-head-v32').forEach(x=>x.remove());
    const all=[...body.querySelectorAll('.detail-v24-row')],visible=all.filter(r=>!r.hidden),hidden=all.filter(r=>r.hidden);
    const groups=new Map();visible.forEach(r=>{const k=r.dataset.macro||'Sem etapa';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)});
    const order=macroOrder(),f=window.__detailFilters||{};
    const names=[...groups.keys()].sort((a,b)=>(order.get(a)??999)-(order.get(b)??999)||a.localeCompare(b));
    body.innerHTML='';
    names.forEach(name=>{
      const rows=groups.get(name);
      if(f.sort==='desc')rows.sort((a,b)=>(Number(b.dataset[f.type==='all'?'total':f.type])||0)-(Number(a.dataset[f.type==='all'?'total':f.type])||0));
      else if(f.sort==='asc')rows.sort((a,b)=>(Number(a.dataset[f.type==='all'?'total':f.type])||0)-(Number(b.dataset[f.type==='all'?'total':f.type])||0));
      else rows.sort((a,b)=>String(a.dataset.code).localeCompare(String(b.dataset.code),undefined,{numeric:true}));
      const mi=macroInfo(name,rows),tr=document.createElement('tr');tr.className='macro-head-v32';
      tr.innerHTML=`<td colspan="7">${esc(mi.code?mi.code+' · ':'')}${esc(mi.label)} <span class="macro-total-v32">${brl(mi.total)}</span></td>`;body.appendChild(tr);
      rows.forEach(r=>body.appendChild(r));
    });
    hidden.forEach(r=>body.appendChild(r));
  }

  window.detailApplyFiltersV24=function(){
    const out=oldDetailApply?oldDetailApply.apply(this,arguments):undefined;
    regroupDetail();return out;
  };

  window.renderSchedule=function(){
    const out=oldSchedule.apply(this,arguments);
    setTimeout(()=>{if((window.__scheduleView||'activities')==='activities')decorateFilters('schedule')},0);
    return out;
  };
  window.renderBudget=function(tab,month){
    const active=tab||window.__budgetTab||'summary',out=oldBudget.apply(this,arguments);
    setTimeout(()=>{
      if(active==='detail'){decorateFilters('detail');regroupDetail()}
      else if(active==='abc')decorateFilters('abc');
    },0);
    return out;
  };

  try{
    if((window.__scheduleView||'activities')==='activities')decorateFilters('schedule');
    if(window.__budgetTab==='detail'){decorateFilters('detail');regroupDetail()}
    if(window.__budgetTab==='abc')decorateFilters('abc');
  }catch(e){console.error('UI v32',e)}
  window.__uiV32=true;
})();