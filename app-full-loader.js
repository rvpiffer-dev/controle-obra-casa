// v26 - base completa + reconciliacao de Compras + filtros
(async function(){
  let fullSeed=null;
  const pill=()=>document.getElementById('syncPill');
  const setPill=(txt,ok=false)=>{const p=pill();if(p){p.textContent=txt;p.className='sync-pill '+(ok?'ok':'warn')}};
  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Falha ao carregar '+src));document.head.appendChild(s)})}
  async function loadStaticSeed(){
    setPill('carregando base…');
    await loadScript('full-seed.js?v=26');
    const seed=window.FULL_SEED;
    if(!seed) throw new Error('FULL_SEED não definido');
    if(seed.tasks?.length!==52) throw new Error('atividades: '+(seed.tasks?.length||0));
    if(seed.services?.length!==204) throw new Error('orçamento: '+(seed.services?.length||0));
    if(seed.purchases?.length!==313) throw new Error('compras-base: '+(seed.purchases?.length||0));
    if(seed.abc?.length!==136) throw new Error('ABC: '+(seed.abc?.length||0));
    return seed;
  }

  function reconcilePurchases(fresh){
    const services=new Map((fresh.services||[]).map(s=>[String(s.code||''),s]));
    const byCode=new Map();

    (fresh.purchases||[]).forEach(p=>{
      const code=String(p.serviceCode||'');
      // 04.01 teve blocos/canaletas retirados da composição e precificados nas linhas 04.02/03/05.
      if(code==='04.01' && String(p.source||'').toLowerCase()==='sinapi analítico' && ['34586','34649','34788'].includes(String(p.inputCode||''))) return;
      if(!byCode.has(code))byCode.set(code,[]);
      byCode.get(code).push({...p});
    });

    const out=[];
    (fresh.services||[]).forEach(s=>{
      const code=String(s.code||'');
      const material=Number(s.material)||0;
      if(material<=0) return;
      const rows=byCode.get(code)||[];
      const analyticalTotal=rows.reduce((sum,p)=>sum+(Number(p.estimatedCost)||0),0);

      // Mantém a abertura analítica somente quando ela fecha com o orçamento do serviço.
      if(rows.length && Math.abs(analyticalTotal-material)<=1){
        out.push(...rows);
        return;
      }

      // Quando a composição analítica não fecha, usa o próprio EAP como fonte única.
      out.push({
        serviceCode:code,
        taskId:s.taskId,
        name:s.name||('Serviço '+code),
        unit:s.unit||'',
        qty:Number(s.qty)||0,
        unitPrice:Number(s.materialUnit)||0,
        estimatedCost:material,
        source:'Orçamento/EAP reconciliado',
        inputCode:''
      });
    });

    fresh.purchases=out;
    fresh.purchaseAudit={
      rawCount:(fullSeed?.purchases||[]).length,
      reconciledCount:out.length,
      materialTotal:(fresh.services||[]).reduce((sum,s)=>sum+(Number(s.material)||0),0),
      purchaseTotal:out.reduce((sum,p)=>sum+(Number(p.estimatedCost)||0),0)
    };
    return fresh;
  }

  function normalize(remote){
    if(!fullSeed) return remote||state;
    const r=remote||{},fresh=JSON.parse(JSON.stringify(fullSeed));
    fresh.costs=Array.isArray(r.costs)?r.costs:[];
    fresh.purchasePlan=(r.purchasePlan&&typeof r.purchasePlan==='object')?r.purchasePlan:{};
    const oldTasks=new Map((r.tasks||[]).map(t=>[t.id,t]));
    fresh.tasks=(fresh.tasks||[]).map(t=>{const o=oldTasks.get(t.id);return o?{...t,progress:+o.progress||0,notes:o.notes||''}:t});
    const oldPls=new Map((r.pls||[]).map(p=>[p.stage,p]));
    fresh.pls=(fresh.pls||[]).map(p=>{const o=oldPls.get(p.stage);return o?{...p,status:o.status||p.status,notes:o.notes||''}:p});
    return reconcilePurchases(fresh);
  }
  try{
    fullSeed=await loadStaticSeed();
    window.__FULL_SEED=fullSeed;
    state=normalize(state);
    try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
    await loadScript('app-buy-helpers-v18.js?v=26');
    await loadScript('app-budget-v15.js?v=26');
    await loadScript('app-buy-override-v19.js?v=26');
    await loadScript('app-filters-v24.js?v=26');

    const originalRenderAll=window.renderAll;
    window.renderAll=function(){
      state=normalize(state);
      try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
      return originalRenderAll();
    };

    renderAll();
    setPill('52 atividades',true);
  }catch(e){
    console.error('Falha base v26',e);
    setPill('base v26 pendente');
  }
})();
