const {test}=require('node:test');
const assert=require('node:assert/strict');
const dashboard=require('../dist/casa-dashboard.js');
const today='2026-11-12';
function fixture(){
 const project={id:'P',name:'Casa',casa:{pls:[{stage:1,cumPct:.05,status:'Liberada',date:'2026-10-14'},{stage:2,cumPct:.20,status:'Planejada',date:'2026-11-16'}],purchasePlan:{__managementSettings:{purchaseLeadDays:14}}}};
 const state={projects:[project],costs:[],purchases:[],activities:[]};
 const projected={tasks:[{id:1,name:'Etapa próxima',start:'2026-11-26'}],services:[],purchases:[{name:'Cimento',unit:'saco',qty:2,estimatedCost:100,taskId:1,serviceCode:'01'}]};
 return {state,project,projected,options:{today,projectState:()=>projected}};
}
test('PLS reflects released records without treating planned stages as released',()=>{
 const {state,options}=fixture(),model=dashboard.build(state,'all',options);
 assert.equal(model.plans[0].progress,.05);assert.equal(model.plans[0].released,1);assert.equal(model.plans[0].next.stage,2);
 assert.equal(model.upcoming[0].date,today);
});
test('lead time zero is honored and ordered, delivered or paid inputs are omitted',()=>{
 const {state,project,options}=fixture();project.casa.purchasePlan.__managementSettings.purchaseLeadDays=0;
 assert.equal(dashboard.build(state,'all',options).upcoming[0].date,'2026-11-26');
 for(const status of ['Pedido','Entregue','Pago']){project.casa.purchasePlan['2026-11|Cimento|saco']={status};assert.equal(dashboard.build(state,'all',options).upcoming.length,0)}
});
test('recent purchases use issue dates and avoid repeating their payable installments',()=>{
 const {state,options}=fixture();state.purchases=[{id:'NF',project:'P',date:'2026-11-11',number:'10',items:[{description:'Areia',total:200}],status:'Confirmada'}];
 state.costs=[{id:'PART',project:'P',purchase:'NF',amount:200,paid:200,due:'2026-12-11'},{id:'OLD',project:'P',description:'Madeira',amount:50,paid:50,casaLegacy:{date:'2026-11-10'}}];
 const model=dashboard.build(state,'all',options);assert.equal(model.recent.length,2);assert.equal(model.recent[0].id,'NF');assert.equal(model.recent[0].amount,200);
});
test('future list excludes old forecasts while preserving the overdue indicator',()=>{
 const {state,projected,options}=fixture();projected.tasks.push({id:2,name:'Anterior',start:'2026-11-01'});projected.purchases.push({name:'Madeira antiga',taskId:2,qty:3,estimatedCost:30});
 const model=dashboard.build(state,'all',options);assert.equal(model.overdue,1);
 const html=dashboard.render(state,'all',options);assert(!html.includes('Madeira antiga'));assert(html.includes('Cimento'));
});
test('current budget quantities scale planned inputs and permissions hide restricted sections',()=>{
 const {state,project,projected,options}=fixture();project.casa.legacyImportedState={services:[{code:'01',qty:2}]};projected.services=[{code:'01',qty:4,material:200}];
 assert.equal(dashboard.build(state,'all',options).upcoming[0].qty,4);
 const restricted=dashboard.build(state,'all',{...options,canRead:()=>false});assert.equal(restricted.plans.length,0);assert.equal(restricted.upcoming.length,0);assert.equal(restricted.recent.length,0);
 assert.equal(dashboard.build(state,'OTHER',options).plans.length,0);
});
