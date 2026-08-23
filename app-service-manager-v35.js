// v40 - inclusao, retirada e reativacao de servicos com codigo automatico por macroetapa
(function(){
  if(window.__serviceManagerV35)return;
  const previousBudget=window.renderBudget;
  const previousOpen=window.openBudgetEditV28;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const n=v=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:0};
  const style=document.createElement('style');
  style.textContent=`.budget-tools-v35{display:flex;gap:7px;justify-content:flex-end;flex-wrap:wrap;margin:8px 0}.removed-v35{opacity:.72}.service-danger-v35{margin-top:12px;border-top:1px solid var(--line);padding-top:12px}.service-form-grid-v35{display:grid;grid-template-columns:1fr 1fr;gap:8px}.service-form-grid-v35 .wide{grid-column:1/-1}.auto-code-v40{background:#f4f7fa!important;color:var(--blue);font-weight:800}.auto-code-note-v40{font-size:10px;color:var(--muted);margin-top:3px}@media(max-width:480px){.service-form-grid-v35{grid-template-columns:1fr}}`;
  document.head.appendChild(style);

  function allStored(){
    const base=window.__FULL_SEED?.services||[];
    const added=Array.isArray(state.addedServices)?state.addedServices:[];
    const map=new Map();[...base,...added].forEach(s=>map.set(String(s.code||''),s));return map;
  }
  function active(code){return (state.services||[]).find(s=>String(s.code||'')===String(code))}
  function removedCodes(){const ov=state.budgetOverrides||{},all=allStored();return [...all.keys()].filter(c=>ov[c]&&Number(ov[c].qty)===0)}
  function macroOptions(){return (state.macros||[]).map(m=>`<option value="${esc(m.name||'')}">${esc((m.code?m.code+' · ':'')+(m.name||''))}</option>`).join('')}
  function taskOptions(){return `<option value="">Sem vínculo com cronograma</option>${(state.tasks||[]).map(t=>`<option value="${esc(t.id)}">${esc(t.id+' · '+t.name)}</option>`).join('')}`}

  function macroPrefix(macroName){
    const macro=(state.macros||[]).find(m=>String(m.name||'')===String(macroName||''));
    const raw=String(macro?.code||'').match(/\d+/)?.[0];
    if(raw)return String(Number(raw)).padStart(2,'0');
    const prefixes=[];
    for(const s of allStored().values())if(String(s.macro||'')===String(macroName||'')){
      const m=String(s.code||'').match(/^(\d{1,2})\./);if(m)prefixes.push(String(Number(m[1])).padStart(2,'0'));
    }
    if(prefixes.length){const count={};prefixes.forEach(x=>count[x]=(count[x]||0)+1);return Object.keys(count).sort((a,b)=>count[b]-count[a]||Number(a)-Number(b))[0]}
    const idx=(state.macros||[]).findIndex(m=>String(m.name||'')===String(macroName||''));
    return String(Math.max(1,idx+1)).padStart(2,'0');
  }
  function nextServiceCode(macroName){
    const prefix=macroPrefix(macroName),used=new Set(),all=allStored();
    for(const [code,s] of all){if(String(s.macro||'')!==String(macroName||''))continue;const m=String(code).match(/^(\d{1,2})\.(\d{1,3})$/);if(m&&String(Number(m[1])).padStart(2,'0')===prefix)used.add(Number(m[2]))}
    let seq=1;while(used.has(seq))seq++;
    return prefix+'.'+String(seq).padStart(seq>=100?3:2,'0');
  }
  window.refreshAutoServiceCodeV40=function(){const macro=document.getElementById('asMacro35')?.value||'',e=document.getElementById('asCode35');if(e)e.value=nextServiceCode(macro)};
  window.nextServiceCodeV40=nextServiceCode;

  window.openAddServiceV35=function(){
    const macros=state.macros||[],first=macros[0]?.name||'',initialCode=nextServiceCode(first);
    openModal(`<h2>Adicionar serviço</h2><div class="meta"><span>O código interno é criado automaticamente conforme a macroetapa.</span></div><div class="service-form-grid-v35"><div><label>Código do orçamento</label><input id="asCode35" class="auto-code-v40" value="${esc(initialCode)}" readonly><div class="auto-code-note-v40">Gerado automaticamente</div></div><div><label>Unidade</label><input id="asUnit35" placeholder="un, m², m³, kg..."></div><div class="wide"><label>Nome do serviço</label><input id="asName35" placeholder="Descrição do serviço"></div><div class="wide"><label>Macroetapa</label><select id="asMacro35" onchange="refreshAutoServiceCodeV40()">${macroOptions()}</select></div><div class="wide"><label>Atividade do cronograma</label><select id="asTask35">${taskOptions()}</select></div><div><label>Quantidade</label><input id="asQty35" type="number" min="0" step="any" value="1"></div><div><label>Material unitário</label><input id="asMat35" type="number" min="0" step="0.01" value="0"></div><div><label>Mão de obra unitária</label><input id="asLab35" type="number" min="0" step="0.01" value="0"></div><div><label>Equip./Outros unitário</label><input id="asEO35" type="number" min="0" step="0.01" value="0"></div><div class="wide"><label>Código SINAPI / referência (opcional)</label><input id="asRef35" placeholder="Ex.: 96526"></div></div><div class="actions"><button class="btn alt" onclick="closeModal()">Cancelar</button><button class="btn" onclick="saveAddServiceV35()">Adicionar</button></div>`);
    refreshAutoServiceCodeV40();
  };

  window.saveAddServiceV35=async function(){
    const name=String(document.getElementById('asName35')?.value||'').trim(),unit=String(document.getElementById('asUnit35')?.value||'').trim(),macro=String(document.getElementById('asMacro35')?.value||'').trim(),taskRaw=document.getElementById('asTask35')?.value||'',reference=String(document.getElementById('asRef35')?.value||'').trim();
    const code=nextServiceCode(macro);
    const qty=n(document.getElementById('asQty35')?.value),materialUnit=n(document.getElementById('asMat35')?.value),laborUnit=n(document.getElementById('asLab35')?.value),eo=n(document.getElementById('asEO35')?.value);
    if(!name||!unit||!macro){alert('Informe nome, unidade e macroetapa.');return}
    if(qty<0||materialUnit<0||laborUnit<0||eo<0){alert('Quantidade e valores não podem ser negativos.');return}
    if(allStored().has(code)){alert('Não foi possível gerar um código livre. Tente novamente.');return}
    state.addedServices=Array.isArray(state.addedServices)?state.addedServices:[];
    state.addedServices.push({code,name,macro,unit,qty,taskId:taskRaw?Number(taskRaw):null,materialUnit,laborUnit,equipUnit:0,otherUnit:eo,unitCost:materialUnit+laborUnit+eo,material:qty*materialUnit,labor:qty*laborUnit,equipment:0,others:qty*eo,total:qty*(materialUnit+laborUnit+eo),reference,source:reference?'SINAPI / referência informada pelo usuário':'Serviço adicionado no aplicativo',priceStatus:'Adicionado',addedByUser:true});
    closeModal();await save();
    try{if(typeof renderAll==='function')renderAll()}catch(e){console.error('Atualização geral v40',e)}
    renderBudget('detail');
  };

  window.removeServiceV35=async function(code){
    const s=active(code);if(!s)return;
    if(!confirm('Retirar “'+s.name+'” do orçamento?\n\nO item ficará salvo e poderá ser reativado depois.'))return;
    state.budgetOverrides=state.budgetOverrides&&typeof state.budgetOverrides==='object'?state.budgetOverrides:{};
    state.budgetOverrides[String(code)]={...(state.budgetOverrides[String(code)]||{}),name:s.name,qty:0,materialUnit:Number(s.materialUnit)||0,laborUnit:Number(s.laborUnit)||0,eoUnit:(Number(s.equipUnit)||0)+(Number(s.otherUnit)||0)};
    closeModal();await save();try{if(typeof renderAll==='function')renderAll()}catch(e){}renderBudget('detail');
  };

  window.openRemovedServicesV35=function(){
    const codes=removedCodes(),all=allStored(),ov=state.budgetOverrides||{};
    openModal(`<h2>Serviços retirados</h2><div class="list">${codes.length?codes.map(c=>{const s=all.get(c),o=ov[c]||{};return `<div class="item removed-v35"><div class="row"><div class="grow"><h3>${esc(c)} · ${esc(o.name||s?.name||'Serviço')}</h3><div class="meta"><span>${esc(s?.macro||'')}</span><span>${esc(s?.unit||'')}</span></div></div><button class="btn alt" onclick="reactivateServiceV35('${esc(c)}')">Reativar</button></div></div>`}).join(''):'<div class="empty">Nenhum serviço retirado.</div>'}</div><div class="actions"><button class="btn alt" onclick="closeModal()">Fechar</button></div>`);
  };

  window.reactivateServiceV35=async function(code){
    const all=allStored(),s=all.get(String(code)),o=state.budgetOverrides?.[String(code)];if(!s||!o)return;
    o.qty=Number(s.qty)||1;closeModal();await save();try{if(typeof renderAll==='function')renderAll()}catch(e){}renderBudget('detail');
  };

  window.openBudgetEditV28=function(code){
    previousOpen(code);const s=active(code),sheet=document.getElementById('sheet');if(!s||!sheet)return;
    const actions=sheet.querySelector('.actions');if(!actions)return;
    const d=document.createElement('div');d.className='service-danger-v35';d.innerHTML=`<button class="btn danger" style="width:100%" onclick="removeServiceV35('${esc(String(code))}')">Retirar serviço do orçamento</button><div class="meta" style="margin-top:6px"><span>O serviço não será apagado; ficará disponível para reativação.</span></div>`;actions.parentNode.insertBefore(d,actions);
  };

  function decorateTools(){
    const el=document.getElementById('budget');if(!el||window.__budgetTab!=='detail'||el.querySelector('.budget-tools-v35'))return;
    const tabs=el.querySelector('.tabs'),tools=document.createElement('div');tools.className='budget-tools-v35';tools.innerHTML=`<button class="btn alt" onclick="openRemovedServicesV35()">Serviços retirados (${removedCodes().length})</button><button class="btn" onclick="openAddServiceV35()">＋ Adicionar serviço</button>`;
    if(tabs)tabs.insertAdjacentElement('afterend',tools);else el.prepend(tools);
  }
  window.renderBudget=function(tab,month){const active=tab||window.__budgetTab||'summary',out=previousBudget(tab,month);if(active==='detail')setTimeout(decorateTools,0);return out};
  try{decorateTools()}catch(e){console.error(e)}
  window.__serviceManagerV35=true;
})();