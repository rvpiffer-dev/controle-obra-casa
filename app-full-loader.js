// v18 - base completa + helpers originais da aba Compras
(async function(){
  let fullSeed=null;
  const pill=()=>document.getElementById('syncPill');
  const setPill=(txt,ok=false)=>{const p=pill();if(p){p.textContent=txt;p.className='sync-pill '+(ok?'ok':'warn')}};
  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Falha ao carregar '+src));document.head.appendChild(s)})}
  async function loadStaticSeed(){
    setPill('carregando base…');
    await loadScript('full-seed.js?v=18');
    const seed=window.FULL_SEED;
    if(!seed) throw new Error('FULL_SEED não definido');
    if(seed.tasks?.length!==52) throw new Error('atividades: '+(seed.tasks?.length||0));
    if(seed.services?.length!==204) throw new Error('orçamento: '+(seed.services?.length||0));
    if(seed.purchases?.length!==313) throw new Error('compras: '+(seed.purchases?.length||0));
    if(seed.abc?.length!==136) throw new Error('ABC: '+(seed.abc?.length||0));
    return seed;
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
    return fresh;
  }
  try{
    fullSeed=await loadStaticSeed();
    window.__FULL_SEED=fullSeed;
    state=normalize(state);
    try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
    await loadScript('app-buy-helpers-v18.js?v=18');
    await loadScript('app-budget-v15.js?v=18');
    const originalRenderAll=window.renderAll;
    window.renderAll=function(){
      state=normalize(state);
      try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
      return originalRenderAll();
    };
    renderAll();
    setPill('52 atividades',true);
    let tries=0;
    const timer=setInterval(async()=>{
      tries++;
      state=normalize(state);
      renderAll();
      if(typeof auth!=='undefined'&&auth.currentUser&&typeof cloudReady!=='undefined'&&cloudReady){
        try{await save();setPill('sincronizado',true)}catch(e){console.error(e)}
        clearInterval(timer);
      }else if(tries>=40){
        setPill('52 atividades',true);
        clearInterval(timer);
      }
    },500);
  }catch(e){
    console.error('Falha base v18',e);
    setPill('base v18 pendente');
  }
})();
