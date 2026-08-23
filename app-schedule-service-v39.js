// v39 - inserir novos serviços no cronograma, escolher posição e sugerir duração SINAPI
(function(){
  if(window.__scheduleServiceV39)return;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0};
  const DAY_HOURS=8;
  let readyTimer=null;

  function laborCoeff(item){
    const type=String(item?.resourceType||item?.itemType||item?.type||'').toUpperCase();
    const isLabor=type.includes('LABOR')||type.includes('MAO')||type.includes('MÃO')||type.includes('M.O')||type.includes('SERVICO DE MAO');
    if(!isLabor)return 0;
    for(const k of ['coefficient','coefficientValue','consumption','quantity','qty','amount']){
      const v=Number(item?.[k]);if(Number.isFinite(v)&&v>0)return v;
    }
    return 0;
  }
  function durationFromSinapi(service,qty){
    const items=Array.isArray(service?.sinapiItems)?service.sinapiItems:[];
    const coeffs=items.map(laborCoeff).filter(v=>v>0);
    if(!coeffs.length)return {available:false,hours:0,days:0};
    // Para uma equipe de referência, a maior carga individual de mão de obra governa a duração.
    // Isso evita somar horas de profissionais que trabalham simultaneamente.
    const hoursPerUnit=Math.max(...coeffs),hours=hoursPerUnit*Math.max(0,num(qty));
    return {available:hours>0,hours,days:hours>0?Math.max(0.5,Math.ceil((hours/DAY_HOURS)*2)/2):0,hoursPerUnit};
  }
  function addBusinessDays(dateStr,days){
    const d=new Date(String(dateStr)+'T12:00:00');let remain=Math.max(0,Number(days)||0);
    if(remain<=0)return d.toISOString().slice(0,10);
    // duração de 0,5 dia permanece na mesma data; >=1 consome dias úteis.
    const whole=Math.max(1,Math.ceil(remain));let used=1;
    while(used<whole){d.setDate(d.getDate()+1);const wd=d.getDay();if(wd!==0&&wd!==6)used++}
    return d.toISOString().slice(0,10);
  }
  function nextBusinessDay(dateStr){const d=new Date(String(dateStr)+'T12:00:00');do{d.setDate(d.getDate()+1)}while(d.getDay()===0||d.getDay()===6);return d.toISOString().slice(0,10)}
  function taskOptions(){return (state.tasks||[]).map(t=>`<option value="${esc(t.id)}">${esc(t.id+' · '+t.name)}</option>`).join('')}
  function decorateForm(){
    const sheet=document.getElementById('sheet'),grid=sheet?.querySelector('.service-form-grid-v35');if(!grid||grid.querySelector('#asSchedule39'))return;
    const oldTask=document.getElementById('asTask35');if(oldTask?.closest('div'))oldTask.closest('div').style.display='none';
    const block=document.createElement('div');block.id='asSchedule39';block.className='wide';
    block.innerHTML=`<div class="sep"></div><h3 style="font-size:14px;margin:0 0 8px">Inserir no cronograma</h3>
      <label style="display:flex;gap:8px;align-items:center;font-weight:700"><input id="asAddSchedule39" type="checkbox" checked style="width:auto" onchange="scheduleFormRefreshV39()"> Criar atividade no cronograma</label>
      <div id="asScheduleFields39">
        <label>Posição — inserir depois de</label><select id="asAfterTask39" onchange="scheduleFormRefreshV39()">${taskOptions()}</select>
        <div class="service-form-grid-v35" style="margin-top:6px"><div><label>Duração (dias úteis)</label><input id="asDuration39" type="number" min="0.5" step="0.5" value="1"></div><div><label>Jornada usada</label><input value="8 h/dia" disabled></div></div>
        <div id="asDurationInfo39" class="meta" style="margin-top:6px"><span>Se houver coeficientes SINAPI, o prazo sugerido será calculado automaticamente.</span></div>
      </div>`;
    grid.appendChild(block);scheduleFormRefreshV39();
  }
  window.scheduleFormRefreshV39=function(){
    const on=document.getElementById('asAddSchedule39')?.checked!==false,fields=document.getElementById('asScheduleFields39');if(fields)fields.style.display=on?'':'none';if(!on)return;
    const qty=num(document.getElementById('asQty35')?.value),ref=String(document.getElementById('asRef35')?.value||'').trim();
    const s=[...(state.addedServices||[])].reverse().find(x=>String(x.sinapiCode||x.reference||'').includes(ref));
    // Durante a seleção SINAPI, os itens ainda podem não estar em state; app-sinapi-v38 guarda o selecionado só no closure.
    // Portanto, o cálculo também será refeito depois que o serviço for salvo.
    const calc=durationFromSinapi(s,qty),info=document.getElementById('asDurationInfo39');
    if(calc.available){const d=document.getElementById('asDuration39');if(d)d.value=calc.days;if(info)info.innerHTML=`<span><b>Sugestão SINAPI:</b> ${calc.hours.toLocaleString('pt-BR',{maximumFractionDigits:2})} h de referência → ${calc.days.toLocaleString('pt-BR')} dia(s) útil(eis).</span>`}
  };

  function insertAddedTask(task,afterId){
    state.addedTasks=Array.isArray(state.addedTasks)?state.addedTasks:[];
    state.addedTasks.push({...task,positionAfterId:Number(afterId)});
  }
  function shiftFollowing(anchorId,newDuration){
    const tasks=state.tasks||[],idx=tasks.findIndex(t=>String(t.id)===String(anchorId));if(idx<0)return;
    const anchor=tasks[idx],start=nextBusinessDay(anchor.finish||anchor.start),finish=addBusinessDays(start,newDuration);
    return {start,finish};
  }
  function nextTaskId(){const ids=[...(state.tasks||[]),...(state.addedTasks||[])].map(t=>Number(t.id)||0);return Math.max(0,...ids)+1}

  function install(){
    if(typeof window.openAddServiceV35!=='function'||typeof window.saveAddServiceV35!=='function')return false;
    const oldOpen=window.openAddServiceV35,oldSave=window.saveAddServiceV35;
    window.openAddServiceV35=function(){oldOpen();setTimeout(decorateForm,0)};
    window.saveAddServiceV35=async function(){
      const makeTask=document.getElementById('asAddSchedule39')?.checked!==false,afterId=document.getElementById('asAfterTask39')?.value||'',manualDuration=Math.max(.5,num(document.getElementById('asDuration39')?.value)||1),serviceCode=String(document.getElementById('asCode35')?.value||'').trim(),serviceName=String(document.getElementById('asName35')?.value||'').trim(),macro=String(document.getElementById('asMacro35')?.value||'').trim(),qty=num(document.getElementById('asQty35')?.value);
      if(makeTask&&afterId){const oldTaskSel=document.getElementById('asTask35');if(oldTaskSel)oldTaskSel.value=''}
      const before=(state.addedServices||[]).length;await oldSave();
      const added=(state.addedServices||[])[(state.addedServices||[]).length-1];if(!makeTask||!afterId||!added||(state.addedServices||[]).length<=before)return;
      const calc=durationFromSinapi(added,qty),duration=calc.available?calc.days:manualDuration,dates=shiftFollowing(afterId,duration);if(!dates)return;
      const id=nextTaskId();const task={id,phase:macro||'Serviço adicionado',name:serviceName||added.name||('Serviço '+serviceCode),origin:serviceCode,duration,preds:String(afterId),start:dates.start,finish:dates.finish,progress:0,resource:calc.available?'Equipe de referência SINAPI · 8 h/dia':'Equipe a definir',plannedCost:Number(added.total)||0,notes:calc.available?`Prazo sugerido pelo SINAPI: ${calc.hours.toFixed(2)} h de referência, jornada 8 h/dia.`:'Prazo informado manualmente; composição SINAPI sem coeficiente de mão de obra utilizável.',addedFromService:true,serviceCode,positionAfterId:Number(afterId),sinapiDuration:calc.available,sinapiLaborHours:calc.hours||0};
      insertAddedTask(task,afterId);added.taskId=id;
      // Atualiza o último serviço salvo na nuvem agora já vinculado à nova atividade.
      try{await save()}catch(e){console.error('v39 save',e)}
    };
    window.__scheduleServiceV39=true;return true;
  }
  if(!install())readyTimer=setInterval(()=>{if(install())clearInterval(readyTimer)},100);
})();