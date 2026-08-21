// Restaura automaticamente a base estática completa do orçamento/cronograma sem apagar dados do usuário.
(function(){
  function hydrateStatic(){
    if(typeof state==='undefined'||typeof SEED==='undefined') return false;
    if(!state.project) state.project=clone(SEED.project||{});
    if(!state.macros?.length) state.macros=clone(SEED.macros||[]);
    if(!state.services?.length) state.services=clone(SEED.services||[]);
    if(!state.abc?.length) state.abc=clone(SEED.abc||[]);
    if(!state.purchases?.length) state.purchases=clone(SEED.purchases||[]);
    if(!state.purchasePlan||typeof state.purchasePlan!=='object') state.purchasePlan={};

    const seedTasks=SEED.tasks||[];
    if(!state.tasks || state.tasks.length<seedTasks.length){
      const old=new Map((state.tasks||[]).map(t=>[t.id,t]));
      state.tasks=seedTasks.map(t=>{
        const o=old.get(t.id);
        return o ? {...clone(t),progress:o.progress||0,notes:o.notes||''} : clone(t);
      });
    }

    const seedPls=SEED.pls||[];
    if(!state.pls || state.pls.length<seedPls.length){
      const old=new Map((state.pls||[]).map(p=>[p.stage,p]));
      state.pls=seedPls.map(p=>{
        const o=old.get(p.stage);
        return o ? {...clone(p),status:o.status||p.status,notes:o.notes||''} : clone(p);
      });
    }
    try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(e){}
    try{ renderAll(); }catch(e){}
    return true;
  }

  hydrateStatic();
  let tries=0;
  const timer=setInterval(async()=>{
    const ok=hydrateStatic();
    tries++;
    if(ok && typeof auth!=='undefined' && auth.currentUser && typeof cloudReady!=='undefined' && cloudReady){
      try{ await save(); }catch(e){}
      clearInterval(timer);
    } else if(tries>=20){ clearInterval(timer); }
  },700);
})();
