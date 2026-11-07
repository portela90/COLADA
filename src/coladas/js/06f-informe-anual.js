/* ---------- Informe del año (auditoría de fin de año) ----------
   Un Excel con todo el año: resumen de los 12 meses por nave y aleación, todos los camiones (proveedor, pedido,
   albarán, dónde se descargó, kilos de albarán y báscula, precio e importe), consumo de cada mes, ajustes con su
   motivo y el estado de cada mes (cerrado, enviado, comparado con la fábrica). */
let anoInf=null;
function mesesDelAno(y){const out=[];for(let i=1;i<=12;i++){const m=y+"-"+String(i).padStart(2,"0");if((meses[m]||[]).some(r=>!r.h))out.push(m);}return out;}
async function excelAnual(y){const X=await cargarExcelJS(),wb=new X.Workbook(),MS=mesesDelAno(y);
  const GRIS={type:"pattern",pattern:"solid",fgColor:{argb:"FFE7E6E6"}},b={style:"thin",color:{argb:"FFBFBFBF"}},borde={top:b,bottom:b,left:b,right:b};
  const cab=row=>row.eachCell(c=>{c.font={bold:true};c.fill=GRIS;c.border=borde;c.alignment={vertical:"middle",horizontal:"center",wrapText:true};});
  const nums=(row,desde,fmtN)=>row.eachCell((c,i)=>{c.border=borde;if(i>=desde&&typeof c.value==="number")c.numFmt=fmtN||"#,##0";});
  const f=s=>s?s.split("-").reverse().join("/"):"";const r0=v=>Math.round(v||0);
  const I=MS.map(informeMes);
  /* 1 · resumen */
  const ws=wb.addWorksheet("Resumen del año");
  ws.addRow(["Aluminio · año "+y]).font={bold:true,size:14};
  ws.addRow(["Kilos por mes, nave y aleación. Inicio + entradas − consumo ± ajustes = final. Sacado de la app Coladas el "+f(hoy())+"."]);ws.addRow([]);
  cab(ws.addRow(["Mes","Nave","Aleación","Inicio","Entradas","Consumo","Ajustes","Final","Cuadra","Mes cerrado"]));
  const tot={};
  I.forEach(x=>{const C=(cfg.candado||{})[x.m];x.filas.forEach(z=>{const con=(z.conTot||z.con).kg;
    const row=ws.addRow([Mayus(nomMes(x.m)),z.nave,MAT[z.mat].nom,r0(z.ini.kg),r0(z.ent.kg),r0(con),r0(z.aju.kg),r0(z.fin.kg),z.cua.ok?"Sí":"No",C?"Sí, "+f(C.ts.slice(0,10)):"No"]);nums(row,4);
    const k=key(z.nave,z.mat),t=tot[k]=tot[k]||{n:z.nave,m:z.mat,ent:0,con:0,aju:0};t.ent+=z.ent.kg;t.con+=con;t.aju+=z.aju.kg;});});
  ws.addRow([]);cab(ws.addRow(["Total del año","Nave","Aleación","","Entradas","Consumo","Ajustes","",""]));
  Object.values(tot).forEach(t=>{const row=ws.addRow(["",t.n,MAT[t.m].nom,"",r0(t.ent),r0(t.con),r0(t.aju),"",""]);nums(row,4);row.font={bold:true};});
  [16,10,10,13,13,13,12,13,9,16].forEach((w,i)=>ws.getColumn(i+1).width=w);ws.views=[{state:"frozen",ySplit:4}];
  /* 2 · camiones */
  const wc=wb.addWorksheet("Camiones");
  cab(wc.addRow(["Fecha","Proveedor","Nº pedido","Colada","Albarán","Nave","Aleación","Descargado en","Fardos","Kg albarán","Kg báscula","Diferencia","€/kg","Importe €","Foto del albarán"]));
  I.forEach(x=>x.entradas.filter(e=>!e.h).sort((a,c)=>a.r.f.localeCompare(c.r.f)).forEach(e=>{const p=e.r.p||e.l.proveedor||"",kb=typeof e.r.kb==="number"?e.r.kb:null;
    const row=wc.addRow([f(e.r.f),p,(typeof pedidoDe==="function"?pedidoDe(x.m,p):"")||"",e.l.nombre||"",e.r.a||e.l.albaran||(e.r.sa?"sin albarán":""),e.l.nave||"",MAT[e.l.material]?MAT[e.l.material].nom:"",
      dondeEn(e.l,e.r.f)==="externo"?"Almacén externo":"Nave",r0(e.fa),r0(e.kg),kb==null?"":r0(kb),kb==null?"":r0(kb-e.kg),e.precio?Math.round(e.precio*10)/10000:"",e.precio?Math.round(e.importe*100)/100:"",e.r.ft?"Sí":"No"]);
    nums(row,9);row.getCell(13).numFmt="0.0000";row.getCell(14).numFmt="#,##0.00";}));
  [11,14,12,22,14,8,9,15,8,12,12,11,9,13,10].forEach((w,i)=>wc.getColumn(i+1).width=w);wc.views=[{state:"frozen",ySplit:1}];wc.autoFilter={from:"A1",to:"O1"};
  /* 3 · por proveedor y mes */
  const wp=wb.addWorksheet("Por proveedor");
  cab(wp.addRow(["Mes","Proveedor","Nº pedido","Camiones","Fardos","Kg","€/kg medio","Importe €"]));
  I.forEach(x=>{const P={};x.entradas.filter(e=>!e.h).forEach(e=>{const p=e.r.p||e.l.proveedor||"Sin proveedor",o=P[p]=P[p]||{n:0,fa:0,kg:0,eur:0};o.n++;o.fa+=e.fa;o.kg+=e.kg;o.eur+=e.importe||0;});
    Object.entries(P).sort((a,c)=>c[1].kg-a[1].kg).forEach(([p,o])=>{const row=wp.addRow([Mayus(nomMes(x.m)),p,(typeof pedidoDe==="function"?pedidoDe(x.m,p):"")||"",o.n,r0(o.fa),r0(o.kg),o.kg?Math.round(o.eur/o.kg*10000)/10000:"",Math.round(o.eur*100)/100]);nums(row,4);row.getCell(7).numFmt="0.0000";row.getCell(8).numFmt="#,##0.00";});});
  [16,16,12,10,9,12,11,14].forEach((w,i)=>wp.getColumn(i+1).width=w);
  /* 4 · ajustes */
  const wa=wb.addWorksheet("Ajustes");
  cab(wa.addRow(["Fecha","Colada","Nave","Aleación","Fardos","Kg","Motivo","Nota"]));
  I.forEach(x=>{const Sf=conCorte(x.dn,saldos);todosMovs().filter(r=>r.t==="A"&&!r.h&&r.f>=x.d1&&r.f<=x.dn).sort((a,c)=>a.f.localeCompare(c.f)).forEach(r=>{const l=lotes.find(z=>z.id===(r.o||r.d))||{},sg=r.d?1:-1;
    const row=wa.addRow([f(r.f),l.nombre||"",l.nave||"",MAT[l.material]?MAT[l.material].nom:"",sg*Math.abs(r.fa||0),sg*r0(Math.abs(kgAp(r,Sf)||0)),(typeof AJ_MOT!=="undefined"?AJ_MOT[r.mot||"sin"]:"")||"Sin motivo",r.n||""]);nums(row,5);});});
  [11,22,8,9,8,10,30,44].forEach((w,i)=>wa.getColumn(i+1).width=w);
  /* 5 · estado de cada mes */
  const we=wb.addWorksheet("Cierres");
  cab(we.addRow(["Mes","Cerrado","Cerrado por","Enviado","Cifras de la fábrica","Línea","Final app (kg)","Final fábrica (kg)","Diferencia"]));
  I.forEach(x=>{const C=(cfg.candado||{})[x.m],E=(cfg.cierres||{})[x.m]||{},F=(cfg.fab||{})[x.m]||{};
    const filas=x.filas.length?x.filas:[null];filas.forEach((z,i)=>{const fb=z?F[key(z.nave,z.mat)]:null;
      const row=we.addRow([i?"":Mayus(nomMes(x.m)),i?"":(C?f(C.ts.slice(0,10)):"No"),i?"":(C&&C.por)||"",i?"":(E.enviado?f(E.enviado.slice(0,10)):"No"),i?"":(Object.keys(F).length?"Sí":"No"),
        z?z.nave+" "+MAT[z.mat].nom:"",z?r0(z.fin.kg):"",fb&&fb.fin!=null?r0(fb.fin):"",z&&fb&&fb.fin!=null?r0(z.fin.kg-fb.fin):""]);nums(row,7);});});
  [16,12,14,12,12,16,14,16,12].forEach((w,i)=>we.getColumn(i+1).width=w);
  return await wb.xlsx.writeBuffer();}
function vInformeAnual(){const anos=[...new Set(Object.keys(meses).filter(m=>(meses[m]||[]).some(r=>!r.h)).map(m=>m.slice(0,4)))].sort().reverse();if(!anos.length)return null;
  if(!anoInf||!anos.includes(anoInf))anoInf=anos[0];const MS=mesesDelAno(anoInf),act=mesDe(hoy()),pas=MS.filter(m=>m<act),cerr=pas.filter(m=>(cfg.candado||{})[m]).length;
  const bajar=async e=>{const b=e.currentTarget;b.disabled=true;const t0=b.textContent;b.textContent="Preparando…";
    try{const dl=await claude.use("downloads");if(!dl){toast("La descarga no está disponible aquí");return;}
      await dl.save({filename:"colada-ano-"+anoInf+".xlsx",data:await excelAnual(anoInf)});toast("Informe de "+anoInf+" descargado");}
    catch(err){if(!(err&&err.code==="declined"))toast("No se pudo generar el informe");}finally{b.disabled=false;b.textContent=t0;}};
  return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Informe del año"}),el("span",{class:"der sub",text:MS.length+(MS.length===1?" mes":" meses")+" · "+cerr+(cerr===1?" cerrado":" cerrados")})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[
      el("label",{text:"Año"},[el("select",{id:"inf-ano",onchange:e=>{anoInf=e.target.value;render();}},anos.map(a=>{const o=el("option",{value:a,text:a});if(a===anoInf)o.selected=true;return o;}))]),
      el("p",{class:"hint",style:"margin:0",text:"Para la auditoría: un Excel con el resumen de cada mes por nave y aleación, todos los camiones (proveedor, pedido, albarán, dónde se descargaron, báscula, precio e importe), las compras por proveedor, los ajustes con su motivo y el estado de cada cierre."}),
      pas.length>cerr?el("div",{class:"banner w",style:"margin:0",text:(pas.length-cerr)+(pas.length-cerr===1?" mes sin cerrar":" meses sin cerrar")+" este año. Ciérralos con el candado antes de pasárselo al auditor."}):null,
      el("div",{class:"seg"},[el("button",{type:"button",class:"btn",id:"inf-ano-xlsx",text:"Descargar el año en Excel",onclick:bajar})])])]);}
