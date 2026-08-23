// v37 - mostra a composicao/referencia completa diretamente no orçamento detalhado
(function(){
  if(window.__detailCompositionV37)return;
  const previous=window.renderBudget;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const style=document.createElement('style');
  style.textContent=`.detail-comp-v37{display:block;margin-top:4px;font-size:10px;line-height:1.35;color:var(--muted);font-weight:500;max-width:520px;white-space:normal}.detail-comp-v37 b{color:var(--blue);font-weight:800}.detail-comp-v37.sinapi b{color:#245b92}`;
  document.head.appendChild(style);

  function byCode(code){
    const c=String(code||'');
    const current=(state.services||[]).find(s=>String(s.code||'')===c);
    const base=(window.__FULL_SEED?.services||[]).find(s=>String(s.code||'')===c);
    const custom=(state.customServices||[]).find(s=>String(s.code||'')===c);
    return {current,base,custom};
  }
  function pickFull(obj){
    if(!obj)return '';
    const vals=[obj.compositionFull,obj.compositionReference,obj.sinapiReference,obj.referenceFull,obj.reference,obj.sinapiCode,obj.sourceCode,obj.codeRef]
      .map(v=>String(v??'').trim()).filter(Boolean);
    if(!vals.length)return '';
    return vals.sort((a,b)=>b.length-a.length)[0];
  }
  function sourceOf(...objs){
    for(const o of objs){if(!o)continue;const s=String(o.source||o.priceSource||o.referenceSource||o.priceStatus||'').trim();if(s)return s}
    return '';
  }
  function referenceFor(code){
    const {current,base,custom}=byCode(code);
    const ref=pickFull(custom)||pickFull(base)||pickFull(current);
    const src=sourceOf(custom,base,current);
    if(!ref)return null;
    const sinapi=/sinapi/i.test(src)||/sinapi/i.test(ref)||/^\d{4,7}(\b|\s|-)/.test(ref);
    return {ref,src,sinapi};
  }
  function decorate(){
    if((window.__budgetTab||'')!=='detail')return;
    document.querySelectorAll('.detail-v24-row').forEach(row=>{
      if(row.dataset.compV37)return;
      row.dataset.compV37='1';
      const code=row.dataset.code||row.children?.[0]?.textContent?.trim();
      const data=referenceFor(code);if(!data)return;
      const td=row.children?.[1];if(!td)return;
      const label=data.sinapi?'Composição SINAPI':'Composição / referência';
      const span=document.createElement('span');span.className='detail-comp-v37'+(data.sinapi?' sinapi':'');
      span.innerHTML=`<b>${label}:</b> ${esc(data.ref)}`;
      td.appendChild(span);
      // torna a busca capaz de localizar também pelo código/referência da composição
      row.dataset.q=((row.dataset.q||'')+' '+String(data.ref).toLowerCase()+' '+String(data.src||'').toLowerCase()).trim();
    });
  }
  window.renderBudget=function(tab,month){
    const active=tab||window.__budgetTab||'summary';
    const out=previous(tab,month);
    if(active==='detail')setTimeout(decorate,0);
    return out;
  };
  try{if((window.__budgetTab||'')==='detail')decorate()}catch(e){console.error(e)}
  window.__detailCompositionV37=true;
})();
