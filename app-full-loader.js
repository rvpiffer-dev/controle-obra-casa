// v13 - extrai somente o SEED completo do payload e mantém a base normalizada contra snapshots antigos do Firestore.
(async function(){
  let fullSeed=null;
  const pill=()=>document.getElementById('syncPill');
  const setPill=(txt,ok=false)=>{const p=pill();if(p){p.textContent=txt;p.className='sync-pill '+(ok?'ok':'warn')}};

  async function ensurePako(){
    if(window.pako) return;
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js';
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Falha ao carregar pako'));
      document.head.appendChild(s);
    });
  }

  async function fetchPart(n){
    const urls=[
      `https://raw.githubusercontent.com/rvpiffer-dev/controle-obra-casa/main/payload/${n}.part?v=13`,
      `https://cdn.jsdelivr.net/gh/rvpiffer-dev/controle-obra-casa@main/payload/${n}.part?v=13`,
      `payload/${n}.part?v=13`
    ];
    let last='';
    for(const url of urls){
      try{
        const r=await fetch(url,{cache:'no-store'});
        if(!r.ok) throw new Error('HTTP '+r.status);
        const t=(await r.text()).trim();
        if(t.length<100) throw new Error('arquivo incompleto');
        return t;
      }catch(e){last=e.message}
    }
    throw new Error(`payload ${n}: ${last}`);
  }

  async function loadFullSeed(){
    try{
      setPill('carregando base…');
      await ensurePako();
      const parts=[];
      for(let i=1;i<=8;i++) parts.push(await fetchPart(String(i).padStart(2,'0')));
      const b64=parts.join('').replace(/\s/g,'');
      const bin=atob(b64),bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);

      let html;
      try{
        html=pako.ungzip(bytes,{to:'string'});
      }catch(gzipError){
        if(bytes.length<20||bytes[0]!==0x1f||bytes[1]!==0x8b) throw gzipError;
        let pos=10,flg=bytes[3];
        if(flg&4){const xlen=bytes[pos]|(bytes[pos+1]<<8);pos+=2+xlen}
        if(flg&8){while(pos<bytes.length&&bytes[pos++]!==0){}}
        if(flg&16){while(pos<bytes.length&&bytes[pos++]!==0){}}
        if(flg&2) pos+=2;
        html=pako.inflateRaw(bytes.slice(pos,-8),{to:'string'});
      }

      const start=html.indexOf('const SEED=');
      if(start<0) throw new Error('início do SEED não encontrado');
      let end=html.indexOf(';\nconst KEY=',start);
      if(end<0) end=html.indexOf(';const KEY=',start);
      if(end<0) throw new Error('fim do SEED não encontrado');
      const json=html.slice(start+'const SEED='.length,end);
      const seed=JSON.parse(json);
      if(!seed.tasks||seed.tasks.length!==52) throw new Error('base de atividades inválida: '+(seed.tasks?.length||0));
      if(!seed.services||seed.services.length!==204) throw new Error('orçamento inválido: '+(seed.services?.length||0));
      if(!seed.purchases||seed.purchases.length!==313) throw new Error('compras inválidas: '+(seed.purchases?.length||0));
      return seed;
    }catch(e){
      console.error('Falha ao carregar base completa v13',e);
      setPill('erro base v13');
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

  const originalRenderAll=window.renderAll;
  window.renderAll=function(){
    state=normalize(state);
    try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
    return originalRenderAll();
  };

  state=normalize(state);
  renderAll();
  setPill('52 atividades',true);

  // Mantém a base completa durante a chegada do snapshot remoto antigo e grava a migração quando o cloud estiver pronto.
  let tries=0;
  const timer=setInterval(async()=>{
    tries++;
    state=normalize(state);
    renderAll();
    if(typeof auth!=='undefined' && auth.currentUser && typeof cloudReady!=='undefined' && cloudReady){
      try{await save();setPill('sincronizado',true)}catch(e){console.error(e)}
      clearInterval(timer);
    } else if(tries>=40){
      setPill('52 atividades',true);
      clearInterval(timer);
    }
  },500);
})();
