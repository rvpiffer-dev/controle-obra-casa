const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={window:{}};vm.createContext(ctx);
for(const name of ['data','domain','manager','measurement-sheet'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/'+name+'.js'),'utf8'),ctx);
const D=ctx.window.Obras,M=ctx.window.EngefexManager,S=ctx.window.EngefexMeasurementSheet,clone=x=>JSON.parse(JSON.stringify(x));
function fixture(){const s=clone(M.separate(ctx.window.OBRAS_SEED));
 s.projects.push({...M.defaults('projects'),id:'P',name:'Casa',value:100});s.budgetStages.push({...M.defaults('budgetStages','P'),id:'BS',name:'Etapa'});
 s.budgetItems.push({...M.defaults('budgetItems','P'),id:'I',stage:'BS',name:'Serviço',quantity:10,sale:100,unitPrice:10});
 s.measurements.push({id:'ME',project:'P',number:'MED-001',activity:'I',quantity:5,status:'Aprovada',date:'2026-11-12',approved:'2026-11-12',submitted:'2026-11-12',expected:'2026-11-15',evidence:'Aprovação',retentionRate:0,directInvoices:[{supplier:'Fornecedor',invoice:'1',date:'2026-11-10',amount:20}],advanceOffset:0,advanceRate:0,retentionReleased:false,receivableInstallments:[{id:'R',amount:30,due:'2026-11-15'}]});return clone(s);}
test('reopening preserves quantities and planned discounts while releasing editing locks',()=>{
 const s=fixture(),before=clone(s),result=clone(S.reopenBatch(s,'ME')),row=result.measurements[0];
 assert.equal(row.status,'Preparada');assert.equal(row.id,'ME');assert.equal(row.quantity,5);assert.equal(row.approved,'');assert.equal(row.directInvoices.length,0);assert.equal(row.plannedDirectInvoices[0].amount,20);assert(!row.receivableInstallments);assert.equal(result.history[0].before[0].receivableInstallments[0].amount,30);assert.equal(D.receivableRows(result).length,0);assert.deepEqual(s,before);
});
test('reopening an entire group leaves other measurement numbers unchanged',()=>{
 const s=fixture();s.measurements.push({...clone(s.measurements[0]),id:'ME2',quantity:1});const other={...clone(s.measurements[0]),id:'OTHER',number:'MED-002'};s.measurements.push(other);
 const result=clone(S.reopenBatch(s,'ME2'));assert.equal(result.measurements.filter(m=>m.number==='MED-001'&&m.status==='Preparada').length,2);assert.deepEqual(result.measurements.find(m=>m.id==='OTHER'),other);
});
test('recorded receipts block reopening without changing records or receipts',()=>{
 const s=fixture();s.receipts.push({id:'REC',project:'P',number:'MED-001',amount:5,date:'2026-11-12'});const before=clone(s);assert.throws(()=>S.reopenBatch(s,'ME'),/recebimentos registrados/);assert.deepEqual(s,before);
});
test('corrected release recalculates accounts receivable without duplicating a measurement',()=>{
 const prepared=clone(S.reopenBatch(fixture(),'ME'));
 const result=clone(S.releaseBatch(prepared,'ME',{submitted:'2026-11-12',approved:'2026-11-12',expected:'2026-11-15',evidence:'Conferida',directInvoices:[],advanceOffset:0,advanceRate:0,receivableInstallmentCount:1}));
 assert.equal(result.measurements.length,1);assert.equal(result.measurements[0].id,'ME');assert.equal(D.receivableRows(result)[0].amount,50);
});
