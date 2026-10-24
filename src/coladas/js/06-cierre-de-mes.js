/* ---------- Cierre de mes ----------
   Stock inicial = stock al cierre del día anterior al mes (= final del mes
   anterior). Entradas, consumo y ajustes = apuntes del mes. Stock final =
   stock al cierre del último día del mes. Nada se borra. */
let cierreMes=null;
function todosMovs(){const o=[];for(const m in meses)for(const r of(meses[m]||[]))o.push(r);return o;}
const finDeMes=m=>{const d=new Date(+m.slice(0,4),+m.slice(5,7),0);return m+"-"+String(d.getDate()).padStart(2,"0");};
const diaAntes=f=>{const d=new Date(+f.slice(0,4),+f.slice(5,7)-1,+f.slice(8,10)-1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
/* dónde estaba un lote en una fecha: si se subió entero del externo después, estaba en externo */
function dondeEn(l,f){if(l.donde==="nave"&&todosMovs().some(r=>r.t==="T"&&r.o===l.id&&r.d===l.id&&r.f>f))return"externo";return l.donde;}
function informeMes(m){
  const d1=m+"-01",dn=finDeMes(m),d0=diaAntes(d1);
  const Si=conCorte(d0,saldos),Sf=conCorte(dn,saldos);
  const vacio=()=>({fa:0,kg:0,faN:0,kgN:0,faE:0,kgE:0});
  const R={};NAVES.forEach(n=>Object.keys(MAT).forEach(mt=>{R[key(n,mt)]={nave:n,mat:mt,ini:vacio(),fin:vacio(),ent:{fa:0,kg:0},con:{fa:0,kg:0},aju:{fa:0,kg:0},conPrev:{fa:0,kg:0},entPrev:{fa:0,kg:0}};}));
  const suma=(o,S,f)=>lotes.forEach(l=>{const s=S[l.id],x=R[key(l.nave,l.material)];if(!s||!x)return;if(!s.fa&&!kgVis(s))return;/* colada gastada: solo quedan restos de redondeo */const t=x[o],dn2=dondeEn(l,f);
    t.fa+=s.fa;t.kg+=s.kg;if(dn2==="externo"){t.faE+=s.fa;t.kgE+=s.kg;}else{t.faN+=s.fa;t.kgN+=s.kg;}});
  suma("ini",Si,d0);suma("fin",Sf,dn);
  const lote=id=>lotes.find(x=>x.id===id);
  const ms=todosMovs().filter(r=>r.f&&r.f>=d1&&r.f<=dn);
  const entradas=[];
  ms.forEach(r=>{const l=lote(r.o||r.d),x=l?R[key(l.nave,l.material)]:(r.h&&r.nv&&r.ml?R[key(r.nv,r.ml)]:null);if(!x)return;
    const kg=Math.abs(kgAp(r,Sf)),fa=Math.abs(typeof r.fa==="number"?r.fa:0);
    if(r.t==="E"&&!r.h){x.ent.fa+=fa;x.ent.kg+=kg;entradas.push({r,l,kg,fa});}
    else if(r.t==="E"&&r.h){x.entPrev.fa+=fa;x.entPrev.kg+=kg;
      entradas.push({r,l:{nave:r.nv,material:r.ml,nombre:r.n||"",donde:"nave",proveedor:r.p||"",albaran:r.a||""},kg,fa,h:true});}
    else if(r.t==="C"&&!r.h){x.con.fa+=fa;x.con.kg+=kg;}
    else if(r.t==="C"&&r.h){x.conPrev.fa+=fa;x.conPrev.kg+=kg;}
    else if(r.t==="A"&&!r.h){const sg=r.d?1:-1;x.aju.fa+=sg*fa;x.aju.kg+=sg*kg;}});
  /* arranque de la app dentro del mes: el inicial es el inventario físico de ese día */
  const prim=todosMovs().filter(r=>!r.h&&r.f).map(r=>r.f).sort()[0]||null;
  const arranque=prim&&prim>d1&&prim<=dn?prim:null;
  /* Si además están apuntadas las entradas de antes del arranque (albaranes),
     el mes sale completo: stock a día 1 = inventario − entradas previas + consumo previo */
  const completo=!!arranque&&Object.values(R).some(x=>x.entPrev.fa||x.entPrev.kg);
  if(completo)Object.values(R).forEach(x=>{x.inv={fa:x.ini.fa,kg:x.ini.kg};x.entApp=x.ent;x.conApp=x.con;
    x.ini={fa:x.inv.fa-x.entPrev.fa+x.conPrev.fa,kg:x.inv.kg-x.entPrev.kg+x.conPrev.kg,faN:null,kgN:null,faE:null,kgE:null};
    x.ent={fa:x.entApp.fa+x.entPrev.fa,kg:x.entApp.kg+x.entPrev.kg};x.con={fa:x.conApp.fa+x.conPrev.fa,kg:x.conApp.kg+x.conPrev.kg};});
  /* cuadre: inicial + entradas − consumo ± ajustes tiene que dar el final */
  Object.values(R).forEach(x=>{const eK=x.ini.kg+x.ent.kg-x.con.kg+x.aju.kg,eF=x.ini.fa+x.ent.fa-x.con.fa+x.aju.fa;
    x.cua={kg:x.fin.kg-eK,fa:x.fin.fa-eF,ok:Math.abs(x.fin.kg-eK)<5&&Math.abs(x.fin.fa-eF)<0.5};
    x.conTot=completo?x.con:{fa:x.con.fa+x.conPrev.fa,kg:x.con.kg+x.conPrev.kg};
    if(completo&&(x.ini.fa<-0.5||x.ini.kg<-5))x.cua.ok=false;});
  const gI=conCorte(d0,granallaKg),gF=conCorte(dn,granallaKg);let gE=0,gC=0;
  let gA=0;const gN={},gAj=[],gMov=[];
  ms.forEach(r=>{if(r.t==="G"&&typeof r.kg==="number"){gMov.push(r);if(r.aj){gA+=r.kg;gAj.push(r);}else if(r.kg>0)gE+=r.kg;else{gC-=r.kg;const n=r.nv||"Sin nave";gN[n]=(gN[n]||0)-r.kg;}}});
  gMov.sort((a,b)=>(a.f||"").localeCompare(b.f||"")||TURNOS.indexOf(a.u)-TURNOS.indexOf(b.u));
  const gCua=gF-(gI+gE-gC+gA);
  const coladas=lotes.map(l=>({l,s:Sf[l.id],donde:dondeEn(l,dn)})).filter(x=>x.s&&(Math.abs(x.s.fa)>0||kgVis(x.s)))
    .sort((a,b)=>a.l.nave.localeCompare(b.l.nave)||a.l.material.localeCompare(b.l.material)||a.donde.localeCompare(b.donde)||(a.l.entrada||"").localeCompare(b.l.entrada||""));
  const filas=LINEAS.map(([n,mt])=>R[key(n,mt)]).filter(x=>x.ini.kg||x.ent.kg||x.con.kg||x.aju.kg||x.fin.kg||x.conPrev.kg||x.ini.fa||x.fin.fa);
  /* valoración: todo al precio del mes de cada aleación */
  const precio={};Object.keys(MAT).forEach(mt=>precio[mt]=precioMedio(m,mt));
  Object.values(R).forEach(x=>{const pv=precio[x.mat].v,e=o=>o.kg/1000*pv;
    x.eur={ini:e(x.ini),ent:e(x.ent),con:e(x.con),aju:e(x.aju),fin:e(x.fin),finN:x.fin.kgN/1000*pv,finE:x.fin.kgE/1000*pv};});
  entradas.forEach(x=>{const pr=precioDe(m,x.l.proveedor||x.r.p,x.l.material);x.precio=pr.v;x.importe=x.kg/1000*pr.v;});
  return{m,d1,dn,d0,R,entradas,coladas,arranque,completo,precio,todoOk:filas.every(x=>x.cua.ok)&&Math.abs(gCua)<0.01,
    gran:{ini:gI,ent:gE,con:gC,aj:gA,fin:gF,nave:gN,ajustes:gAj,movs:gMov,cua:gCua,ok:Math.abs(gCua)<0.01},filas};
}
/* cómo se llama el inicial según el caso */
const labIni=(I,largo)=>I.completo?"Stock "+dmy(I.d1):I.arranque?"Inventario "+dmy(I.arranque):"Stock inicial";
const periodo=I=>I.completo?"Del "+dmyA(I.d1)+" al "+dmyA(I.dn)+". El stock a "+dmy(I.d1)+" sale del inventario del "+dmyA(I.arranque)+" quitando las entradas y sumando el consumo del "+dmy(I.d1)+" al "+dmy(diaAntes(I.arranque))+".":
  I.arranque?"Del "+dmyA(I.arranque)+" (inventario físico de arranque de la app) al "+dmyA(I.dn):"Del "+dmyA(I.d1)+" al "+dmyA(I.dn);
const f2=n=>(Math.round((n||0)*10)/10).toLocaleString("es-ES",{minimumFractionDigits:0,maximumFractionDigits:1});
const dmyA=f=>f?f.split("-").reverse().join("/"):"";
/* texto para pegar en un correo al responsable de compras */
const opsCierre=I=>[["#","Secciones del resumen"],["alu","Aluminio por nave"],["val","Valoración en €"],["gran","Granalla de cobre"],["cua","Comprobación de cuadre"],
  ["#","Naves"]].concat([...new Set(I.filas.map(x=>x.nave))].map(n=>["nv:"+n,n])).concat([["#","Hojas del Excel (el Resumen va siempre)"],["h:Coladas a fin de mes","Coladas a fin de mes"],["h:Entradas del mes","Entradas del mes"],["h:Movimientos","Movimientos"],["h:Granalla de cobre","Granalla de cobre"]]);
/* ---------- elegir qué incluir en un informe (se recuerda en este dispositivo, por informe) ---------- */
function incluirSel(id,ops){let g={};const s={};ops.forEach(o=>{if(o[0]==="#")return;s[o[0]]=o[0] in g?!!g[o[0]]:o[2]!==false;});return s;}
function incluirChips(id,ops,onch,titulo){return{node:document.createElement("span"),sel:incluirSel(id,ops)};const s=incluirSel(id,ops);const box=document.createElement("div");box.className="inc";
  const lab=document.createElement("div");lab.className="inc-t";lab.textContent=titulo||"Qué incluir (toca para quitar o poner):";box.appendChild(lab);
  let row=null;const fila=()=>{row=document.createElement("div");row.className="inc-r";box.appendChild(row);};fila();
  ops.forEach(o=>{if(o[0]==="#"){const g=document.createElement("div");g.className="inc-g";g.textContent=o[1];box.appendChild(g);fila();return;}
    const b=document.createElement("button");b.type="button";b.className="chip";b.textContent=o[1];b.setAttribute("aria-pressed",String(s[o[0]]));
    b.onclick=()=>{s[o[0]]=!s[o[0]];b.setAttribute("aria-pressed",String(s[o[0]]));let g={};try{g=JSON.parse(localStorage.getItem("inf."+id)||"{}");}catch(e){}g[o[0]]=s[o[0]];try{localStorage.setItem("inf."+id,JSON.stringify(g));}catch(e){}if(onch)onch(s);};row.appendChild(b);});
  return{node:box,sel:s};}
function textoCierre(I,s){s=s||incluirSel("cierre",opsCierre(I));const FI=I.filas.filter(x=>s["nv:"+x.nave]!==false);
  const L=[],sg=v=>(v>0?"+":v<0?"−":"")+fmt(Math.abs(v)),tit=Mayus(nomMes(I.m));
  L.push("CIERRE DE COLADA · "+tit.toUpperCase());
  L.push(periodo(I));
  if(s.alu){L.push("");L.push("ALUMINIO");
  FI.forEach(x=>{L.push(x.nave+" · "+MAT[x.mat].nom+" ("+x.mat+")");
    L.push("  "+labIni(I)+": "+fmt(x.ini.fa)+" f · "+fmt(x.ini.kg)+" kg");
    L.push("  Entradas: "+fmt(x.ent.fa)+" f · "+fmt(x.ent.kg)+" kg");
    L.push("  Consumo: "+fmt(x.con.fa)+" f · "+fmt(x.con.kg)+" kg");
    if(Math.round(x.aju.fa)||Math.round(x.aju.kg))L.push("  Ajustes por recuento: "+sg(x.aju.fa)+" f · "+sg(x.aju.kg)+" kg");
    L.push("  Stock final: "+fmt(x.fin.fa)+" f · "+fmt(x.fin.kg)+" kg (nave "+fmt(x.fin.faN)+" f · externo "+fmt(x.fin.faE)+" f)");
    if(x.conPrev.kg>0&&!I.completo)L.push("  Consumo total del mes (con el anterior al arranque): "+fmt(x.conTot.fa)+" f · "+fmt(x.conTot.kg)+" kg");
    if(!x.cua.ok)L.push("  ¡No cuadra! Diferencia "+sg(x.cua.fa)+" f · "+sg(x.cua.kg)+" kg");});}
  if(s.val){L.push("");L.push("VALORACIÓN (al precio del mes)");
  Object.keys(MAT).forEach(mt=>{const fs=FI.filter(x=>x.mat===mt);if(!fs.length)return;const pv=I.precio[mt].v;
    L.push(MAT[mt].nom+(pv?" a "+eurT(pv)+" €/t":" (sin precio)"));
    const sm=k=>fs.reduce((a,x)=>a+x.eur[k],0);
    fs.forEach(x=>L.push("  "+x.nave+": consumo "+eur(x.eur.con)+" · stock final "+eur(x.eur.fin)));
    if(fs.length>1)L.push("  Total "+MAT[mt].nom+": consumo "+eur(sm("con"))+" · stock final "+eur(sm("fin")));});}
  const g=I.gran;if(s.gran){L.push("");L.push("GRANALLA DE COBRE");
  L.push("  "+(I.arranque?"Inicial (arranque)":"Inicial")+": "+f2(g.ini)+" kg");
  L.push("  Entradas: "+f2(g.ent)+" kg");
  L.push("  Consumo: "+f2(g.con)+" kg"+(Object.keys(g.nave).length?" ("+Object.keys(g.nave).sort().map(n=>n+" "+f2(g.nave[n])).join(" · ")+")":""));
  if(Math.abs(g.aj)>=0.05)L.push("  Ajustes por recuento: "+(g.aj>0?"+":"−")+f2(Math.abs(g.aj))+" kg");
  L.push("  Final: "+f2(g.fin)+" kg");
  if(!g.ok)L.push("  ¡No cuadra! Diferencia "+f2(g.cua)+" kg");}
  if(s.cua){L.push("");L.push(I.todoOk?"Todo cuadra: inicial + entradas − consumo ± ajustes = final.":"Hay líneas que no cuadran: revisar antes de enviar.");}
  return L.join("\n");
}
const Mayus=t=>t.charAt(0).toUpperCase()+t.slice(1);
function cargarExcelJS(){
  if(window.ExcelJS)return Promise.resolve(window.ExcelJS);
  return new Promise((res,rej)=>{const sc=document.createElement("script");
    sc.src="https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
    sc.onload=()=>window.ExcelJS?res(window.ExcelJS):rej(new Error("sin ExcelJS"));sc.onerror=()=>rej(new Error("no carga"));document.head.appendChild(sc);});
}
async function excelCierre(I,s){s=s||incluirSel("cierre",opsCierre(I));
  const X=await cargarExcelJS(),wb=new X.Workbook(),tit=Mayus(nomMes(I.m));
  const VERDE={type:"pattern",pattern:"solid",fgColor:{argb:"FFC6EFCE"}},VTX={color:{argb:"FF006100"}};
  const GRIS={type:"pattern",pattern:"solid",fgColor:{argb:"FFE7E6E6"}};
  const borde={top:{style:"thin",color:{argb:"FFBFBFBF"}},bottom:{style:"thin",color:{argb:"FFBFBFBF"}},left:{style:"thin",color:{argb:"FFBFBFBF"}},right:{style:"thin",color:{argb:"FFBFBFBF"}}};
  const cab=(row)=>{row.eachCell(c=>{c.font={bold:true};c.fill=GRIS;c.border=borde;c.alignment={vertical:"middle",horizontal:"center",wrapText:true};});};
  const nums=(row,desde)=>{row.eachCell((c,i)=>{c.border=borde;if(i>=desde)c.numFmt="#,##0";});};
  const r0=v=>Math.round(v||0);
  /* Resumen */
  const ws=wb.addWorksheet("Resumen");
  ws.addRow(["Cierre de "+tit]).font={bold:true,size:14};
  ws.addRow([periodo(I)]);
  ws.addRow([]);
  const tA=ws.addRow(["ALUMINIO"]);tA.font={bold:true,size:12};
  const ROJO={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFC7CE"}},RTX={color:{argb:"FF9C0006"},bold:true};
  const h1=ws.addRow(["Nave","Aleación",labIni(I),"","Entradas","","Consumo","","Ajustes","","Final en nave","","Final en externo","","Stock final","","Cuadre"]);
  const h2=ws.addRow(["","","Fardos","Kg","Fardos","Kg","Fardos","Kg","Fardos","Kg","Fardos","Kg","Fardos","Kg","Fardos","Kg",""]);
  [3,5,7,9,11,13,15].forEach(c=>ws.mergeCells(h1.number,c,h1.number,c+1));[1,2,17].forEach(c=>ws.mergeCells(h1.number,c,h2.number,c));
  cab(h1);cab(h2);
  const txtCua=x=>x.cua.ok?"✓ Cuadra":"No cuadra: "+(x.cua.fa>0?"+":"")+Math.round(x.cua.fa)+" f / "+(x.cua.kg>0?"+":"")+fmt(x.cua.kg)+" kg";
  const linea=(a,b,x,neg)=>{const row=ws.addRow([a,b,r0(x.ini.fa),r0(x.ini.kg),r0(x.ent.fa),r0(x.ent.kg),r0(x.con.fa),r0(x.con.kg),r0(x.aju.fa),r0(x.aju.kg),r0(x.fin.faN),r0(x.fin.kgN),r0(x.fin.faE),r0(x.fin.kgE),r0(x.fin.fa),r0(x.fin.kg),txtCua(x)]);
    nums(row,3);[13,14].forEach(c=>{const k=row.getCell(c);k.fill=VERDE;k.font=Object.assign({},VTX,neg?{bold:true}:{});});if(neg)row.eachCell(c=>{c.font=Object.assign({},c.font||{},{bold:true});});
    const q=row.getCell(17);q.numFmt="@";if(x.cua.ok)q.font={color:{argb:"FF006100"},bold:!!neg};else{q.fill=ROJO;q.font=RTX;}return row;};
  const acum=list=>{const z={ini:{fa:0,kg:0},ent:{fa:0,kg:0},con:{fa:0,kg:0},aju:{fa:0,kg:0},fin:{fa:0,kg:0,faN:0,kgN:0,faE:0,kgE:0},cua:{fa:0,kg:0,ok:true}};
    list.forEach(x=>{["ini","ent","con","aju","fin"].forEach(g=>{for(const k in z[g])z[g][k]+=x[g][k]||0;});z.cua.fa+=x.cua.fa;z.cua.kg+=x.cua.kg;z.cua.ok=z.cua.ok&&x.cua.ok;});return z;};
  I.filas.forEach(x=>linea(x.nave,MAT[x.mat].nom+" ("+x.mat+")",x));
  Object.keys(MAT).forEach(mt=>{const fs=I.filas.filter(x=>x.mat===mt);if(!fs.length)return;
    const t=linea("Total "+MAT[mt].nom,fs.map(x=>x.nave).join(" + "),acum(fs),true);t.eachCell((c,i)=>{if(i<17&&(!c.fill||c.fill.fgColor.argb!=="FFC6EFCE"))c.fill=GRIS;});});
  ws.addRow(["","Cuadre = inventario/stock inicial + entradas − consumo ± ajustes tiene que dar el stock final."]).font={italic:true,color:{argb:"FF595959"}};
  /* consumo del mes completo cuando la app arrancó a mitad de mes */
  const prev=I.filas.reduce((a,x)=>a+x.conPrev.kg,0);
  if(I.completo){ws.addRow([]);
    const tp=ws.addRow(["CÓMO SALE EL STOCK A "+dmy(I.d1)]);tp.font={bold:true,size:12};
    const hA=dmy(diaAntes(I.arranque));
    const p1=ws.addRow(["Nave","Aleación","Inventario "+dmy(I.arranque),"","− Entradas "+dmy(I.d1)+"–"+hA,"","+ Consumo "+dmy(I.d1)+"–"+hA,"","= Stock "+dmy(I.d1),""]);
    const p2=ws.addRow(["","","Fardos","Kg","Fardos","Kg","Fardos","Kg","Fardos","Kg"]);[3,5,7,9].forEach(c=>ws.mergeCells(p1.number,c,p1.number,c+1));[1,2].forEach(c=>ws.mergeCells(p1.number,c,p2.number,c));cab(p1);cab(p2);
    const vv=x=>[x.inv.fa,x.inv.kg,x.entPrev.fa,x.entPrev.kg,x.conPrev.fa,x.conPrev.kg,x.ini.fa,x.ini.kg];
    I.filas.forEach(x=>nums(ws.addRow([x.nave,MAT[x.mat].nom+" ("+x.mat+")"].concat(vv(x).map(r0))),3));
    Object.keys(MAT).forEach(mt=>{const fs=I.filas.filter(x=>x.mat===mt);if(!fs.length)return;const s=[0,0,0,0,0,0,0,0];fs.forEach(x=>vv(x).forEach((y,i)=>s[i]+=y));
      const ts=ws.addRow(["Total "+MAT[mt].nom,fs.map(x=>x.nave).join(" + ")].concat(s.map(r0)));nums(ts,3);ts.eachCell(c=>{c.font={bold:true};c.fill=GRIS;});});
    ws.addRow(["","Las entradas del "+dmy(I.d1)+" al "+hA+" son las de los albaranes (hoja «Entradas del mes»); el consumo, el que se apuntó en el Excel antes de la app."]).font={italic:true,color:{argb:"FF595959"}};}
  else if(prev>0){ws.addRow([]);
    const tp=ws.addRow(["CONSUMO TOTAL DEL MES (incluye lo anterior al arranque)"]);tp.font={bold:true,size:12};
    const p1=ws.addRow(["Nave","Aleación","Antes del arranque","","Con la app","","Total del mes",""]);
    const p2=ws.addRow(["","","Fardos","Kg","Fardos","Kg","Fardos","Kg"]);[3,5,7].forEach(c=>ws.mergeCells(p1.number,c,p1.number,c+1));[1,2].forEach(c=>ws.mergeCells(p1.number,c,p2.number,c));cab(p1);cab(p2);
    const vv=x=>[x.conPrev.fa,x.conPrev.kg,x.con.fa,x.con.kg,x.conTot.fa,x.conTot.kg];
    I.filas.forEach(x=>nums(ws.addRow([x.nave,MAT[x.mat].nom+" ("+x.mat+")"].concat(vv(x).map(r0))),3));
    Object.keys(MAT).forEach(mt=>{const fs=I.filas.filter(x=>x.mat===mt);if(!fs.length)return;const s=[0,0,0,0,0,0];fs.forEach(x=>vv(x).forEach((y,i)=>s[i]+=y));
      const ts=ws.addRow(["Total "+MAT[mt].nom,fs.map(x=>x.nave).join(" + ")].concat(s.map(r0)));nums(ts,3);ts.eachCell(c=>{c.font={bold:true};c.fill=GRIS;});});
    ws.addRow(["","El consumo anterior al arranque ya estaba descontado en el inventario; va aparte para que el cuadre no lo cuente dos veces."]).font={italic:true,color:{argb:"FF595959"}};}
  /* valoración */
  ws.addRow([]);
  const tV=ws.addRow(["VALORACIÓN (todo al precio del mes)"]);tV.font={bold:true,size:12};
  ws.addRow(["",Object.keys(MAT).filter(mt=>I.filas.some(x=>x.mat===mt)).map(mt=>MAT[mt].nom+": "+(I.precio[mt].v?eurT(I.precio[mt].v)+" €/t":"SIN PRECIO")+(I.precio[mt].fuente==="entradas"?" (media de las entradas del mes)":I.precio[mt].fuente==="tarifa"?" (media de la tarifa)":"")).join("   ·   ")]).font={italic:true};
  const hv=ws.addRow(["Nave","Aleación",labIni(I)+" (€)","Entradas (€)","Consumo (€)","Ajustes (€)","Final en nave (€)","Final en externo (€)","Stock final (€)"]);cab(hv);
  const EURF='#,##0.00 "€"';
  const lval=(a,b,v,neg)=>{const row=ws.addRow([a,b,v.ini,v.ent,v.con,v.aju,v.finN,v.finE,v.fin].map(z=>typeof z==="number"?Math.round(z*100)/100:z));
    row.eachCell((c,i)=>{c.border=borde;if(i>=3)c.numFmt=EURF;if(neg){c.font={bold:true};c.fill=GRIS;}});row.getCell(8).fill=VERDE;row.getCell(8).font=Object.assign({},VTX,neg?{bold:true}:{});};
  Object.keys(MAT).forEach(mt=>{const fs=I.filas.filter(x=>x.mat===mt);if(!fs.length)return;
    fs.forEach(x=>lval(x.nave,MAT[x.mat].nom+" ("+x.mat+")",x.eur));
    const z={};["ini","ent","con","aju","finN","finE","fin"].forEach(k=>z[k]=fs.reduce((a,x)=>a+x.eur[k],0));
    lval("Total "+MAT[mt].nom,fs.map(x=>x.nave).join(" + "),z,true);});
  /* granalla de cobre */
  ws.addRow([]);
  const tG=ws.addRow(["GRANALLA DE COBRE"]);tG.font={bold:true,size:12};
  const G=I.gran,COB={type:"pattern",pattern:"solid",fgColor:{argb:"FFFCE4D6"}};
  const gl=(t,v,neg)=>{const row=ws.addRow([t,"",v==null?"":Math.round(v*10)/10]);ws.mergeCells(row.number,1,row.number,2);
    row.getCell(3).numFmt="#,##0.0 \"kg\"";[1,2,3].forEach(i=>{row.getCell(i).border=borde;});if(neg)row.eachCell(c=>{c.font={bold:true};c.fill=COB;});return row;};
  gl(I.arranque?"Inicial (arranque)":"Stock inicial",G.ini,true);
  gl("+ Entradas",G.ent);
  const nv=Object.keys(G.nave).sort();
  gl("− Consumo"+(nv.length>1?" total":""),G.con);
  if(nv.length>1)nv.forEach(n=>gl("      "+n,G.nave[n]));else if(nv.length)ws.getRow(ws.rowCount).getCell(1).value="− Consumo ("+nv[0]+")";
  gl("± Ajustes por recuento",G.aj);
  gl("Stock final",G.fin,true);
  const gq=ws.addRow(["Cuadre","",G.ok?"✓ Cuadra":"No cuadra: "+f2(G.cua)+" kg"]);ws.mergeCells(gq.number,1,gq.number,2);gq.getCell(1).font={bold:true};
  if(G.ok)gq.getCell(3).font={color:{argb:"FF006100"},bold:true};else{gq.getCell(3).fill=ROJO;gq.getCell(3).font=RTX;}
  if(G.ajustes.length){ws.addRow([]);ws.addRow(["Ajustes de granalla del mes:"]).font={bold:true};
    G.ajustes.forEach(r=>{const row=ws.addRow([dmyA(r.f),"",Math.round(r.kg*10)/10,r.n||""]);row.getCell(3).numFmt="+#,##0.0 \"kg\";−#,##0.0 \"kg\"";});}
  ws.addRow([]);const lg=ws.addRow(["","Verde = material en almacén externo"]);lg.getCell(2).fill=VERDE;lg.getCell(2).font=VTX;
  ws.getColumn(1).width=22;ws.getColumn(2).width=22;for(let c=3;c<=16;c++)ws.getColumn(c).width=11;ws.getColumn(17).width=26;
  ws.views=[{state:"frozen",ySplit:6,xSplit:2}];
  /* bloques por nave y aleación (nunca se suman aleaciones distintas) y
     al final el total de cada aleación con las dos naves juntas */
  const AZUL={type:"pattern",pattern:"solid",fgColor:{argb:"FFDDEBF7"}};
  const nomAl=mt=>MAT[mt]?MAT[mt].nom+(mt==="L-2521-B"?" azul":"")+" ("+mt+")":mt;
  const porBloques=(wx,items,ncol,colFa,fila)=>{
    const tot={};
    LINEAS.forEach(([n,mt])=>{const its=items.filter(x=>x.l.nave===n&&x.l.material===mt);if(!its.length)return;
      const tt=wx.addRow([n.toUpperCase()+" · "+nomAl(mt)]);tt.font={bold:true,size:12};if(mt==="L-2521-B")tt.getCell(1).fill=AZUL;
      let f=0,k=0,eu=null;its.forEach(x=>{const r=fila(x);f+=r.fa;k+=r.kg;if(r.eur!=null)eu=(eu||0)+r.eur;});
      const v=new Array(ncol).fill("");v[0]="Total "+n+" · "+MAT[mt].nom;v[colFa-1]=r0(f);v[colFa]=r0(k);if(eu!=null)v[ncol-1]=Math.round(eu*100)/100;
      const st=wx.addRow(v);nums(st,colFa);if(eu!=null)st.getCell(ncol).numFmt='#,##0.00 "€"';st.eachCell(c=>{c.font={bold:true};c.fill=GRIS;});wx.addRow([]);
      tot[mt]=tot[mt]||{fa:0,kg:0,n:[],eur:null};tot[mt].fa+=f;tot[mt].kg+=k;if(eu!=null)tot[mt].eur=(tot[mt].eur||0)+eu;tot[mt].n.push(n);});
    const ta=wx.addRow(["TOTAL POR ALEACIÓN (las dos naves)"]);ta.font={bold:true,size:12};
    const hv=new Array(ncol).fill("");hv[0]="Aleación";hv[1]="Naves";hv[colFa-1]="Fardos";hv[colFa]="Kg";if(ncol>colFa+1)hv[ncol-1]="Importe";cab(wx.addRow(hv));
    Object.keys(MAT).forEach(mt=>{const t=tot[mt];if(!t)return;const v=new Array(ncol).fill("");v[0]=nomAl(mt);v[1]=t.n.join(" + ");v[colFa-1]=r0(t.fa);v[colFa]=r0(t.kg);if(t.eur!=null)v[ncol-1]=Math.round(t.eur*100)/100;
      const row=wx.addRow(v);nums(row,colFa);if(t.eur!=null)row.getCell(ncol).numFmt='#,##0.00 "€"';row.eachCell(c=>{c.font={bold:true};});if(mt==="L-2521-B")row.getCell(1).fill=AZUL;});
    return tot;};
  /* Coladas */
  const wc=wb.addWorksheet("Coladas a fin de mes");
  wc.addRow(["Inventario de coladas a "+I.dn.split("-").reverse().join("/")]).font={bold:true,size:14};
  const lv=wc.addRow(["Verde = en almacén externo"]);lv.getCell(1).fill=VERDE;lv.getCell(1).font=VTX;wc.addRow([]);
  cab(wc.addRow(["Colada","Ubicación","Proveedor","Albarán","Fecha entrada","Fardos","Kg"]));
  porBloques(wc,I.coladas,7,6,({l,s,donde})=>{
    const row=wc.addRow([l.nombre,donde==="externo"?"Externo":"Nave",l.proveedor||"",l.albaran||"",l.entrada?l.entrada.split("-").reverse().join("/"):"",r0(s.fa),r0(s.kg)]);
    nums(row,6);if(donde==="externo")row.eachCell(c=>{c.fill=VERDE;c.font=VTX;});return{fa:s.fa,kg:s.kg};});
  [30,11,16,14,13,10,12].forEach((w,i)=>wc.getColumn(i+1).width=w);wc.views=[{state:"frozen",ySplit:4}];
  /* Entradas */
  const we=wb.addWorksheet("Entradas del mes");
  we.addRow(["Entradas de "+tit]).font={bold:true,size:14};we.addRow([]);
  cab(we.addRow(["Fecha","Colada","Descargado en","Proveedor","Albarán","Fardos","Kg","€/t","Importe"]));
  const ents=I.entradas.slice().sort((a,b)=>a.r.f.localeCompare(b.r.f));
  if(!ents.length)we.addRow(["Sin entradas este mes"]);
  else porBloques(we,ents,9,6,({r,l,kg,fa,h,precio,importe})=>{const row=we.addRow([r.f.split("-").reverse().join("/"),l.nombre,h?(r.ext?"Externo":"Nave")+" (antes de la app)":(l.donde==="externo"?"Externo":"Nave"),l.proveedor||r.p||"",l.albaran||r.a||"",r0(fa),r0(kg),precio||"sin precio",precio?Math.round(importe*100)/100:""]);nums(row,6);
    row.getCell(8).numFmt="#,##0.00";row.getCell(9).numFmt='#,##0.00 "€"';if(!precio)row.getCell(8).font={color:{argb:"FF9C0006"}};
    if(h&&r.n2){row.getCell(2).note=r.n2;}return{fa,kg,eur:precio?importe:0};});
  [30,28,13,16,14,10,12,11,15].forEach((w,i)=>we.getColumn(i+1).width=w);we.getColumn(1).width=30;we.views=[{state:"frozen",ySplit:3}];
  /* Movimientos */
  const wm=wb.addWorksheet("Movimientos");
  const guard=filtro;filtro={desde:I.d1,hasta:I.dn,tipo:"",nave:"",mat:"",turno:"",texto:""};
  let rows;try{rows=filtrados();}finally{filtro=guard;}
  const T={C:"Consumo",E:"Entrada",A:"Ajuste",G:"Granalla de cobre",T:"Traslado"};
  cab(wm.addRow(["Fecha","Tipo","Nave","Aleación","Relevo","Colada","Fardos","Kg","Nota"]));
  rows.slice().reverse().forEach(({r,i,kg,fa})=>{const row=wm.addRow([(r.f||"").split("-").reverse().join("/"),(r.t==="G"&&r.aj?"Ajuste granalla de cobre":(T[r.t]||r.t)),i.nave,i.mat,r.u||"",i.colada,fa,Math.round(kg*100)/100,(r.h?"[anterior al inventario] ":"")+(r.n||"")]);nums(row,7);});
  [11,10,10,10,9,28,8,10,30].forEach((w,i)=>wm.getColumn(i+1).width=w);
  /* Granalla de cobre: cada apunte con el saldo que queda */
  const wg=wb.addWorksheet("Granalla de cobre");
  wg.addRow(["Granalla de cobre · "+tit]).font={bold:true,size:14};wg.addRow([]);
  cab(wg.addRow(["Fecha","Relevo","Nave","Tipo","Entrada (kg)","Consumo (kg)","Ajuste (kg)","Queda (kg)","Nota"]));
  let sal=I.gran.ini;const k1=v=>v?Math.round(v*1000)/1000:null;
  const ri=wg.addRow(["",  "", "", I.arranque?"Inicial (arranque)":"Stock inicial",null,null,null,k1(sal)||0,""]);ri.eachCell(c=>{c.font={bold:true};});
  I.gran.movs.forEach(r=>{sal+=r.kg;const row=wg.addRow([dmyA(r.f),r.u||"",r.nv||"",r.aj?"Ajuste por recuento":(r.kg>0?"Entrada":"Consumo"),!r.aj&&r.kg>0?k1(r.kg):null,!r.aj&&r.kg<0?k1(-r.kg):null,r.aj?k1(r.kg):null,Math.round(sal*1000)/1000,r.n||""]);
    row.eachCell(c=>{c.border=borde;});[5,6,7,8].forEach(i=>row.getCell(i).numFmt="#,##0.0");});
  const rt=wg.addRow(["Total","","","",k1(I.gran.ent)||0,k1(I.gran.con)||0,k1(I.gran.aj)||0,Math.round(I.gran.fin*1000)/1000,I.gran.ok?"✓ Cuadra con el stock final":"No cuadra: "+f2(I.gran.cua)+" kg"]);
  rt.eachCell(c=>{c.font={bold:true};c.fill=GRIS;c.border=borde;});[5,6,7,8].forEach(i=>rt.getCell(i).numFmt="#,##0.0");
  [11,9,9,20,13,13,12,12,50].forEach((w,i)=>wg.getColumn(i+1).width=w);wg.views=[{state:"frozen",ySplit:3}];
  wb.worksheets.slice().forEach(w=>{if(w.name!=="Resumen"&&s["h:"+w.name]===false)wb.removeWorksheet(w.id);});
  return wb.xlsx.writeBuffer();
}
/* Enviar el cierre por correo (Excel + resumen) con la función enviar-cierre de Supabase */
async function enviarCierre(m,btn){if(!window.sbColada){toast("Solo desde la aplicación web");return;}
  const t0=btn?btn.textContent:"";if(btn){btn.disabled=true;btn.textContent="Preparando el Excel…";}
  try{const I=informeMes(m),buf=await excelCierre(I);
    let bin="";const u8=new Uint8Array(buf);for(let i=0;i<u8.length;i+=0x8000)bin+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));
    if(btn)btn.textContent="Enviando…";
    const r=await window.sbColada.functions.invoke("enviar-cierre",{body:{asunto:"Cierre de colada · "+Mayus(nomMes(m)),texto:textoCierre(I),filename:"cierre-colada-"+m+".xlsx",excel:btoa(bin)}});
    let err=r.error?(r.error.message||"error"):null;if(r.error&&r.error.context&&r.error.context.json){try{const j=await r.error.context.json();err=j.error||err;}catch(e){}}
    if(err)throw new Error(err);
    cfg.cierres=Object.assign({},cfg.cierres,{[m]:{enviado:new Date().toISOString(),a:r.data&&r.data.to}});await saveCfg();
    toast("Cierre enviado a "+((r.data&&r.data.to)||"tu correo"));render();
  }catch(e){toast("No se pudo enviar: "+(e.message||e));}finally{if(btn){btn.disabled=false;btn.textContent=t0;}}}
/* aviso a partir del día 1: el cierre del mes anterior está listo y no se ha enviado */
function avisoCierre(){if(!window.sbColada)return null;const ant=diaAntes(mesDe(hoy())+"-01").slice(0,7);
  if(!Object.keys(meses).some(m=>m===ant&&(meses[m]||[]).some(r=>!r.h)))return null;
  const env=(cfg.cierres||{})[ant];if(env)return null;
  const I=informeMes(ant);
  return el("div",{class:"banner "+(I.todoOk?"":"w"),style:"display:flex;gap:10px;align-items:center;flex-wrap:wrap"},[
    el("span",{style:"flex:1;min-width:200px",text:"El cierre de "+nomMes(ant)+" está listo"+(I.todoOk?" y todo cuadra.":", pero hay descuadres: revísalo antes de enviarlo.")}),
    el("button",{type:"button",class:"btn sec peq",text:"Revisar",onclick:()=>{cierreMes=ant;tab="hist";try{localStorage.setItem("colada.tab",tab);}catch(e){}tabsUI();render();}}),
    el("button",{type:"button",class:"btn peq",text:"Enviar a mi correo",onclick:e=>enviarCierre(ant,e.currentTarget)}),
    el("button",{type:"button",class:"btn sec peq",text:"No hace falta",onclick:async()=>{cfg.cierres=Object.assign({},cfg.cierres,{[ant]:{omitido:new Date().toISOString()}});try{await saveCfg();render();}catch(e){toast("No se pudo guardar");}}})]);}
function vCierre(){
  /* solo meses con apuntes de la app: los que solo tienen histórico no tienen cierre */
  const ms=Object.keys(meses).filter(m=>(meses[m]||[]).some(r=>!r.h)).sort().reverse();
  if(!ms.length)return null;
  const act=mesDe(hoy()),prev=ms.find(m=>m<act);
  if(!cierreMes||ms.indexOf(cierreMes)<0)cierreMes=prev||ms[0];
  const I=informeMes(cierreMes);
  const sel=el("select",{id:"c-m",onchange:e=>{cierreMes=e.target.value;render();}},ms.map(m=>{const o=el("option",{value:m,text:Mayus(nomMes(m))+(m===act?" (en curso)":"")});if(m===cierreMes)o.selected=true;return o;}));
  const dual=(fa,kg,cl,sig)=>el("td",{class:"r num"+(cl?" "+cl:"")},[el("div",{style:"font-weight:600",text:(sig&&fa>0?"+":"")+fmt(fa)+" f"}),el("div",{class:"sub",text:(sig&&kg>0?"+":"")+fmt(kg)+" kg"})]);
  const cuaTd=x=>el("td",{class:"r"},[x.cua.ok?el("span",{class:"pill ok",text:"✓ cuadra"}):el("span",{class:"pill bad",title:"Diferencia",text:(x.cua.fa>0?"+":"")+Math.round(x.cua.fa)+" f / "+(x.cua.kg>0?"+":"")+fmt(x.cua.kg)+" kg"})]);
  const tabla=el("div",{class:"tw"},[el("table",{},[
    el("thead",{},[el("tr",{},[el("th",{text:"Nave y aleación"}),el("th",{class:"r",text:labIni(I)}),el("th",{class:"r",text:"Entradas"}),el("th",{class:"r",text:"Consumo"}),el("th",{class:"r",text:"Ajustes"}),el("th",{class:"r",text:"En nave"}),el("th",{class:"r ext",text:"Externo"}),el("th",{class:"r",text:"Final"}),el("th",{class:"r",text:"Cuadre"})])]),
    el("tbody",{},I.filas.map(x=>el("tr",{},[
      el("td",{},[el("span",{class:"tagm",style:"background:"+MAT[x.mat].col}),document.createTextNode(x.nave),el("div",{class:"sub",text:MAT[x.mat].nom})]),
      dual(x.ini.fa,x.ini.kg),dual(x.ent.fa,x.ent.kg),dual(x.con.fa,x.con.kg),dual(x.aju.fa,x.aju.kg,"",true),dual(x.fin.faN,x.fin.kgN),dual(x.fin.faE,x.fin.kgE,"ext"),dual(x.fin.fa,x.fin.kg),cuaTd(x)])))])]);
  const prevKg=I.filas.reduce((a,x)=>a+x.conPrev.kg,0);
  const hA=I.arranque?dmy(diaAntes(I.arranque)):"";
  const tablaPrev=I.completo?el("div",{},[el("p",{class:"hint",style:"margin:4px 0 6px",text:"Cómo sale el stock a "+dmy(I.d1)+": inventario del "+dmy(I.arranque)+", menos lo que entró del "+dmy(I.d1)+" al "+hA+" (albaranes), más lo que se gastó esos días."}),
    el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},[el("th",{text:"Nave y aleación"}),el("th",{class:"r",text:"Inventario "+dmy(I.arranque)}),el("th",{class:"r",text:"− Entradas"}),el("th",{class:"r",text:"+ Consumo"}),el("th",{class:"r",text:"= Stock "+dmy(I.d1)})])]),
      el("tbody",{},I.filas.map(x=>el("tr",{},[el("td",{},[el("span",{class:"tagm",style:"background:"+MAT[x.mat].col}),document.createTextNode(x.nave),el("div",{class:"sub",text:MAT[x.mat].nom})]),
        dual(x.inv.fa,x.inv.kg),dual(x.entPrev.fa,x.entPrev.kg),dual(x.conPrev.fa,x.conPrev.kg),dual(x.ini.fa,x.ini.kg)])))])])]):prevKg>0?el("div",{},[el("p",{class:"hint",style:"margin:4px 0 6px",text:"Consumo del mes completo: lo apuntado antes del arranque ya estaba descontado en el inventario, por eso va aparte y no entra en el cuadre."}),
    el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},[el("th",{text:"Nave y aleación"}),el("th",{class:"r",text:"Antes del arranque"}),el("th",{class:"r",text:"Con la app"}),el("th",{class:"r",text:"Total del mes"})])]),
      el("tbody",{},I.filas.map(x=>el("tr",{},[el("td",{},[el("span",{class:"tagm",style:"background:"+MAT[x.mat].col}),document.createTextNode(x.nave),el("div",{class:"sub",text:MAT[x.mat].nom})]),
        dual(x.conPrev.fa,x.conPrev.kg),dual(x.con.fa,x.con.kg),dual(x.conTot.fa,x.conTot.kg)])))])])]):null;
  /* granalla de cobre */
  const G=I.gran,gNv=Object.keys(G.nave).sort();
  const gFila=(t,v,cl,sub)=>el("tr",{class:cl||""},[el("td",{},[document.createTextNode(t),sub?el("div",{class:"sub",text:sub}):null]),el("td",{class:"r num",text:(v==null?"—":f2(v)+" kg")})]);
  const gAjSub=G.ajustes.length?G.ajustes.map(r=>dmy(r.f)+": "+(r.kg>0?"+":"−")+f2(Math.abs(r.kg))+" kg").join(" · "):null;
  const cobre=el("div",{},[
    el("h3",{style:"margin:6px 0 8px;font-size:14px;letter-spacing:.05em;text-transform:uppercase;display:flex;align-items:center;gap:8px"},[el("span",{class:"tagm",style:"background:var(--cobre)"}),document.createTextNode("Granalla de cobre")]),
    el("div",{class:"tw"},[el("table",{},[el("tbody",{},[
      gFila(I.arranque?"Inicial (arranque "+dmy(I.arranque)+")":"Stock inicial",G.ini,"",null),
      gFila("+ Entradas",G.ent),
      gFila("− Consumo",G.con,"",gNv.length?gNv.map(n=>n+": "+f2(G.nave[n])+" kg").join(" · "):null),
      gFila("± Ajustes por recuento",G.aj,"",gAjSub),
      el("tr",{},[el("td",{style:"font-weight:700",text:"Stock final"}),el("td",{class:"r num",style:"font-weight:700",text:f2(G.fin)+" kg"})]),
      el("tr",{},[el("td",{text:"Cuadre"}),el("td",{class:"r"},[G.ok?el("span",{class:"pill ok",text:"✓ cuadra"}):el("span",{class:"pill bad",text:f2(G.cua)+" kg"})])])])])]),
    (G.aj<0&&-G.aj>G.con*0.5)?el("div",{class:"banner w",style:"margin-top:8px",text:"Los recuentos han quitado "+f2(-G.aj)+" kg de granalla y el consumo apuntado es "+f2(G.con)+" kg: falta consumo por apuntar (o se gasta más de lo que se anota). Conviene revisarlo antes del cierre."}):null]);
  /* valoración en euros al precio del mes */
  const eu=v=>el("td",{class:"r num",text:eur(v)});
  const sinPr=Object.keys(MAT).filter(mt=>I.filas.some(x=>x.mat===mt)&&!I.precio[mt].v);
  const filV=[];Object.keys(MAT).forEach(mt=>{const fs=I.filas.filter(x=>x.mat===mt);if(!fs.length)return;
    fs.forEach(x=>filV.push(el("tr",{},[el("td",{},[el("span",{class:"tagm",style:"background:"+MAT[x.mat].col}),document.createTextNode(x.nave),el("div",{class:"sub",text:MAT[x.mat].nom})]),
      eu(x.eur.ini),eu(x.eur.ent),eu(x.eur.con),eu(x.eur.aju),eu(x.eur.fin)])));
    const sm=k=>fs.reduce((a,x)=>a+x.eur[k],0);
    if(fs.length>1)filV.push(el("tr",{style:"font-weight:600"},[el("td",{text:"Total "+MAT[mt].nom}),eu(sm("ini")),eu(sm("ent")),eu(sm("con")),eu(sm("aju")),eu(sm("fin"))]));});
  const valor=el("div",{},[
    el("h3",{style:"margin:6px 0 4px;font-size:14px;letter-spacing:.05em;text-transform:uppercase",text:"Valoración"}),
    el("p",{class:"hint",style:"margin:0 0 6px",text:"Al precio del mes: "+Object.keys(MAT).filter(mt=>I.filas.some(x=>x.mat===mt)).map(mt=>MAT[mt].nom+" "+(I.precio[mt].v?eurT(I.precio[mt].v)+" €/t":"sin precio")).join(" · ")+". Se cambia en la pestaña Precios."}),
    sinPr.length?el("div",{class:"banner w",style:"margin-bottom:6px",text:"Falta el precio de "+sinPr.map(mt=>MAT[mt].nom).join(" y ")+" para "+nomMes(I.m)+": mételo en Precios."}):null,
    el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},[el("th",{text:"Nave y aleación"}),el("th",{class:"r",text:labIni(I)}),el("th",{class:"r",text:"Entradas"}),el("th",{class:"r",text:"Consumo"}),el("th",{class:"r",text:"Ajustes"}),el("th",{class:"r",text:"Final"})])]),
      el("tbody",{},filV)])])]);
  const tE=I.filas.reduce((a,x)=>a+x.ent.kg,0),tC=I.filas.reduce((a,x)=>a+x.con.kg,0),tF=I.filas.reduce((a,x)=>a+x.fin.kg,0);
  const bajar=async(e,fn,nombre,ok)=>{const b=e.currentTarget;b.disabled=true;
    try{const dl=await claude.use("downloads");if(!dl){toast("La descarga no está disponible aquí");return;}
      await dl.save({filename:nombre,data:await fn()});toast(ok);
    }catch(err){if(!(err&&err.code==="declined"))toast("No se pudo generar el archivo");}finally{b.disabled=false;}};
  const copiar=async()=>{const t=textoCierre(I);
    try{await navigator.clipboard.writeText(t);toast("Resumen copiado");}
    catch(e){const ta=document.createElement("textarea");ta.value=t;ta.style.position="fixed";ta.style.opacity="0";
      document.body.appendChild(ta);ta.select();try{document.execCommand("copy");toast("Resumen copiado");}catch(e2){toast("No se pudo copiar");}ta.remove();}};
  return el("div",{class:"card"},[
    el("div",{class:"hd"},[el("h2",{text:"Cierre de mes"}),el("span",{class:"der pill "+(I.todoOk?"ok":"bad"),text:I.todoOk?"✓ Todo cuadra":"Hay descuadres"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:12px"},[
      el("label",{text:"Mes"},[sel]),
      (cfg.cierres||{})[cierreMes]&&cfg.cierres[cierreMes].enviado?el("p",{class:"hint",text:"Enviado por correo el "+dmyA((cfg.cierres[cierreMes].enviado||"").slice(0,10))+(cfg.cierres[cierreMes].a?" a "+cfg.cierres[cierreMes].a:"")+"."}):null,
      el("p",{class:"hint",text:(I.completo?periodo(I)+" ":I.arranque?"La app arrancó el "+dmyA(I.arranque)+" con inventario físico: ese es el inicial. ":"")+"Entradas "+fmt(tE)+" kg · Consumo "+fmt(tC)+" kg · Stock final "+fmt(tF)+" kg."+(cierreMes===act?" El mes aún no ha terminado: el final es el de hoy.":"")}),
      tabla,tablaPrev,valor,cobre,
      incluirChips("cierre",opsCierre(I),null,"Qué incluir al copiar, descargar o enviar (se recuerda):").node,
      el("div",{class:"seg"},[
        el("button",{type:"button",class:"btn",text:"Informe de cierre (Excel)",onclick:e=>bajar(e,()=>excelCierre(I),"cierre-colada-"+cierreMes+".xlsx","Informe descargado")}),
        el("button",{type:"button",class:"btn sec",text:"Copiar resumen",onclick:copiar}),
        window.sbColada?el("button",{type:"button",class:"btn sec",text:((cfg.cierres||{})[cierreMes]||{}).enviado?"Enviar otra vez por correo":"Enviar por correo",onclick:e=>enviarCierre(cierreMes,e.currentTarget)}):null,
        el("button",{type:"button",class:"btn sec",text:"Movimientos (CSV)",onclick:e=>bajar(e,()=>{const g=filtro;filtro={desde:I.d1,hasta:I.dn,tipo:"",nave:"",mat:"",turno:"",texto:""};try{return csvDe(filtrados());}finally{filtro=g;}},"colada-"+cierreMes+".csv","Movimientos descargados")})])
    ])
  ]);
}
/* gráficos: consumo y entradas de aluminio por mes, por nave y aleación (últimos 12 meses) */
function cardGraficos(){if(!window.GRAF)return null;
  const S=saldos(),hoyM=mesDe(hoy());const M=[];{let [y,m]=hoyM.split("-").map(Number);for(let k=0;k<12;k++){M.unshift(y+"-"+String(m).padStart(2,"0"));m--;if(m<1){m=12;y--;}}}
  const C={},E={};LINEAS.forEach(([n,mm])=>{C[key(n,mm)]=M.map(()=>0);E[key(n,mm)]=M.map(()=>0);});
  todosMovs().forEach(r=>{if(!r.f||r.h)return;const i=M.indexOf(r.f.slice(0,7));if(i<0)return;
    if(r.t==="C"){const l=lotes.find(x=>x.id===r.o);if(!l)return;const k=key(l.nave,l.material);if(C[k])C[k][i]+=Math.abs(kgAp(r,S)||0);}
    else if(r.t==="E"){const l=lotes.find(x=>x.id===r.d);if(!l)return;const k=key(l.nave,l.material);if(E[k])E[k][i]+=Math.abs(+r.kg||0);}});
  const ser=O=>Object.keys(O).filter(k=>O[k].some(v=>v>0)).map(k=>({name:etiqLinea(k),data:O[k].map(v=>Math.round(v))}));
  const sc=ser(C),se=ser(E);if(!sc.length&&!se.length)return null;
  const x=M.map(m=>{const[y,mm]=m.split("-");return ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][+mm-1]+" "+y.slice(2);});
  const g1=el("div"),g2=el("div");
  setTimeout(()=>{if(sc.length)GRAF.barras(g1,{x,apilado:true,leyenda:true,fmt:"kg",series:sc});if(se.length)GRAF.barras(g2,{x,apilado:true,leyenda:true,fmt:"kg",series:se});},0);
  return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Aluminio por mes"}),el("span",{class:"sub",style:"margin-left:auto",text:"últimos 12 meses"})]),
    el("div",{class:"bd",style:"display:grid;gap:14px"},[sc.length?el("div",{},[el("h3",{class:"g-tit",text:"Consumo"}),g1]):null,se.length?el("div",{},[el("h3",{class:"g-tit",text:"Entradas"}),g2]):null])]);}
function vConsultas(){
  const f=filtro,rows=filtrados();
  const T={C:"Consumo",E:"Entrada",A:"Ajuste",G:"Granalla de cobre",T:"Traslado"};
  const tKg=rows.reduce((a,x)=>a+(x.r.t==="C"||x.kg<0?-Math.abs(x.kg):Math.abs(x.kg)),0);
  const cons=rows.filter(x=>x.r.t==="C"||(x.r.t==="G"&&!x.r.aj&&x.kg<0));
  const cKg=cons.reduce((a,x)=>a+Math.abs(x.kg),0),cFa=cons.reduce((a,x)=>a+x.fa,0);
  const set=(k,v)=>{f[k]=v;render();};
  const opt=(val,txt,cur)=>{const o=el("option",{value:val,text:txt});if(cur===val)o.selected=true;return o;};
  const filtros=el("div",{class:"bd"},[el("form",{onsubmit:e=>e.preventDefault()},[
    el("div",{class:"seg"},[["hoy","Hoy"],["ayer","Ayer"],["7","7 días"],["mes","Este mes"],["","Todo"]].map(([k,t])=>
      el("button",{type:"button",text:t,onclick:()=>{const[a,b]=rangoRapido(k);f.desde=a;f.hasta=b;render();}}))),
    el("div",{class:"row"},[
      el("label",{text:"Desde"},[el("input",{id:"f-d",type:"date",value:f.desde||"",onchange:e=>set("desde",e.target.value)})]),
      el("label",{text:"Hasta"},[el("input",{id:"f-h",type:"date",value:f.hasta||"",onchange:e=>set("hasta",e.target.value)})])
    ]),
    el("div",{class:"row"},[
      el("label",{text:"Tipo"},[el("select",{id:"f-t",onchange:e=>set("tipo",e.target.value)},
        [opt("","Todos",f.tipo),opt("C","Consumo",f.tipo),opt("E","Entrada",f.tipo),opt("G","Granalla de cobre",f.tipo),opt("A","Ajuste",f.tipo)])]),
      el("label",{text:"Nave"},[el("select",{id:"f-n",onchange:e=>set("nave",e.target.value)},
        [opt("","Todas",f.nave)].concat(NAVES.map(n=>opt(n,n,f.nave))))]),
      el("label",{text:"Aleación"},[el("select",{id:"f-m",onchange:e=>set("mat",e.target.value)},
        [opt("","Todas",f.mat)].concat(Object.keys(MAT).map(m=>opt(m,MAT[m].nom,f.mat))))]),
      el("label",{text:"Relevo"},[el("select",{id:"f-u",onchange:e=>set("turno",e.target.value)},
        [opt("","Todos",f.turno)].concat(TURNOS.map(t=>opt(t,t,f.turno))))])
    ]),
    el("label",{text:"Buscar colada, albarán o nota"},[el("input",{id:"f-q",value:f.texto||"",placeholder:"C25073…",oninput:e=>{f.texto=e.target.value;render();}})])
  ])]);
  const resumen=el("div",{class:"tw"},[el("table",{},[el("tbody",{},[
    el("tr",{},[el("td",{text:"Apuntes"}),el("td",{class:"r num",text:fmt(rows.length)})]),
    el("tr",{},[el("td",{text:"Consumido"}),el("td",{class:"r num",text:fmt(cKg)+" kg · "+fmt(cFa)+" fardos"})]),
    el("tr",{},[el("td",{text:"Saldo del periodo"}),el("td",{class:"r num",text:(tKg>=0?"+":"−")+fmt(Math.abs(tKg))+" kg"})])
  ])])]);
  /* desglose por relevo y nave, que es lo que se mira cuando hay un problema */
  const porRel={};
  cons.forEach(({r,i,kg,fa})=>{const k=(i.nave||"—")+"|"+(r.u||"Sin relevo");
    if(!porRel[k])porRel[k]={nave:i.nave||"—",turno:r.u||"Sin relevo",kg:0,fa:0,n:0};
    porRel[k].kg+=Math.abs(kg);porRel[k].fa+=fa;porRel[k].n++;});
  const relArr=Object.keys(porRel).map(k=>porRel[k]).sort((a,b)=>a.nave.localeCompare(b.nave)||TURNOS.indexOf(a.turno)-TURNOS.indexOf(b.turno));
  const desglose=relArr.length?el("div",{class:"card"},[
    el("div",{class:"hd"},[el("h2",{text:"Consumo por nave y relevo"})]),
    el("div",{class:"tw"},[el("table",{},[
      el("thead",{},[el("tr",{},[el("th",{text:"Nave"}),el("th",{text:"Relevo"}),el("th",{class:"r",text:"Apuntes"}),el("th",{class:"r",text:"Fardos"}),el("th",{class:"r",text:"Kg"})])]),
      el("tbody",{},relArr.map(x=>el("tr",{},[el("td",{text:x.nave}),el("td",{text:x.turno}),
        el("td",{class:"r num",text:fmt(x.n)}),el("td",{class:"r num",text:fmt(x.fa)}),el("td",{class:"r num",text:fmt(x.kg)})])))
    ])])
  ]):null;
  const detalle=el("div",{class:"tw"},[el("table",{},[
    el("thead",{},[el("tr",{},[el("th",{text:"Fecha"}),el("th",{text:"Tipo"}),el("th",{text:"Colada"}),el("th",{text:"Relevo"}),el("th",{class:"r",text:"Kg"}),el("th",{class:"r",text:"Fardos"})])]),
    el("tbody",{},rows.slice(0,300).map(({r,i,kg,fa})=>el("tr",{},[
      el("td",{class:"num",text:dmy(r.f)}),
      el("td",{},[document.createTextNode((r.t==="G"&&r.aj?"Ajuste granalla de cobre":(T[r.t]||r.t))),r.h?el("div",{class:"sub",text:"histórico"}):el("div",{},[r.t!=="T"?el("button",{class:"btn sec del edit",type:"button",text:"Editar",onclick:()=>editarApunte(r)}):null,el("button",{class:"btn sec del",type:"button",text:"Borrar",onclick:async e=>{const b=e.currentTarget;b.disabled=true;try{if(await borrarApunte(r,i,kg,fa))toast("Borrado");}catch(err){toast("No se pudo borrar");}finally{b.disabled=false;}}})])]),
      el("td",{},[i.mat?el("span",{class:"tagm",style:"background:"+(MAT[i.mat]?MAT[i.mat].col:"var(--cobre)")}):el("span",{class:"tagm",style:"background:var(--cobre)"}),
        document.createTextNode(i.colada||"—"),
        el("div",{class:"sub",text:[i.nave,r.a||""].filter(Boolean).join(" · ")}),
        r.ft?el("img",{class:"thumb",src:fotoUrl(r.ft),alt:"Albarán "+(r.a||""),title:"Ver el albarán",onclick:()=>verFoto(r.ft)}):null]),
      el("td",{class:"sub",text:r.u||"—"}),
      el("td",{class:"r num",text:(r.t==="T"?"":((r.t==="C"||kg<0)?"−":"+"))+fmt(Math.abs(kg))}),
      el("td",{class:"r num",text:fa?fmt(fa):"—"}),

    ])))
  ])]);
  const botones=el("div",{class:"bd"},[el("div",{class:"seg"},[
    el("button",{type:"button",class:"btn sec",text:"Descargar para Excel",onclick:async()=>{
      try{const dl=await claude.use("downloads");
        if(!dl){toast("La descarga no está disponible aquí");return;}
        const n="consumos"+(f.desde?"-"+f.desde:"")+(f.hasta?"-a-"+f.hasta:"")+".csv";
        await dl.save({filename:n,data:csvDe(rows)});
      }catch(err){toast("No se pudo descargar");}}}),
    el("button",{type:"button",class:"btn sec",text:"Limpiar filtros",onclick:()=>{filtro={desde:"",hasta:"",tipo:"",nave:"",mat:"",turno:"",texto:""};render();}})
  ])]);
  /* copia completa de todos los datos (y fotos de albaranes) para pasarlos a la aplicación web */
  const copia=el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Copia de seguridad"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[
      el("p",{class:"hint",text:"Descarga todos los datos (coladas, movimientos, máquinas, precios, plan, calendario) y las fotos de los albaranes en un archivo. Sirve como copia y para pasarlo todo a la aplicación web."}),
      el("button",{type:"button",class:"btn sec",text:"Descargar copia completa",onclick:async e=>{const b=e.currentTarget;b.disabled=true;const t0=b.textContent;
        try{const dl=await claude.use("downloads");if(!dl){toast("La descarga no está disponible aquí");return;}
          const fotos={},ids=[...new Set(todosMovs().filter(r=>r.ft).map(r=>r.ft))];
          for(const [i,id] of ids.entries()){b.textContent="Fotos "+(i+1)+"/"+ids.length+"…";
            try{const r=await fetch(fotoUrl(id));if(r.ok){const bl=await r.blob();fotos[id]=await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.readAsDataURL(bl);});}}catch(err){}}
          const docs={lotes:{},mov:{},maq:{},cfg:{app:cfg}};
          lotes.forEach(l=>{const c=Object.assign({},l);delete c.id;docs.lotes[l.id]=c;});
          Object.keys(meses).forEach(m=>docs.mov[m]={items:meses[m]});Object.keys(maqEv||{}).forEach(m=>docs.maq[m]={items:maqEv[m]});
          const out=JSON.stringify({app:"colada",version:1,fecha:new Date().toISOString(),docs,fotos});
          await dl.save({filename:"colada-copia-"+hoy()+".json",data:out});toast("Copia descargada"+(ids.length?" con "+Object.keys(fotos).length+" foto(s)":""));
        }catch(err){if(!(err&&err.code==="declined"))toast("No se pudo hacer la copia");}finally{b.disabled=false;b.textContent=t0;}}})])]);
  return [
    vCierre(),
    cardGraficos(),
    el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Consultar movimientos"})]),filtros,resumen,botones]),
    desglose,
    el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Detalle"}),el("span",{class:"sub",style:"margin-left:auto",text:rows.length>300?"mostrando 300 de "+fmt(rows.length):fmt(rows.length)+" apuntes"})]),
      rows.length?detalle:el("div",{class:"empty",text:"Ningún apunte con esos filtros."})]),
    copia
  ];
}
function vMin(){
  const rows=[];
  NAVES.forEach(n=>Object.keys(MAT).forEach(m=>{const k=key(n,m),mn=cfg.minimos[k]||{};if(!pasaF(n,m))return;
    rows.push(el("tr",{},[
      el("td",{},[el("span",{class:"tagm",style:"background:"+MAT[m].col}),document.createTextNode(n+" · "+MAT[m].nom)]),
      el("td",{},[el("input",{class:"num",type:"text",min:"0",step:"1",inputmode:"numeric",style:"font-size:15px;padding:7px 9px",value:mn.fardosNave!=null?mn.fardosNave:"",onchange:async e=>{
        const v=numES(e.target.value);cfg.minimos[k]={fardosNave:isNaN(v)?0:v};
        try{await saveCfg();toast("Mínimo guardado");}catch(err){toast("No se pudo guardar");}}})])
    ]));}));
  rows.push(el("tr",{},[
    el("td",{},[el("span",{class:"tagm",style:"background:var(--cobre)"}),document.createTextNode("Granalla de cobre (kg)")]),
    el("td",{},[el("input",{class:"num",type:"text",min:"0",step:"any",inputmode:"decimal",style:"font-size:15px;padding:7px 9px",value:(cfg.granalla&&cfg.granalla.min)!=null?cfg.granalla.min:"",onchange:async e=>{
      const v=numES(e.target.value);cfg.granalla=Object.assign({},cfg.granalla,{min:isNaN(v)?0:v});
      try{await saveCfg();toast("Mínimo guardado");}catch(err){toast("No se pudo guardar");}}})])
  ]));
  const cg=cfg.cargador||{};
  const pct=(k,txt)=>el("tr",{},[el("td",{text:txt}),el("td",{},[el("input",{class:"num",type:"text",inputmode:"numeric",placeholder:"%",style:"font-size:15px;padding:7px 9px",value:cg[k]?String(cg[k]):"",
    onchange:async e=>{const v=numES(e.target.value);cfg.cargador=Object.assign({},cfg.cargador,{[k]:v>0?v:0});try{await saveCfg();toast("Guardado");}catch(err){toast("No se pudo guardar");}}})])]);
  rows.push(pct("roto","Cargador roto: % más de lingote"),pct("recup","Cargador recién arreglado: % menos de lingote"));
  return el("div",{class:"card"},[
    el("div",{class:"hd"},[el("h2",{text:"Mínimos"})]),
    el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},[el("th",{text:"Nave y aleación"}),el("th",{text:"Mínimo de fardos en la nave"})])]),el("tbody",{},rows)])]),
    el("div",{class:"bd"},[el("p",{class:"hint",text:"El mínimo se mide sobre los fardos que están físicamente en la nave, no sobre el total. Un cero desactiva el aviso. Los % del cargador son una estimación para la previsión mientras no haya datos: cuando haya 2 o más relevos apuntados con el cargador roto (o recuperando), la app usa lo que pasó de verdad."})])
  ]);
}

