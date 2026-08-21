// v05 - garante base técnica completa mesmo quando o Firestore ainda contém estado antigo/reduzido.
(async function(){
  let fullSeed=null;

  async function loadFullSeed(){
    try{
      const parts=[];
      for(let i=1;i<=8;i++){
        const n=String(i).padStart(2,'0');
        const r=await fetch(`payload/${n}.part?v=5`,{cache:'no-store'});
        if(!r.ok) throw new Error(`payload ${n}: ${r.status}`);
        parts.push((await r.text()).trim());
      }
      const b64=parts.join('');
      const bin=atob(b64), bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
      if(typeof DecompressionStream==='undefined') throw new Error('Navegador sem suporte a DecompressionStream');
      const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      const html=await new Response(stream).text();
      const m=html.match(/const SEED=(\{[\s\S]*?\});\s*\nconst KEY=/);
      if(!m) throw new Error('SEED completo não encontrado');
      return JSON.parse(m[1]);
    }catch(e){
      console.error('Falha ao carregar base completa',e);
      const pill=document.getElementById('syncPill');
      if(pill){pill.textContent='erro base v05';pill.className='sync-pill warn'}
      return null;
    }
  }

  function normalize(remote){
    if(!fullSeed) return remote||state;
    const r=remote||{};
    const fresh=JSON.parse(JSON.stringify(fullSeed));
    fresh.costs=Array.isArray(r.costs)?r.costs:[];
    fresh.purchasePlan=(r.purchasePlan&&typeof r.purchasePlan==='object')?r.purchasePlan:{};

    const oldTasks=new Map((r.tasks||[]).map(t=>[t.id,t]));
    fresh.tasks=(fresh.tasks||[]).map(t=>{
      const o=oldTasks.get(t.id);
      return o?{...t,progress:+o.progress||0,notes:o.notes||''}:t;
    });

    const oldPls=new Map((r.pls||[]).map(p=>[p.stage,p]));
    fresh.pls=(fresh.pls||[]).map(p=>{
      const o=oldPls.get(p.stage);
      return o?{...p,status:o.status||p.status,notes:o.notes||''}:p;
    });
    return fresh;
  }

  fullSeed=await loadFullSeed();
  if(!fullSeed) return;
  window.__FULL_SEED=fullSeed;

  // Corrige imediatamente o estado atual.
  state=normalize(state);
  try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}

  // Toda renderização passa primeiro pela normalização. Assim, mesmo se um snapshot antigo
  // do Firestore trouxer apenas 2 tarefas, a tela nunca volta para a base reduzida.
  const baseRenderAll=window.renderAll;
  window.renderAll=function(){
    state=normalize(state);
    try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
    return baseRenderAll();
  };

  renderAll();

  // Assim que o login/banco estiver disponível, grava de volta a base completa preservando
  // custos, progresso, PLS e planejamento de compras já existentes.
  let tries=0;
  const timer=setInterval(async()=>{
    tries++;
    state=normalize(state);
    renderAll();
    if(typeof auth!=='undefined' && auth.currentUser && typeof cloudReady!=='undefined' && cloudReady){
      try{await save();}catch(e){console.error(e)}
      clearInterval(timer);
    }else if(tries>=60){
      clearInterval(timer);
    }
  },500);
})();
