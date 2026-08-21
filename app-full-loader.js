// v28 - base completa + reconciliacao de Compras + Excel + edicao direta do orcamento
(async function(){
  let fullSeed=null;
  const pill=()=>document.getElementById('syncPill');
  const setPill=(txt,ok=false)=>{const p=pill();if(p){p.textContent=txt;p.className='sync-pill '+(ok?'ok':'warn')}};
  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Falha ao carregar '+src));document.head.appendChild(s)})}
  async function loadStaticSeed(){
    setPill('carregando base…');
    await loadScript('full-seed.js?v=28');
    const seed=window.FULL_SEED;
    if(!seed) throw new Error('FULL_SEED não definido');
    if(seed.tasks?.length!==52) throw new Error('atividades: '+(seed.tasks?.length||0));
    if(seed.services?.length!==204) throw new Error('orçamento: '+(seed.services?.length||0));
    if(seed.purchases?.length!==313) throw new Error('compras-base: '+(seed.purchases?.length||0));
    if(seed.abc?.length!==136) throw new Error('ABC: '+(seed.abc?.length||0));
    return seed;
  }

  function applyBudgetOverrides(fresh,overrides){
    overrides=overrides&&typeof overrides==='object'?overrides:{};
    fresh.services=(fresh.services||[]).map(s=>{
      const o=overrides[String(s.code||'')];if(!o)return s;
      const originalEO=(Number(s.equipUnit)||0)+(Number(s.otherUnit)||0);
      const equipRatio=originalEO>0?(Number(s.equipUnit)||0)/originalEO:0;
      const qty=Number.isFinite(Number(o.qty))?Number(o.qty):(Number(s.qty)||0);
      const materialUnit=Number.isFinite(Number(o.materialUnit))?Number(o.materialUnit):(Number(s.materialUnit)||0);
      const laborUnit=Number.isFinite(Number(o.laborUnit))?Number(o.laborUnit):(Number(s.laborUnit)||0);
      const eoUnit=Number.isFinite(Number(o.eoUnit))?Number(o.eoUnit):originalEO;
      const name=String(o.name??'').trim()||s.name;
      const equipUnit=eoUnit*equipRatio,otherUnit=eoUnit-equipUnit;
      const material=qty*materialUnit,labor=qty*laborUnit,equipment=qty*equipUnit,others=qty*otherUnit,total=material+labor+equipment+others;
      return {...s,name,qty,materialUnit,laborUnit,equipUnit,otherUnit,unitCost:materialUnit+laborUnit+eoUnit,material,labor,equipment,others,total,priceStatus:'Editado'};
    });

    // Quantidade zero = item desativado. Não aparece no aplicativo nem alimenta compras/ABC.
    fresh.services=fresh.services.filter(s=>(Number(s.qty)||0)>0);

    const macroMap=new Map();
    (fresh.services||[]).forEach(s=>{
      const k=String(s.macro||'');if(!macroMap.has(k))macroMap.set(k,{material:0,labor:0,equipment:0,others:0,total:0});
      const m=macroMap.get(k);m.material+=Number(s.material)||0;m.labor+=Number(s.labor)||0;m.equipment+=Number(s.equipment)||0;m.others+=Number(s.others)||0;m.total+=Number(s.total)||0;
    });
    fresh.macros=(fresh.macros||[]).map(m=>{const x=macroMap.get(String(m.name||''))||{material:0,labor:0,equipment:0,others:0,total:0};return {...m,...x}});

    const projectTotal=(fresh.services||[]).reduce((sum,s)=>sum+(Number(s.total)||0),0);
    fresh.project={...(fresh.project||{}),budget:projectTotal};

    const taskTotals=new Map();
    (fresh.services||[]).forEach(s=>taskTotals.set(String(s.taskId), (taskTotals.get(String(s.taskId))||0)+(Number(s.total)||0)));
    fresh.tasks=(fresh.tasks||[]).map(t=>({...t,plannedCost:taskTotals.get(String(t.id))||0}));

    const abcRows=(fresh.services||[]).filter(s=>(Number(s.total)||0)>0).sort((a,b)=>(Number(b.total)||0)-(Number(a.total)||0));
    let cum=0;fresh.abc=abcRows.map((s,i)=>{const part=projectTotal?(Number(s.total)||0)/projectTotal:0;cum+=part;return{rank:i+1,code:s.code,macro:s.macro,name:s.name,unit:s.unit,qty:s.qty,total:s.total,pct:part,cumPct:cum,class:cum<=.80?'A':cum<=.95?'B':'C'}});
    return fresh;
  }

  function reconcilePurchases(fresh){
    const byCode=new Map();
    (fullSeed?.purchases||[]).forEach(p=>{
      const code=String(p.serviceCode||'');
      if(code==='04.01' && String(p.source||'').toLowerCase()==='sinapi analítico' && ['34586','34649','34788'].includes(String(p.inputCode||''))) return;
      if(!byCode.has(code))byCode.set(code,[]);
      byCode.get(code).push({...p});
    });

    const out=[];
    (fresh.services||[]).forEach(s=>{
      const code=String(s.code||''),material=Number(s.material)||0;if(material<=0)return;
      const rows=byCode.get(code)||[],analyticalTotal=rows.reduce((sum,p)=>sum+(Number(p.estimatedCost)||0),0);
      const base=fullSeed?.services?.find(x=>String(x.code||'')===code),edited=!!fresh.budgetOverrides?.[code];
      const baseQty=Number(base?.qty)||0,qty=Number(s.qty)||0;
      const scale=baseQty>0?qty/baseQty:1;
      const scaled=rows.map(p=>({...p,qty:(Number(p.qty)||0)*scale,estimatedCost:(Number(p.estimatedCost)||0)*scale,unitPrice:Number(p.unitPrice)||0}));
      const scaledTotal=scaled.reduce((sum,p)=>sum+(Number(p.estimatedCost)||0),0);

      if(rows.length && Math.abs((edited?scaledTotal:analyticalTotal)-material)<=1){out.push(...(edited?scaled:rows));return}
      out.push({serviceCode:code,taskId:s.taskId,name:s.name||('Serviço '+code),unit:s.unit||'',qty:Number(s.qty)||0,unitPrice:Number(s.materialUnit)||0,estimatedCost:material,source:edited?'Orçamento editado':'Orçamento/EAP reconciliado',inputCode:''});
    });

    fresh.purchases=out;
    fresh.purchaseAudit={rawCount:(fullSeed?.purchases||[]).length,reconciledCount:out.length,materialTotal:(fresh.services||[]).reduce((sum,s)=>sum+(Number(s.material)||0),0),purchaseTotal:out.reduce((sum,p)=>sum+(Number(p.estimatedCost)||0),0)};
    return fresh;
  }

  function normalize(remote){
    if(!fullSeed)return remote||state;
    const r=remote||{},fresh=JSON.parse(JSON.stringify(fullSeed));
    fresh.costs=Array.isArray(r.costs)?r.costs:[];
    fresh.purchasePlan=(r.purchasePlan&&typeof r.purchasePlan==='object')?r.purchasePlan:{};
    fresh.budgetOverrides=(r.budgetOverrides&&typeof r.budgetOverrides==='object')?r.budgetOverrides:{};
    fresh.budgetImportMeta=r.budgetImportMeta||null;
    applyBudgetOverrides(fresh,fresh.budgetOverrides);
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
    await loadScript('app-buy-helpers-v18.js?v=28');
    await loadScript('app-budget-v15.js?v=28');
    await loadScript('app-buy-override-v19.js?v=28');
    await loadScript('app-filters-v24.js?v=28');
    await loadScript('app-budget-io-v27.js?v=28');
    await loadScript('app-budget-edit-v28.js?v=28');

    const originalRenderAll=window.renderAll;
    window.renderAll=function(){state=normalize(state);try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){};return originalRenderAll()};
    renderAll();setPill('52 atividades',true);
  }catch(e){console.error('Falha base v28',e);setPill('base v28 pendente')}
})();
