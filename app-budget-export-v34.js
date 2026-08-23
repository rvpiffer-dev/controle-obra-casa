// v34 - exportacao robusta do orcamento, com fallback sem dependencia do template Base64
(function(){
  let excelReadyV34=null;
  const esc=v=>String(v??'');
  function loadScriptV34(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Falha ao carregar '+src));document.head.appendChild(s)})}
  async function excelV34(){
    if(window.ExcelJS)return window.ExcelJS;
    if(!excelReadyV34)excelReadyV34=loadScriptV34('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js');
    await excelReadyV34;if(!window.ExcelJS)throw new Error('ExcelJS não carregou');return window.ExcelJS;
  }
  function downloadV34(buf,name){const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
  function servicesV34(){return (state.services||[]).slice().sort((a,b)=>String(a.code||'').localeCompare(String(b.code||''),undefined,{numeric:true}))}
  function macroCodeV34(m,i){const c=String(m?.code||'').match(/\d+/)?.[0];return c?String(Number(c)).padStart(2,'0'):String(i+1).padStart(2,'0')}
  function styleHeaderV34(r){r.font={bold:true,color:{argb:'FFFFFFFF'}};r.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF153A62'}};r.alignment={vertical:'middle',horizontal:'center'};r.height=25;r.eachCell(c=>{c.border={bottom:{style:'thin',color:{argb:'FFB9C9D8'}}}})}
  function styleMacroV34(r){r.font={bold:true,color:{argb:'FF153A62'}};r.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE9EFF5'}};r.height=22}
  function moneyFmtV34(ws,range){ws.getCell(range).numFmt='R$ #,##0.00'}
  async function buildFallbackV34(){
    const ExcelJS=await excelV34(),wb=new ExcelJS.Workbook();wb.creator='Controle da Obra';wb.created=new Date();wb.calcProperties.fullCalcOnLoad=true;wb.calcProperties.forceFullCalc=true;wb.calcProperties.calcMode='auto';
    const ws=wb.addWorksheet('ORÇAMENTO',{views:[{state:'frozen',ySplit:3,xSplit:0}]});
    ws.mergeCells('A1:L1');ws.getCell('A1').value='ORÇAMENTO DA OBRA - CASA RAMON E TALITA';ws.getCell('A1').font={bold:true,size:16,color:{argb:'FFFFFFFF'}};ws.getCell('A1').fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF153A62'}};ws.getCell('A1').alignment={horizontal:'center',vertical:'middle'};ws.getRow(1).height=30;
    ws.mergeCells('A2:L2');ws.getCell('A2').value='Edite somente QTDE. e valores unitários. As demais células estão protegidas.';ws.getCell('A2').font={italic:true,color:{argb:'FF667380'}};ws.getCell('A2').alignment={horizontal:'center'};
    const hdr=['ETAPA','CÓDIGO','SERVIÇO','UN.','QTDE.','MATERIAIS','MÃO DE OBRA','EQUIP./OUTROS','TOTAL MAT.','TOTAL M.O.','TOTAL E/O','TOTAL'];ws.addRow(hdr);styleHeaderV34(ws.getRow(3));
    const widths=[12,12,58,10,13,16,16,17,17,17,17,19];widths.forEach((w,i)=>ws.getColumn(i+1).width=w);
    const ss=servicesV34(),macros=state.macros||[];let row=4;
    macros.forEach((m,mi)=>{
      const related=ss.filter(s=>String(s.macro||'')===String(m.name||''));if(!related.length)return;
      ws.mergeCells(row,1,row,11);ws.getCell(row,1).value=macroCodeV34(m,mi)+' · '+String(m.name||'');ws.getCell(row,12).value=Number(m.total)||0;styleMacroV34(ws.getRow(row));moneyFmtV34(ws,`L${row}`);row++;
      related.forEach(s=>{
        const eo=(Number(s.equipUnit)||0)+(Number(s.otherUnit)||0);const r=row;
        ws.getCell(r,1).value=macroCodeV34(m,mi);ws.getCell(r,2).value=String(s.code||'');ws.getCell(r,3).value=String(s.name||'');ws.getCell(r,4).value=String(s.unit||'');ws.getCell(r,5).value=Number(s.qty)||0;ws.getCell(r,6).value=Number(s.materialUnit)||0;ws.getCell(r,7).value=Number(s.laborUnit)||0;ws.getCell(r,8).value=eo;
        ws.getCell(r,9).value={formula:`E${r}*F${r}`};ws.getCell(r,10).value={formula:`E${r}*G${r}`};ws.getCell(r,11).value={formula:`E${r}*H${r}`};ws.getCell(r,12).value={formula:`SUM(I${r}:K${r})`};
        ['F','G','H','I','J','K','L'].forEach(c=>moneyFmtV34(ws,`${c}${r}`));ws.getCell(r,5).numFmt='#,##0.000';
        ws.getRow(r).alignment={vertical:'top'};ws.getCell(r,3).alignment={wrapText:true,vertical:'top'};row++;
      });
    });
    // Serviços cuja macro eventualmente não esteja na lista de macros
    const known=new Set(macros.map(m=>String(m.name||'')));const extra=ss.filter(s=>!known.has(String(s.macro||'')));
    if(extra.length){ws.mergeCells(row,1,row,11);ws.getCell(row,1).value='OUTROS SERVIÇOS';ws.getCell(row,12).value=extra.reduce((a,s)=>a+(Number(s.total)||0),0);styleMacroV34(ws.getRow(row));moneyFmtV34(ws,`L${row}`);row++;extra.forEach(s=>{const eo=(Number(s.equipUnit)||0)+(Number(s.otherUnit)||0),r=row;ws.getCell(r,2).value=String(s.code||'');ws.getCell(r,3).value=String(s.name||'');ws.getCell(r,4).value=String(s.unit||'');ws.getCell(r,5).value=Number(s.qty)||0;ws.getCell(r,6).value=Number(s.materialUnit)||0;ws.getCell(r,7).value=Number(s.laborUnit)||0;ws.getCell(r,8).value=eo;ws.getCell(r,9).value={formula:`E${r}*F${r}`};ws.getCell(r,10).value={formula:`E${r}*G${r}`};ws.getCell(r,11).value={formula:`E${r}*H${r}`};ws.getCell(r,12).value={formula:`SUM(I${r}:K${r})`};['F','G','H','I','J','K','L'].forEach(c=>moneyFmtV34(ws,`${c}${r}`));row++})}
    const totalRow=row;ws.mergeCells(totalRow,1,totalRow,11);ws.getCell(totalRow,1).value='TOTAL GERAL';ws.getCell(totalRow,12).value={formula:`SUM(L4:L${totalRow-1})`};ws.getRow(totalRow).font={bold:true,color:{argb:'FFFFFFFF'}};ws.getRow(totalRow).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF153A62'}};moneyFmtV34(ws,`L${totalRow}`);
    ws.autoFilter={from:'A3',to:`L${Math.max(3,totalRow-1)}`};
    ws.eachRow({includeEmpty:true},rr=>rr.eachCell({includeEmpty:true},c=>{c.protection={locked:true}}));for(let r=4;r<totalRow;r++){if(/^\d{2}\.\d{2}$/.test(String(ws.getCell(r,2).value||'')))for(const c of [5,6,7,8])ws.getCell(r,c).protection={locked:false}}
    await ws.protect('',{selectLockedCells:false,selectUnlockedCells:true,formatCells:false,formatColumns:false,formatRows:false,insertColumns:false,insertRows:false,deleteColumns:false,deleteRows:false,sort:false,autoFilter:true});
    const rs=wb.addWorksheet('RESUMO');rs.getColumn(1).width=38;rs.getColumn(2).width=20;rs.getColumn(3).width=16;rs.addRow(['RESUMO POR ETAPA','VALOR','% DO TOTAL']);styleHeaderV34(rs.getRow(1));let rr=2;macros.forEach(m=>{rs.getCell(rr,1).value=m.name;rs.getCell(rr,2).value=Number(m.total)||0;rs.getCell(rr,3).value=(Number(state.project?.budget)||0)?(Number(m.total)||0)/(Number(state.project.budget)||1):0;moneyFmtV34(rs,`B${rr}`);rs.getCell(rr,3).numFmt='0.00%';rr++});
    const abc=wb.addWorksheet('CURVA ABC');abc.columns=[{header:'Classe',key:'class',width:10},{header:'Código',key:'code',width:12},{header:'Serviço',key:'name',width:58},{header:'Etapa',key:'macro',width:30},{header:'Valor',key:'total',width:18},{header:'% do total',key:'pct',width:14},{header:'% acumulado',key:'cum',width:14}];styleHeaderV34(abc.getRow(1));(state.abc||[]).forEach(x=>abc.addRow([x.class,x.code,x.name,x.macro,Number(x.total)||0,Number(x.pct)||0,Number(x.cumPct)||0]));for(let r=2;r<=abc.rowCount;r++){moneyFmtV34(abc,`E${r}`);abc.getCell(r,6).numFmt='0.00%';abc.getCell(r,7).numFmt='0.00%'}
    return wb;
  }
  window.exportBudgetExcelV27=async function(){
    try{setSync('gerando Excel…');const wb=await buildFallbackV34();const buf=await wb.xlsx.writeBuffer();downloadV34(buf,'Orcamento_Casa_Ramon_Talita_Editavel.xlsx');setSync('sincronizado',true)}catch(e){console.error('Exportação v34',e);setSync('erro no Excel');alert('Não foi possível exportar o orçamento: '+(e.message||e))}
  };
  window.__budgetExportV34=true;
})();