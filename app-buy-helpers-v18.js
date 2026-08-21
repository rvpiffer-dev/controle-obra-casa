// helpers de Compras v18 - extraídos da base original íntegra
(function(){
  window.fmtQty=window.fmtQty||function(v,u){const n=+v||0;const d=n>=100?0:n>=10?1:2;return n.toLocaleString('pt-BR',{maximumFractionDigits:d})+(u?' '+u:'')};
  window.monthKey=window.monthKey||function(d){return String(d||'').slice(0,7)};
  window.projectMonths=window.projectMonths||function(){const out=[],seen=new Set();(state.tasks||[]).forEach(t=>{[t.start,t.finish].forEach(d=>{const k=monthKey(d);if(k&&!seen.has(k)){seen.add(k);out.push(k)}})});return out.sort()};
  window.defaultBuyMonth=window.defaultBuyMonth||function(){const n=new Date();n.setMonth(n.getMonth()+1);const k=n.toISOString().slice(0,7);const ms=projectMonths();return ms.includes(k)?k:(ms.find(x=>x>=k)||ms[0]||k)};
  window.purchasesForMonth=window.purchasesForMonth||function(k){const tids=(state.tasks||[]).filter(t=>monthKey(t.start)<=k&&monthKey(t.finish)>=k).map(t=>t.id);const arr=(state.purchases||[]).filter(p=>tids.includes(p.taskId));const map={};arr.forEach(p=>{const kk=(p.name||'')+'|'+(p.unit||'');if(!map[kk])map[kk]={...p,qty:0,estimatedCost:0,tasks:new Set()};map[kk].qty+=+p.qty||0;map[kk].estimatedCost+=+p.estimatedCost||0;map[kk].tasks.add(p.taskId)});return Object.values(map).map(x=>({...x,tasks:[...x.tasks]})).sort((a,b)=>b.estimatedCost-a.estimatedCost)};
  window.monthLabel=window.monthLabel||function(k){if(!k)return '—';const [y,m]=k.split('-');return new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(+y,+m-1,1))};
  window.__buyHelpersV18=true;
})();
