/* Visão da casa: PLS, compras registradas e necessidades do cronograma. */
(function(root){'use strict';
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||''))?String(x):'';
const add=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const fmt=x=>day(x)?x.slice(8,10)+'/'+x.slice(5,7)+'/'+x.slice(0,4):'Sem data';
const cash=x=>num(x).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const percent=x=>(num(x)*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
function build(state,selection='all',options={}){
 const today=options.today||root.Obras?.today?.()||new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'}),end=add(today,45);
 const canRead=options.canRead||(()=>true),projects=(state.projects||[]).filter(p=>selection==='all'||p.id===selection);
 const projectState=options.projectState||root.CasaModel?.projectState;
 const plans=[],recent=[],upcoming=[];
 for(const project of projects){
  const projected=projectState?projectState(state,project.id,root.FULL_SEED||{}):null;
  const stored=project.casa||(project.id==='CASA-RAMON-TALITA'?state.casaLegacy:null)||{};
  if(canRead('measurements')){
   const stages=[...(stored.pls||projected?.pls||[])].sort((a,b)=>num(a.stage)-num(b.stage));
   const released=stages.filter(s=>s.status==='Liberada'),next=stages.find(s=>s.status!=='Liberada')||null;
   plans.push({project:project.id,name:project.name,stages,released:released.length,total:stages.length,progress:Math.min(1,Math.max(0,...released.map(s=>num(s.cumPct)))),next});
  }
  if(!canRead('supplies'))continue;
  const docs=(state.purchases||[]).filter(p=>p.project===project.id||(p.items||[]).some(i=>(i.allocations||[]).some(a=>a.project===project.id)));
  for(const p of docs){
   let amount=0;
   for(const item of p.items||[]){const allocations=item.allocations||[];if(allocations.length){amount+=allocations.filter(a=>a.project===project.id).reduce((n,a)=>n+num(item.total)*num(a.share)/100,0)}else if(p.project===project.id)amount+=num(item.total)}
   if(p.project===project.id)amount+=num(p.adjustment);
   recent.push({id:p.id,project:project.id,projectName:project.name,description:(p.number?'Documento '+p.number+' · ':'')+(p.items?.[0]?.description||p.kind||'Compra'),supplier:p.supplier||'',date:day(p.date),amount,status:p.status||'Rascunho',href:'#supplies'});
  }
  if(canRead('payables')||canRead('budget'))for(const cost of (state.costs||[]).filter(c=>c.project===project.id&&!c.purchase)){
   recent.push({id:cost.id,project:project.id,projectName:project.name,description:cost.description||'Despesa registrada',supplier:cost.supplier||'',date:day(cost.casaLegacy?.date||cost.date||cost.paidDate||cost.due),amount:num(cost.amount),status:num(cost.paid)>=num(cost.amount)&&num(cost.amount)>0?'Pago':num(cost.paid)>0?'Pago em parte':'A pagar',href:'#payables'});
  }
  const tasks=projected?.tasks||(state.activities||[]).filter(t=>t.project===project.id).map(t=>({...t,id:t.casaTaskId||Number(t.id.match(/^ATIV-(\d+)$/)?.[1])||t.id}));
  const purchasePlan=stored.purchasePlan||{},raw=projected?.purchases||stored.purchases||[];
  const services=projected?.services||[],original=stored.legacyImportedState?.services||[],inputs=[];
  if(services.length)for(const service of services){
   if(num(service.material)<=0)continue;
   const sourceRows=raw.filter(p=>String(p.serviceCode)===String(service.code));
   const old=original.find(s=>String(s.code)===String(service.code)),scale=old&&num(old.qty)>0?num(service.qty)/num(old.qty):1;
   const scaled=sourceRows.map(p=>({...p,qty:num(p.qty)*scale,estimatedCost:num(p.estimatedCost)*scale}));
   if(scaled.length&&Math.abs(scaled.reduce((sum,p)=>sum+num(p.estimatedCost),0)-num(service.material))<=1)inputs.push(...scaled);
   else inputs.push({serviceCode:service.code,taskId:service.taskId,name:service.name,unit:service.unit,qty:service.qty,estimatedCost:service.material});
  }else inputs.push(...raw);
  const lead=Math.max(0,num(purchasePlan.__managementSettings?.purchaseLeadDays??14));
  const groups=new Map();
  for(const item of inputs){
   const task=tasks.find(t=>String(t.id)===String(item.taskId));if(!task||!day(task.start))continue;
   const month=task.start.slice(0,7),meta=purchasePlan[month+'|'+(item.inputCode||item.name)+'|'+(item.unit||'')]||{};
   if(['Pedido','Entregue','Pago','Cancelado','Cancelada'].includes(meta.status))continue;
   const date=day(meta.deadline)||add(task.start,-lead);if(date>end)continue;
   const key=[item.name,item.unit,date].join('|');
   const row=groups.get(key)||{project:project.id,projectName:project.name,name:item.name,unit:item.unit||'',qty:0,amount:0,date,useDate:task.start,status:meta.status||'A comprar',tasks:[]};
   row.qty+=num(item.qty);row.amount+=num(item.estimatedCost);if(!row.tasks.includes(task.name))row.tasks.push(task.name);groups.set(key,row);
  }
  upcoming.push(...groups.values());
 }
 recent.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||String(a.id).localeCompare(String(b.id)));
 upcoming.sort((a,b)=>a.date.localeCompare(b.date)||b.amount-a.amount||a.name.localeCompare(b.name,'pt-BR'));
 return {today,end,projects:projects.map(p=>p.name),plans,recent,upcoming,overdue:upcoming.filter(p=>p.date<today).length,canPLS:canRead('measurements'),canPurchases:canRead('supplies')};
}
function render(state,selection,options={}){
 const m=build(state,selection,options),multi=m.projects.length>1;
 const empty=(text)=>'<p class="house-empty">'+text+'</p>';
 const links='<div class="house-shortcuts">'+(m.canPLS?'<a class="button primary" href="#casa-pls">Abrir PLS Caixa</a>':'')+(m.canPurchases?'<a class="button secondary" href="#casa-compras">Programação de compras</a><a class="button secondary" href="#supplies">Compras e notas</a>':'')+'</div>';
 const plans=m.plans.map(plan=>'<article class="house-pls-card"><div class="house-pls-title"><div><span class="house-kicker">'+esc(plan.name)+'</span><h3>Andamento da PLS</h3></div><strong>'+percent(plan.progress)+'</strong></div><div class="house-progress" role="progressbar" aria-label="PLS acumulada liberada" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(plan.progress*100)+'"><span style="width:'+Math.min(100,plan.progress*100)+'%"></span></div><p class="house-note">'+plan.released+' de '+plan.total+' etapas liberadas'+(plan.released?' · percentual acumulado liberado.':'. Nenhuma liberação registrada.')+'</p>'+(plan.next?'<div class="house-next-pls"><span>Próxima etapa</span><strong>Etapa '+esc(plan.next.stage)+' · '+esc(plan.next.status||'Planejada')+'</strong><small>Prevista para '+fmt(plan.next.date)+' · acumulado de '+percent(plan.next.cumPct)+'</small></div>':plan.total?'<p class="house-note">Todas as etapas estão liberadas.</p>':empty('Cadastre as etapas na PLS Caixa.'))+'<div class="house-pls-stages">'+plan.stages.slice(Math.max(0,plan.next?plan.stages.indexOf(plan.next):plan.stages.length-3),plan.next?plan.stages.indexOf(plan.next)+3:plan.stages.length).map(s=>'<div><span>Etapa '+esc(s.stage)+'</span><strong>'+percent(s.cumPct)+'</strong><small>'+fmt(s.date)+' · '+esc(s.status||'Planejada')+'</small></div>').join('')+'</div></article>').join('');
 const recent=m.recent.slice(0,6).map(row=>'<a class="house-row" href="'+row.href+'"><div><strong>'+esc(row.description)+'</strong><p>'+esc(row.supplier||'Fornecedor não informado')+(multi?' · '+esc(row.projectName):'')+'</p><small>'+fmt(row.date)+' · '+esc(row.status)+'</small></div><b>'+cash(row.amount)+'</b></a>').join('');
 const upcoming=m.upcoming.filter(row=>row.date>=m.today).slice(0,6).map(row=>'<a class="house-row house-upcoming" href="#casa-compras"><div><strong>'+esc(row.name)+'</strong><p>'+esc(row.qty.toLocaleString('pt-BR',{maximumFractionDigits:3})+' '+row.unit)+' · '+esc(row.status)+'</p><small>'+esc(row.tasks.join(' · '))+'</small><span class="house-due '+(row.date<m.today?'is-overdue':'')+'">'+(row.date<m.today?'Prazo previsto vencido · ':'Comprar até ')+fmt(row.date)+'</span></div><div class="house-estimate"><b>'+cash(row.amount)+'</b><small>Estimado</small></div></a>').join('');
 return '<div class="house-dashboard"><section class="house-welcome"><div><span class="house-kicker">CASA RAMON E TALITA</span><h1>Minha obra</h1><p>PLS, compras realizadas e o que precisa ser providenciado.</p></div><span class="house-today">'+fmt(m.today)+'</span></section>'+links+'<div class="house-summary">'+(m.canPLS?'<a href="#casa-pls"><span>Etapas PLS liberadas</span><strong>'+m.plans.reduce((n,p)=>n+p.released,0)+' / '+m.plans.reduce((n,p)=>n+p.total,0)+'</strong></a>':'')+(m.canPurchases?'<a href="#casa-compras"><span>Compras a providenciar</span><strong>'+m.upcoming.length+'</strong><small>Previsões até '+fmt(m.end)+'</small></a><a href="#casa-alertas"><span>Compras com prazo vencido</span><strong>'+m.overdue+'</strong><small>Conferir o que já foi comprado</small></a>':'')+'</div>'+(m.canPLS?'<section class="house-panel"><div class="house-panel-head"><h2>PLS Caixa</h2><a href="#casa-pls">Ver etapas e simulação</a></div><div class="house-pls-list">'+(plans||empty('Nenhuma obra selecionada.'))+'</div></section>':'')+(m.canPurchases?'<div class="house-buy-grid"><section class="house-panel"><div class="house-panel-head"><div><h2>Últimas compras</h2><p>Compras e despesas registradas</p></div><a href="#supplies">Ver compras</a></div>'+ (recent||empty('Nenhuma compra ou despesa registrada nesta obra.'))+'</section><section class="house-panel"><div class="house-panel-head"><div><h2>Próximas compras</h2><p>Necessidades previstas no cronograma</p></div><a href="#casa-compras">Ver programação</a></div>'+ (upcoming||empty('Nenhuma nova compra prevista para os próximos 45 dias.'))+'<p class="house-footnote">Prazos calculados pelo cronograma e pela antecedência configurada. Pendências anteriores aparecem no cartão de prazos vencidos. Marque na programação o que já foi pedido ou entregue.</p></section></div>':'')+'</div>';
}
const api={build,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CasaDashboard=api;
})(typeof window==='undefined'?globalThis:window);
