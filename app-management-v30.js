// v30 - painel de gestão: fluxo de caixa, orçado x realizado e alertas de compras
(function(){
  const oldRenderHome=window.renderHome;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const mk=d=>String(d||'').slice(0,7);
  const dparse=s=>s?new Date(String(s).slice(0,10)+'T12:00:00'):null;
  const day=86400000;
  const money=brl;
  window.__managementTab=window.__managementTab||'cash';

  const style=document.createElement('style');
  style.textContent=`.mg-tabs-v30{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0}.mg-tabs-v30 button{border:1px solid var(--line);background:#fff;color:var(--blue);border-radius:10px;padding:10px 6px;font-weight:750;font-size:12px}.mg-tabs-v30 button.on{background:var(--blue);color:#fff}.mg-table-v30{width:100%;border-collapse:collapse;font-size:11px}.mg-table-v30 th,.mg-table-v30 td{padding:7px 6px;border-bottom:1px solid var(--line);vertical-align:top}.mg-table-v30 th{color:var(--muted);font-size:10px;text-align:left}.mg-table-v30 td.num{text-align:right;white-space:nowrap}.mg-alert-v30{border-left:4px solid var(--line)}.mg-alert-v30.urgent{border-left-color:var(--red)}.mg-alert-v30.warn{border-left-color:var(--orange)}.mg-alert-v30.ok{border-left-color:var(--green)}@media(max-width:520px){.mg-tabs-v30{grid-template-columns:1fr}.mg-hide-mobile-v30{display:none}}`;
  document.head.appendChild(style);

  function mgStore(){
    state.purchasePlan=state.purchasePlan&&typeof state.purchasePlan==='object'?state.purchasePlan:{};
    state.purchasePlan.__managementSettings=state.purchasePlan.__managementSettings||{initialCash:0,plsBase:0,purchaseLeadDays:14};
    return state.purchasePlan.__managementSettings;
  }
  function monthLabel(k){if(!k)return '—';const [y,m]=k.split('-').map(Number);return new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric'}).format(new Date(y,m-1,1))}
  function monthRange(){
    const months=new Set();
    (state.tasks||[]).forEach(t=>{const s=mk(t.start),f=mk(t.finish)||s;if(!s)return;let d=new Date(s+'-01T12:00:00'),e=new Date(f+'-01T12:00:00');while(d<=e){months.add(d.toISOString().slice(0,7));d.setMonth(d.getMonth()+1)}});
    (state.pls||[]).forEach(p=>{if(mk(p.date))months.add(mk(p.date))});
    (state.costs||[]).forEach(c=>{if(mk(c.date))months.add(mk(c.date))});
    return [...months].sort();
  }
  function overlapDays(a1,a2,b1,b2){const s=Math.max(a1.getTime(),b1.getTime()),e=Math.min(a2.getTime(),b2.getTime());return e<s?0:Math.floor((e-s)/day)+1}
  function plannedByMonth(){
    const out={};
    (state.tasks||[]).forEach(t=>{
      const s=dparse(t.start),f=dparse(t.finish||t.start);if(!s||!f)return;
      const totalDays=Math.max(1,overlapDays(s,f,s,f));
      let cur=new Date(s.getFullYear(),s.getMonth(),1,12);
      const end=new Date(f.getFullYear(),f.getMonth(),1,12);
      while(cur<=end){const ms=cur.toISOString().slice(0,7),me=new Date(cur.getFullYear(),cur.getMonth()+1,0,12);const od=overlapDays(s,f,cur,me);out[ms]=(out[ms]||0)+(Number(t.plannedCost)||0)*(od/totalDays);cur.setMonth(cur.getMonth()+1)}
    });
    return out;
  }
  function paidByMonth(){const out={};(state.costs||[]).forEach(c=>{const k=mk(c.date);if(k)out[k]=(out[k]||0)+(Number(c.paid)||0)});return out}
  function plsByMonth(realizedOnly=false){const out={},base=Number(mgStore().plsBase)||0;(state.pls||[]).forEach(p=>{const k=mk(p.date);if(!k)return;if(realizedOnly&&p.status!=='Liberada')return;out[k]=(out[k]||0)+base*(Number(p.stagePct)||0)});return out}

  function renderCash(){
    const s=mgStore(),months=monthRange(),planned=plannedByMonth(),paid=paidByMonth(),inExp=plsByMonth(false),inReal=plsByMonth(true);
    let proj=Number(s.initialCash)||0,real=Number(s.initialCash)||0,minProj=proj;
    const rows=months.map(k=>{proj+=(inExp[k]||0)-(planned[k]||0);real+=(inReal[k]||0)-(paid[k]||0);minProj=Math.min(minProj,proj);return{k,planned:planned[k]||0,paid:paid[k]||0,inExp:inExp[k]||0,inReal:inReal[k]||0,proj,real}});
    const plannedTotal=rows.reduce((a,x)=>a+x.planned,0),paidTotal=rows.reduce((a,x)=>a+x.paid,0),plsTotal=rows.reduce((a,x)=>a+x.inExp,0);
    return `<div class="grid"><div class="card kpi"><div class="label">Saídas planejadas</div><div class="value">${money(plannedTotal)}</div></div><div class="card kpi"><div class="label">Pago até agora</div><div class="value">${money(paidTotal)}</div></div><div class="card kpi"><div class="label">Entradas PLS previstas</div><div class="value">${money(plsTotal)}</div></div><div class="card kpi"><div class="label">Menor saldo projetado</div><div class="value">${money(minProj)}</div></div></div>
      ${!s.plsBase?'<div class="item" style="margin-top:10px"><b>Configure a base financeira da construção</b><div class="meta"><span>Enquanto esse valor estiver zerado, as liberações PLS não entram no fluxo.</span></div><button class="btn alt" style="margin-top:8px" onclick="openManagementSettingsV30()">Configurar caixa</button></div>':''}
      <div class="scroll-table" style="margin-top:10px"><table class="mg-table-v30" style="min-width:720px"><thead><tr><th>Mês</th><th>Saída planejada</th><th>Pago</th><th>PLS prevista</th><th>PLS liberada</th><th>Saldo projetado</th><th>Saldo realizado</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${monthLabel(r.k)}</b></td><td class="num">${money(r.planned)}</td><td class="num">${money(r.paid)}</td><td class="num">${money(r.inExp)}</td><td class="num">${money(r.inReal)}</td><td class="num"><b>${money(r.proj)}</b></td><td class="num">${money(r.real)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function renderVariance(){
    const costs=state.costs||[],macros=state.macros||[];
    const rows=macros.map(m=>{const rel=costs.filter(c=>String(c.macro||'')===String(m.code||'')||String(c.macro||'')===String(m.name||''));const launched=rel.reduce((a,c)=>a+(Number(c.amount)||0),0),paid=rel.reduce((a,c)=>a+(Number(c.paid)||0),0),budget=Number(m.total)||0;return{name:m.name,code:m.code,budget,launched,paid,balance:budget-launched,pct:budget?launched/budget:0}});
    const known=new Set(macros.flatMap(m=>[String(m.code||''),String(m.name||'')]));
    const unclassified=costs.filter(c=>!known.has(String(c.macro||''))).reduce((a,c)=>a+(Number(c.amount)||0),0);
    const budget=rows.reduce((a,r)=>a+r.budget,0),launched=rows.reduce((a,r)=>a+r.launched,0),paid=rows.reduce((a,r)=>a+r.paid,0);
    return `<div class="grid"><div class="card kpi"><div class="label">Orçado</div><div class="value">${money(budget)}</div></div><div class="card kpi"><div class="label">Contratado / lançado</div><div class="value">${money(launched)}</div></div><div class="card kpi"><div class="label">Pago</div><div class="value">${money(paid)}</div></div><div class="card kpi"><div class="label">Saldo não comprometido</div><div class="value">${money(budget-launched)}</div></div></div>
      ${unclassified?`<div class="item" style="margin-top:10px"><span class="badge warn">Atenção</span><div style="margin-top:6px"><b>${money(unclassified)} em custos sem macroetapa reconhecida</b></div></div>`:''}
      <div class="scroll-table" style="margin-top:10px"><table class="mg-table-v30" style="min-width:760px"><thead><tr><th>Etapa</th><th>Orçado</th><th>Lançado</th><th>Pago</th><th>Saldo</th><th>% comprometido</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.name)}</b></td><td class="num">${money(r.budget)}</td><td class="num">${money(r.launched)}</td><td class="num">${money(r.paid)}</td><td class="num">${money(r.balance)}</td><td class="num">${(r.pct*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}%</td></tr>`).join('')}</tbody></table></div>`;
  }

  function alertRows(){
    const s=mgStore(),lead=Math.max(0,Number(s.purchaseLeadDays)||14),today=new Date();today.setHours(12,0,0,0);const limit=new Date(today);limit.setDate(limit.getDate()+45);
    const seen=new Set(),rows=[];
    (state.purchases||[]).forEach(p=>{
      const t=(state.tasks||[]).find(x=>String(x.id)===String(p.taskId));if(!t||!t.start)return;
      const month=mk(t.start);let meta={status:'A comprar',deadline:''};try{if(typeof purchaseMeta==='function')meta=purchaseMeta(month,p)||meta}catch(e){}
      if(['Entregue','Pago'].includes(meta.status))return;
      let due=meta.deadline?dparse(meta.deadline):dparse(t.start);if(!due)return;if(!meta.deadline)due.setDate(due.getDate()-lead);
      const key=[p.name,p.unit,p.taskId].join('|');if(seen.has(key))return;seen.add(key);
      const diff=Math.ceil((due-today)/day);if(due>limit)return;
      const cls=diff<0?'urgent':diff<=7?'urgent':diff<=21?'warn':'ok';
      rows.push({name:p.name,unit:p.unit,qty:Number(p.qty)||0,cost:Number(p.estimatedCost)||0,status:meta.status||'A comprar',due,diff,task:t,cls});
    });
    return rows.sort((a,b)=>a.due-b.due);
  }
  function renderAlerts(){
    const rows=alertRows(),urgent=rows.filter(x=>x.diff<=7).length,overdue=rows.filter(x=>x.diff<0).length,total=rows.reduce((a,x)=>a+x.cost,0);
    return `<div class="grid"><div class="card kpi"><div class="label">Alertas próximos 45 dias</div><div class="value">${rows.length}</div></div><div class="card kpi"><div class="label">Urgentes / até 7 dias</div><div class="value">${urgent}</div></div><div class="card kpi"><div class="label">Atrasados</div><div class="value">${overdue}</div></div><div class="card kpi"><div class="label">Valor estimado</div><div class="value">${money(total)}</div></div></div>
      <div class="list" style="margin-top:10px">${rows.length?rows.slice(0,20).map(x=>`<div class="item mg-alert-v30 ${x.cls}"><div class="row"><div class="grow"><h3>${esc(x.name)}</h3><div class="meta"><span>${esc(x.task.name)}</span><span>${x.status}</span><span>usar em ${date(x.task.start)}</span></div></div><div class="money">${money(x.cost)}</div></div><div class="meta" style="margin-top:7px"><span><b>${x.diff<0?'Atrasado '+Math.abs(x.diff)+' dias':x.diff===0?'Comprar hoje':'Comprar em '+x.diff+' dias'}</b></span><span>${x.qty.toLocaleString('pt-BR',{maximumFractionDigits:3})} ${esc(x.unit||'')}</span></div></div>`).join(''):'<div class="empty">Nenhuma compra pendente nos próximos 45 dias.</div>'}</div>`;
  }

  window.setManagementTabV30=function(tab){window.__managementTab=tab;renderHome()};
  window.openManagementSettingsV30=function(){const s=mgStore();openModal(`<h2>Configurar fluxo de caixa</h2><label>Saldo inicial disponível para a obra</label><input id="mgInitial30" type="number" step="0.01" value="${Number(s.initialCash)||0}"><label>Base financeira para liberações PLS</label><input id="mgPLS30" type="number" step="0.01" value="${Number(s.plsBase)||0}"><label>Antecedência padrão para compras (dias)</label><input id="mgLead30" type="number" min="0" step="1" value="${Number(s.purchaseLeadDays)||14}"><div class="meta" style="margin-top:8px"><span>A base PLS é multiplicada pelo percentual de cada etapa para prever as entradas.</span></div><div class="actions"><button class="btn alt" onclick="closeModal()">Cancelar</button><button class="btn" onclick="saveManagementSettingsV30()">Salvar</button></div>`)};
  window.saveManagementSettingsV30=async function(){const s=mgStore();s.initialCash=Number(document.getElementById('mgInitial30')?.value)||0;s.plsBase=Number(document.getElementById('mgPLS30')?.value)||0;s.purchaseLeadDays=Math.max(0,Number(document.getElementById('mgLead30')?.value)||14);closeModal();await save()};

  window.renderHome=function(){
    oldRenderHome();
    const el=document.getElementById('home');if(!el)return;
    const tab=window.__managementTab||'cash';
    el.insertAdjacentHTML('beforeend',`<div class="section-title">Painel de gestão <button class="btn alt" style="padding:7px 10px;font-size:11px" onclick="openManagementSettingsV30()">Configurar</button></div><div class="mg-tabs-v30"><button class="${tab==='cash'?'on':''}" onclick="setManagementTabV30('cash')">Fluxo de caixa</button><button class="${tab==='variance'?'on':''}" onclick="setManagementTabV30('variance')">Orçado x realizado</button><button class="${tab==='alerts'?'on':''}" onclick="setManagementTabV30('alerts')">Alertas de compras</button></div><div id="managementBodyV30">${tab==='variance'?renderVariance():tab==='alerts'?renderAlerts():renderCash()}</div>`);
  };
  try{renderHome()}catch(e){console.error('Painel gestão v30',e)}
  window.__managementV30=true;
})();