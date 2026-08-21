// Carrega a base técnica completa (52 tarefas, orçamento detalhado, ABC e compras) e preserva dados lançados pelos usuários.
(async function(){
  async function loadFullSeed(){
    try{
      const parts=[];
      for(let i=1;i<=8;i++){
        const n=String(i).padStart(2,'0');
        const r=await fetch(`payload/${n}.part?v=1`,{cache:'no-store'});
        if(!r.ok) throw new Error(`payload ${n}: ${r.status}`);
        parts.push((await r.text()).trim());
      }
      const b64=parts.join('');
      const bin=atob(b64), bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
      if(typeof DecompressionStream==='undefined') throw new Error('Navegador sem suporte a gzip local');
      const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      const html=await new Response(stream).text();
      const m=html.match(/const SEED=(\{[\s\S]*?\});\s*\nconst KEY=/);
      if(!m) throw new Error('SEED completo não encontrado');
      return JSON.parse(m[1]);
    }catch(e){ console.error('Falha ao carregar base completa',e); return null; }
  }

  function mergeFull(full){
    if(!full || typeof state==='undefined') return false;
    const dynCosts=Array.isArray(state.costs)?state.costs:[];
    const purchasePlan=(state.purchasePlan&&typeof state.purchasePlan==='object')?state.purchasePlan:{};
    const oldTasks=new Map((state.tasks||[]).map(t=>[t.id,t]));
    const oldPls=new Map((state.pls||[]).map(p=>[p.stage,p]));

    state.project=full.project||state.project;
    state.macros=full.macros||[];
    state.services=full.services||[];
    state.abc=full.abc||[];
    state.purchases=full.purchases||[];
    state.tasks=(full.tasks||[]).map(t=>{
      const o=oldTasks.get(t.id);
      return o?{...t,progress:o.progress||0,notes:o.notes||''}:t;
    });
    state.pls=(full.pls||[]).map(p=>{
      const o=oldPls.get(p.stage);
      return o?{...p,status:o.status||p.status,notes:o.notes||''}:p;
    });
    state.costs=dynCosts;
    state.purchasePlan=purchasePlan;
    try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(e){}
    try{ renderAll(); }catch(e){}
    return true;
  }

  const full=await loadFullSeed();
  if(!mergeFull(full)) return;
  let tries=0;
  const timer=setInterval(async()=>{
    mergeFull(full);
    tries++;
    if(typeof auth!=='undefined' && auth.currentUser && typeof cloudReady!=='undefined' && cloudReady){
      try{ await save(); }catch(e){}
      clearInterval(timer);
    }else if(tries>=20){ clearInterval(timer); }
  },700);
})();
