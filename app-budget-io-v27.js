// v27 - exportacao/importacao do orcamento usando a planilha v32 como template oficial
(function(){
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const num=v=>{if(v==null||v==='')return 0;if(typeof v==='number')return Number.isFinite(v)?v:0;if(typeof v==='object'&&v.result!=null)return num(v.result);const n=Number(String(v).replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:0};
  const same=(a,b)=>Math.abs((Number(a)||0)-(Number(b)||0))<0.0001;
  let excelReady=null, templateReady=null, pendingImport=null;

  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Falha ao carregar '+src));document.head.appendChild(s)})}
  async function ensureExcel(){
    if(window.ExcelJS)return window.ExcelJS;
    if(!excelReady)excelReady=loadScript('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js');
    await excelReady;if(!window.ExcelJS)throw new Error('ExcelJS não carregou');return window.ExcelJS;
  }
  async function ensureTemplate(){
    if(window.BUDGET_TEMPLATE_V32_B64)return window.BUDGET_TEMPLATE_V32_B64;
    if(!templateReady)templateReady=loadScript('budget-template-v32.js?v=27');
    await templateReady;if(!window.BUDGET_TEMPLATE_V32_B64)throw new Error('Template v32 não carregou');return window.BUDGET_TEMPLATE_V32_B64;
  }
  function b64ToArrayBuffer(b64){const bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer}
  function downloadBuffer(buf,name){const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  function servicesMap(){return new Map((state.services||[]).map(s=>[String(s.code||''),s]))}
  function findRows(ws,col){const m=new Map();ws.eachRow((row,n)=>{const v=row.getCell(col).value;if(v!=null){const k=String(typeof v==='object'&&v.text?v.text:v).trim();if(/^\d{2}\.\d{2}$/.test(k))m.set(k,n)}});return m}

  async function protectWorkbook(workbook,orRows){
    for(const ws of workbook.worksheets){
      ws.eachRow({includeEmpty:true},row=>row.eachCell({includeEmpty:true},cell=>{cell.protection={locked:true}}));
      if(ws.name==='ORÇAMENTO'){
        for(const r of orRows.values())for(const c of [5,6,7,8])ws.getCell(r,c).protection={locked:false};
      }
      try{await ws.protect('',{selectLockedCells:false,selectUnlockedCells:true,formatCells:false,formatColumns:false,formatRows:false,insertColumns:false,insertRows:false,deleteColumns:false,deleteRows:false,sort:false,autoFilter:true,pivotTables:false})}catch(e){console.warn('Proteção da aba',ws.name,e)}
    }
  }

  window.exportBudgetExcelV27=async function(){
    try{
      setSync('gerando Excel…');
      const ExcelJS=await ensureExcel(),b64=await ensureTemplate(),workbook=new ExcelJS.Workbook();
      await workbook.xlsx.load(b64ToArrayBuffer(b64));
      workbook.calcProperties.fullCalcOnLoad=true;workbook.calcProperties.forceFullCalc=true;workbook.calcProperties.calcMode='auto';
      const orc=workbook.getWorksheet('ORÇAMENTO'),eap=workbook.getWorksheet('EAP Consolidada');
      if(!orc||!eap)throw new Error('Abas ORÇAMENTO/EAP Consolidada não encontradas no modelo');
      const orRows=findRows(orc,2),eapRows=findRows(eap,1),sm=servicesMap();
      for(const [code,s] of sm){
        const ro=orRows.get(code),re=eapRows.get(code);if(!ro||!re)continue;
        const q=Number(s.qty)||0,mu=Number(s.materialUnit)||0,lu=Number(s.laborUnit)||0,eu=Number(s.equipUnit)||0,ou=Number(s.otherUnit)||0,eo=eu+ou,er=eo?eu/eo:0;
        orc.getCell(ro,5).value=q;orc.getCell(ro,6).value=mu||null;orc.getCell(ro,7).value=lu||null;orc.getCell(ro,8).value=eo||null;
        orc.getCell(ro,9).value={formula:`E${ro}*F${ro}`};orc.getCell(ro,10).value={formula:`E${ro}*G${ro}`};orc.getCell(ro,11).value={formula:`E${ro}*H${ro}`};orc.getCell(ro,12).value={formula:`SUM(I${ro}:K${ro})`};
        eap.getCell(re,5).value={formula:`'ORÇAMENTO'!E${ro}`};
        eap.getCell(re,11).value={formula:`'ORÇAMENTO'!F${ro}`};
        eap.getCell(re,12).value={formula:`'ORÇAMENTO'!G${ro}`};
        eap.getCell(re,13).value=er?{formula:`'ORÇAMENTO'!H${ro}*${er}`} : 0;
        eap.getCell(re,14).value=er<1?{formula:`'ORÇAMENTO'!H${ro}*${1-er}`} : 0;
        eap.getCell(re,15).value={formula:`SUM(K${re}:N${re})`};
        eap.getCell(re,16).value={formula:`E${re}*O${re}`};
        eap.getCell(re,18).value={formula:`E${re}*K${re}`};eap.getCell(re,19).value={formula:`E${re}*L${re}`};eap.getCell(re,20).value={formula:`E${re}*M${re}`};eap.getCell(re,21).value={formula:`E${re}*N${re}`};
      }
      await protectWorkbook(workbook,orRows);
      const out=await workbook.xlsx.writeBuffer();
      downloadBuffer(out,'Orcamento_Casa_Ramon_Talita_Editavel.xlsx');
      setSync('sincronizado',true);
    }catch(e){console.error(e);setSync('erro no Excel');alert('Não foi possível exportar o orçamento: '+(e.message||e))}
  };

  window.chooseBudgetExcelV27=function(){const i=document.getElementById('budgetImportFileV27');if(i){i.value='';i.click()}};
  window.readBudgetExcelV27=async function(input){
    const file=input.files&&input.files[0];if(!file)return;
    try{
      const ExcelJS=await ensureExcel(),workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await file.arrayBuffer());
      const ws=workbook.getWorksheet('ORÇAMENTO');if(!ws)throw new Error('A aba ORÇAMENTO não foi encontrada');
      const sm=servicesMap(),changes=[],unknown=[];
      ws.eachRow((row,r)=>{
        const raw=row.getCell(2).value,code=String(typeof raw==='object'&&raw?.text?raw.text:raw??'').trim();if(!/^\d{2}\.\d{2}$/.test(code))return;
        const cur=sm.get(code);if(!cur){unknown.push(code);return}
        const q=num(row.getCell(5).value),mu=num(row.getCell(6).value),lu=num(row.getCell(7).value),eo=num(row.getCell(8).value),oldEO=(Number(cur.equipUnit)||0)+(Number(cur.otherUnit)||0);
        if(!same(q,cur.qty)||!same(mu,cur.materialUnit)||!same(lu,cur.laborUnit)||!same(eo,oldEO))changes.push({code,name:cur.name,qty:q,materialUnit:mu,laborUnit:lu,eoUnit:eo,oldQty:Number(cur.qty)||0,oldMaterial:Number(cur.materialUnit)||0,oldLabor:Number(cur.laborUnit)||0,oldEO});
      });
      pendingImport={changes,unknown,fileName:file.name};
      const impact=changes.reduce((sum,x)=>sum+((x.qty*(x.materialUnit+x.laborUnit+x.eoUnit))-(x.oldQty*(x.oldMaterial+x.oldLabor+x.oldEO))),0);
      openModal(`<h2>Importar orçamento</h2><div class="meta"><span>${esc(file.name)}</span></div><div class="grid" style="margin-top:10px"><div class="card kpi"><div class="label">Alterações</div><div class="value">${changes.length}</div></div><div class="card kpi"><div class="label">Impacto estimado</div><div class="value">${brl(impact)}</div></div></div>${unknown.length?`<div class="item" style="margin-top:10px"><b>${unknown.length} códigos não reconhecidos</b><div class="meta">Eles serão ignorados.</div></div>`:''}<div class="section-title">Prévia <span>primeiros 30</span></div><div class="list">${changes.slice(0,30).map(x=>`<div class="item"><h3>${esc(x.code)} · ${esc(x.name)}</h3><div class="meta"><span>Qtd. ${x.oldQty.toLocaleString('pt-BR')} → <b>${x.qty.toLocaleString('pt-BR')}</b></span><span>Material ${brl(x.oldMaterial)} → <b>${brl(x.materialUnit)}</b></span><span>M.O. ${brl(x.oldLabor)} → <b>${brl(x.laborUnit)}</b></span><span>E/O ${brl(x.oldEO)} → <b>${brl(x.eoUnit)}</b></span></div>${x.qty===0?'<span class="badge warn" style="margin-top:7px">Será ocultado no aplicativo</span>':''}</div>`).join('')||'<div class="empty">Nenhuma alteração encontrada.</div>'}</div><div class="actions"><button class="btn alt" onclick="closeModal()">Cancelar</button><button class="btn" ${changes.length?'':'disabled'} onclick="applyBudgetExcelV27()">Aplicar alterações</button></div>`);
    }catch(e){console.error(e);alert('Não foi possível ler o arquivo: '+(e.message||e))}
  };

  window.applyBudgetExcelV27=async function(){
    if(!pendingImport)return;
    state.budgetOverrides=state.budgetOverrides&&typeof state.budgetOverrides==='object'?state.budgetOverrides:{};
    pendingImport.changes.forEach(x=>{state.budgetOverrides[x.code]={qty:x.qty,materialUnit:x.materialUnit,laborUnit:x.laborUnit,eoUnit:x.eoUnit}});
    state.budgetImportMeta={fileName:pendingImport.fileName,at:new Date().toISOString(),count:pendingImport.changes.length};
    pendingImport=null;closeModal();await save();alert('Orçamento importado e recalculado.');
  };

  const oldSettings=window.renderSettings;
  window.renderSettings=function(){
    if(oldSettings)oldSettings();
    const el=document.getElementById('settings');if(!el)return;
    const meta=state.budgetImportMeta;
    el.innerHTML=`<div class="section-title">Orçamento Excel</div><div class="card"><h3 style="margin:0 0 6px">Modelo oficial v32</h3><div class="meta"><span>Somente QTDE. e valores unitários ficam editáveis.</span><span>As demais células/abas saem protegidas.</span><span>QTDE. = 0 oculta o serviço no aplicativo após a importação.</span></div><div class="actions"><button class="btn alt" onclick="exportBudgetExcelV27()">Exportar orçamento</button><button class="btn" onclick="chooseBudgetExcelV27()">Importar orçamento</button></div><input id="budgetImportFileV27" type="file" accept=".xlsx" style="display:none" onchange="readBudgetExcelV27(this)">${meta?`<div class="meta" style="margin-top:10px"><span>Última importação: ${esc(meta.fileName||'arquivo')} · ${esc(new Date(meta.at).toLocaleString('pt-BR'))}</span></div>`:''}</div><div class="section-title">Conta e sincronização</div><div class="card"><p>Os dados são sincronizados no Firestore e mantidos também neste aparelho para uso offline.</p><button class="btn alt" onclick="logoutFirebase()">Sair da conta</button></div>`;
  };
  try{renderSettings()}catch(e){console.error(e)}
  window.__budgetIOV27=true;
})();