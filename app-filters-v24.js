// v24 - filtros do cronograma e orçamento + Curva ABC separada Material/Mão de obra
(function(){
  const previousBudget=window.renderBudget;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const norm=v=>String(v??'').toLowerCase();
  const monthKey=d=>String(d||'').slice(0,7);
  const monthLabel=k=>{if(!k)return '—';const [y,m]=k.split('-');return new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric'}).format(new Date(+y,+m-1,1))};

  const style=document.createElement('style');
  style.textContent=`.filter-grid-v24{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.filter-grid-v24 .wide{grid-column:1/-1}.filter-actions-v24{display:flex;gap:7px;align-items:end}.filter-actions-v24 button{width:100%}.abc-switch-v24{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0}.abc-switch-v24 button{border:1px solid var(--line);background:#fff;color:var(--blue);border-radius:10px;padding:10px;font-weight:750}.abc-switch-v24 button.on{background:var(--blue);color:#fff}.filter-count-v24{font-size:11px;color:var(--muted);margin:7px 2px}.abc-v24-row[hidden],.schedule-v24-row[hidden],.detail-v24-row[hidden]{display:none!important}@media(max-width:420px){.filter-grid-v24{grid-template-columns:1fr}}`;
  document.head.appendChild(style);

  // ---------------- CRONOGRAMA ----------------
  window.__scheduleFilters=window.__scheduleFilters||{q:'',phase:'all',status:'all',month:'all'};
  function scheduleMonths(){
    const set=new Set();
    (state.tasks||[]).forEach(t=>{
      const s=monthKey(t.start),f=monthKey(t.finish)||s;if(!s)return;
      const d=new Date(s+'-01T12:00:00'),end=new Date(f+'-01T12:00:00');
      while(d<=end){set.add(d.toISOString().slice(0,7));d.setMonth(d.getMonth()+1)}
    });return [...set].sort();
  }
  window.scheduleApplyFiltersV24=function(){
    const f=window.__scheduleFilters;
    const q=document.getElementById('schQ24');if(q)f.q=q.value;
    const ph=document.getElementById('schPhase24');if(ph)f.phase=ph.value;
    const st=document.getElementById('schStatus24');if(st)f.status=st.value;
    const mo=document.getElementById('schMonth24');if(mo)f.month=mo.value;
    let shown=0;
    document.querySelectorAll('.schedule-v24-row').forEach(r=>{
      const p=+r.dataset.progress||0;
      const statusOk=f.status==='all'||(f.status==='todo'&&p<=0)||(f.status==='doing'&&p>0&&p<1)||(f.status==='done'&&p>=1);
      const monthOk=f.month==='all'||(r.dataset.start<=f.month&&r.dataset.finish>=f.month);
      const ok=(!f.q||r.dataset.q.includes(norm(f.q)))&&(f.phase==='all'||r.dataset.phase===f.phase)&&statusOk&&monthOk;
      r.hidden=!ok;if(ok)shown++;
    });
    const c=document.getElementById('schCount24');if(c)c.textContent=shown+' de '+(state.tasks||[]).length+' atividades';
  };
  window.scheduleClearFiltersV24=function(){window.__scheduleFilters={q:'',phase:'all',status:'all',month:'all'};renderSchedule()};
  window.renderSchedule=function(){
    const tasks=state.tasks||[],f=window.__scheduleFilters;
    const phases=[...new Set(tasks.map(t=>t.phase).filter(Boolean))];
    const months=scheduleMonths();
    schedule.innerHTML=`<div class="section-title">Cronograma <span id="schCount24">${tasks.length} atividades</span></div>
      <div class="card"><div class="filter-grid-v24">
        <div class="wide"><label>Buscar atividade</label><input id="schQ24" value="${esc(f.q)}" placeholder="Nome, etapa ou equipe..." oninput="scheduleApplyFiltersV24()"></div>
        <div><label>Etapa / fase</label><select id="schPhase24" onchange="scheduleApplyFiltersV24()"><option value="all">Todas</option>${phases.map(x=>`<option value="${esc(x)}" ${f.phase===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
        <div><label>Situação</label><select id="schStatus24" onchange="scheduleApplyFiltersV24()"><option value="all" ${f.status==='all'?'selected':''}>Todas</option><option value="todo" ${f.status==='todo'?'selected':''}>Não iniciadas</option><option value="doing" ${f.status==='doing'?'selected':''}>Em andamento</option><option value="done" ${f.status==='done'?'selected':''}>Concluídas</option></select></div>
        <div><label>Mês</label><select id="schMonth24" onchange="scheduleApplyFiltersV24()"><option value="all">Todos</option>${months.map(x=>`<option value="${x}" ${f.month===x?'selected':''}>${monthLabel(x)}</option>`).join('')}</select></div>
        <div class="filter-actions-v24"><button class="btn alt" onclick="scheduleClearFiltersV24()">Limpar filtros</button></div>
      </div></div>
      <div class="list" style="margin-top:10px">${tasks.map(x=>`<div class="item schedule-v24-row" data-q="${esc(norm(x.id+' '+x.name+' '+x.phase+' '+x.resource))}" data-phase="${esc(x.phase||'')}" data-progress="${+x.progress||0}" data-start="${monthKey(x.start)}" data-finish="${monthKey(x.finish)||monthKey(x.start)}" onclick="taskForm(${x.id})"><div class="row"><div class="grow"><h3>${x.id}. ${esc(x.name)}</h3><div class="meta"><span>${esc(x.phase)}</span><span>${date(x.start)} → ${date(x.finish)}</span><span>${esc(x.resource||'')}</span></div></div><span class="badge ${x.progress>=1?'ok':x.progress>0?'warn':''}">${pct(x.progress)}</span></div><div class="progress" style="margin-top:8px"><i style="width:${Math.max(0,Math.min(100,(+x.progress||0)*100))}%"></i></div></div>`).join('')}</div>`;
    scheduleApplyFiltersV24();
  };

  // ---------------- ORÇAMENTO DETALHADO ----------------
  window.__detailFilters=window.__detailFilters||{q:'',macro:'all',type:'all',status:'all',sort:'code'};
  function detailValue(s,type){return +(type==='material'?s.material:type==='labor'?s.labor:type==='equip'?s.equip:type==='others'?s.others:s.total)||0}
  window.detailApplyFiltersV24=function(){
    const f=window.__detailFilters;
    ['Q','Macro','Type','Status','Sort'].forEach(k=>{const e=document.getElementById('det'+k+'24');if(e)f[k.toLowerCase()]=e.value});
    const body=document.getElementById('detailBody24');if(!body)return;
    const rows=[...body.querySelectorAll('.detail-v24-row')];let shown=0;
    rows.forEach(r=>{
      const val=+(r.dataset[f.type]??r.dataset.total)||0;
      const ok=(!f.q||r.dataset.q.includes(norm(f.q)))&&(f.macro==='all'||r.dataset.macro===f.macro)&&(f.type==='all'||val>0)&&(f.status==='all'||(f.status==='value'&&(+r.dataset.total||0)>0)||(f.status==='zero'&&(+r.dataset.total||0)<=0));
      r.hidden=!ok;if(ok)shown++;
    });
    rows.sort((a,b)=>{
      if(f.sort==='desc')return detailRowSortValue(b,f.type)-detailRowSortValue(a,f.type);
      if(f.sort==='asc')return detailRowSortValue(a,f.type)-detailRowSortValue(b,f.type);
      return String(a.dataset.code).localeCompare(String(b.dataset.code),undefined,{numeric:true});
    }).forEach(r=>body.appendChild(r));
    const c=document.getElementById('detCount24');if(c)c.textContent=shown+' de '+(state.services||[]).length+' itens';
  };
  function detailRowSortValue(r,type){return +(r.dataset[type==='all'?'total':type]||0)}
  window.detailClearFiltersV24=function(){window.__detailFilters={q:'',macro:'all',type:'all',status:'all',sort:'code'};renderBudget('detail')};
  function renderDetailV24(){
    const el=document.getElementById('budget'),ss=state.services||[],f=window.__detailFilters;
    const macros=[...new Set(ss.map(s=>s.macro).filter(Boolean))];
    el.innerHTML=`<div class="section-title">Orçamento detalhado <span id="detCount24">${ss.length} itens</span></div>${budgetTabsV24('detail')}
      <div class="card"><div class="filter-grid-v24">
        <div class="wide"><label>Buscar</label><input id="detQ24" value="${esc(f.q)}" placeholder="Código, serviço ou referência..." oninput="detailApplyFiltersV24()"></div>
        <div><label>Macroetapa</label><select id="detMacro24" onchange="detailApplyFiltersV24()"><option value="all">Todas</option>${macros.map(x=>`<option value="${esc(x)}" ${f.macro===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
        <div><label>Componente do custo</label><select id="detType24" onchange="detailApplyFiltersV24()"><option value="all" ${f.type==='all'?'selected':''}>Todos</option><option value="material" ${f.type==='material'?'selected':''}>Material</option><option value="labor" ${f.type==='labor'?'selected':''}>Mão de obra</option><option value="equip" ${f.type==='equip'?'selected':''}>Equipamento</option><option value="others" ${f.type==='others'?'selected':''}>Outros</option></select></div>
        <div><label>Valor</label><select id="detStatus24" onchange="detailApplyFiltersV24()"><option value="all" ${f.status==='all'?'selected':''}>Todos</option><option value="value" ${f.status==='value'?'selected':''}>Com custo</option><option value="zero" ${f.status==='zero'?'selected':''}>Custo zero</option></select></div>
        <div><label>Ordenar</label><select id="detSort24" onchange="detailApplyFiltersV24()"><option value="code" ${f.sort==='code'?'selected':''}>Código</option><option value="desc" ${f.sort==='desc'?'selected':''}>Maior valor</option><option value="asc" ${f.sort==='asc'?'selected':''}>Menor valor</option></select></div>
        <div class="wide"><button class="btn alt" style="width:100%" onclick="detailClearFiltersV24()">Limpar filtros</button></div>
      </div></div>
      <div class="scroll-table" style="margin-top:10px"><table class="detail-table"><thead><tr><th>Código</th><th>Serviço</th><th>Qtd.</th><th>Un.</th><th>Material</th><th>M.O.</th><th>Total</th></tr></thead><tbody id="detailBody24">${ss.map(s=>`<tr class="detail-v24-row" data-code="${esc(s.code)}" data-q="${esc(norm(s.code+' '+s.name+' '+(s.reference||'')+' '+s.macro))}" data-macro="${esc(s.macro||'')}" data-material="${+s.material||0}" data-labor="${+s.labor||0}" data-equip="${+s.equip||0}" data-others="${+s.others||0}" data-total="${+s.total||0}"><td>${esc(s.code)}</td><td><b>${esc(s.name)}</b><br><small>${esc(s.macro||'')}</small></td><td class="num">${Number(s.qty||0).toLocaleString('pt-BR',{maximumFractionDigits:3})}</td><td>${esc(s.unit||'')}</td><td class="num">${brl(s.material)}</td><td class="num">${brl(s.labor)}</td><td class="num"><b>${brl(s.total)}</b></td></tr>`).join('')}</tbody></table></div>`;
    detailApplyFiltersV24();
  }

  // ---------------- CURVA ABC MATERIAL / MÃO DE OBRA ----------------
  window.__abcFilters=window.__abcFilters||{kind:'material',macro:'all',cls:'all',q:''};
  function buildABC(kind){
    const field=kind==='labor'?'labor':'material';
    const a=(state.services||[]).filter(s=>(+s[field]||0)>0).map(s=>({...s,abcValue:+s[field]||0})).sort((x,y)=>y.abcValue-x.abcValue);
    const total=a.reduce((s,x)=>s+x.abcValue,0)||1;let cum=0;
    return a.map((x,i)=>{const share=x.abcValue/total;cum+=share;return {...x,rank:i+1,pct:share,cumPct:cum,class:cum<=.80?'A':cum<=.95?'B':'C'}});
  }
  window.abcSetKindV24=function(kind){window.__abcFilters.kind=kind;renderBudget('abc')};
  window.abcApplyFiltersV24=function(){
    const f=window.__abcFilters;
    const q=document.getElementById('abcQ24');if(q)f.q=q.value;
    const m=document.getElementById('abcMacro24');if(m)f.macro=m.value;
    const c=document.getElementById('abcClass24');if(c)f.cls=c.value;
    let shown=0;
    document.querySelectorAll('.abc-v24-row').forEach(r=>{const ok=(!f.q||r.dataset.q.includes(norm(f.q)))&&(f.macro==='all'||r.dataset.macro===f.macro)&&(f.cls==='all'||r.dataset.cls===f.cls);r.hidden=!ok;if(ok)shown++});
    const e=document.getElementById('abcCount24');if(e)e.textContent=shown+' itens exibidos';
  };
  window.abcClearFiltersV24=function(){const k=window.__abcFilters.kind;window.__abcFilters={kind:k,macro:'all',cls:'all',q:''};renderBudget('abc')};
  function renderABCV24(){
    const el=document.getElementById('budget'),f=window.__abcFilters,a=buildABC(f.kind);
    const macros=[...new Set(a.map(x=>x.macro).filter(Boolean))];
    const total=a.reduce((s,x)=>s+x.abcValue,0),sumClass=cl=>a.filter(x=>x.class===cl).reduce((s,x)=>s+x.abcValue,0);
    const label=f.kind==='labor'?'Mão de obra':'Materiais';
    el.innerHTML=`<div class="section-title">Curva ABC <span>${esc(label)}</span></div>${budgetTabsV24('abc')}
      <div class="abc-switch-v24"><button class="${f.kind==='material'?'on':''}" onclick="abcSetKindV24('material')">Materiais</button><button class="${f.kind==='labor'?'on':''}" onclick="abcSetKindV24('labor')">Mão de obra</button></div>
      <div class="grid"><div class="card kpi"><div class="label">Total ${esc(label.toLowerCase())}</div><div class="value">${brl(total)}</div></div><div class="card kpi"><div class="label">Classe A</div><div class="value">${brl(sumClass('A'))}</div></div><div class="card kpi"><div class="label">Classe B</div><div class="value">${brl(sumClass('B'))}</div></div><div class="card kpi"><div class="label">Classe C</div><div class="value">${brl(sumClass('C'))}</div></div></div>
      <div class="card" style="margin-top:10px"><div class="filter-grid-v24">
        <div class="wide"><label>Buscar</label><input id="abcQ24" value="${esc(f.q)}" placeholder="Código ou serviço..." oninput="abcApplyFiltersV24()"></div>
        <div><label>Macroetapa</label><select id="abcMacro24" onchange="abcApplyFiltersV24()"><option value="all">Todas</option>${macros.map(x=>`<option value="${esc(x)}" ${f.macro===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
        <div><label>Classe</label><select id="abcClass24" onchange="abcApplyFiltersV24()"><option value="all" ${f.cls==='all'?'selected':''}>A + B + C</option><option value="A" ${f.cls==='A'?'selected':''}>Classe A</option><option value="B" ${f.cls==='B'?'selected':''}>Classe B</option><option value="C" ${f.cls==='C'?'selected':''}>Classe C</option></select></div>
        <div class="wide"><button class="btn alt" style="width:100%" onclick="abcClearFiltersV24()">Limpar filtros</button></div>
      </div><div id="abcCount24" class="filter-count-v24"></div></div>
      <div class="list" style="margin-top:10px">${a.map(x=>`<div class="item abc-v24-row" data-q="${esc(norm(x.code+' '+x.name+' '+x.macro))}" data-macro="${esc(x.macro||'')}" data-cls="${x.class}"><div class="row"><div class="grow"><h3>${x.rank}. ${esc(x.code)} · ${esc(x.name)}</h3><div class="meta"><span>${esc(x.macro)}</span><span>${pct(x.pct)} de ${esc(label.toLowerCase())}</span><span>Acum. ${pct(x.cumPct)}</span></div></div><div><div class="money">${brl(x.abcValue)}</div><span class="badge cls${x.class}">${x.class}</span></div></div></div>`).join('')}</div>`;
    abcApplyFiltersV24();
  }

  function budgetTabsV24(a){return `<div class="tabs"><button class="${a==='summary'?'on':''}" onclick="renderBudget('summary')">Resumo</button><button class="${a==='detail'?'on':''}" onclick="renderBudget('detail')">Detalhado</button><button class="${a==='abc'?'on':''}" onclick="renderBudget('abc')">Curva ABC</button><button class="${a==='buy'?'on':''}" onclick="renderBudget('buy')">Compras</button></div>`}

  window.renderBudget=function(tab,month){
    tab=tab||window.__budgetTab||'summary';window.__budgetTab=tab;
    if(tab==='detail')return renderDetailV24();
    if(tab==='abc')return renderABCV24();
    return previousBudget(tab,month);
  };

  window.__filtersV24=true;
})();
