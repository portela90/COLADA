/* ---------- Ficha del mes (para la auditoría) ----------
   Al tocar un mes en las pestañas de Consultas se abre todo lo de ese mes en una sola página:
   resumen por nave y aleación, camiones (proveedor, día, colada, albarán, dónde se descargó, kilos de albarán
   y de báscula, foto), consumo por día y relevo, subidas del externo, ajustes con su motivo, coladas a fin de mes,
   comparación con la fábrica y si el mes está cerrado. Se descarga en Excel con el informe de cierre. */
let mesSel="";
function vMesAud(m){const I=informeMes(m),Sf=conCorte(I.dn,saldos),lote=id=>lotes.find(x=>x.id===id)||{};
  const ms=todosMovs().filter(r=>!r.h&&r.f&&r.f>=I.d1&&r.f<=I.dn);
  const provs=[...new Set(I.entradas.map(x=>x.r.p||x.l.proveedor||"").filter(Boolean))];
  const dot=p=>el("span",{class:"tagm",style:"background:"+(typeof colProv==="function"?colProv(p,provs):"var(--mut)")});
  const tabla=(cab,filas,der,pie)=>el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},cab.map((t,i)=>el("th",{class:(der||[]).includes(i)?"r":"",text:t})))]),
    el("tbody",{},filas.map(f=>el("tr",{style:f.st||null},f.c.map((v,i)=>el("td",{class:(der||[]).includes(i)?"r num":""},v instanceof Node?[v]:[document.createTextNode(v==null?"—":String(v))]))))),
    pie?el("tfoot",{},[el("tr",{style:"font-weight:700"},pie.map((v,i)=>el("td",{class:(der||[]).includes(i)?"r num":"",text:v==null?"":String(v)})))]):null])]);
  const sec=(t,sub,body)=>el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:t}),sub?el("span",{class:"der sub",text:sub}):null]),el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},body)]);
  const nomL=x=>x.nave+" · "+MAT[x.mat].nom;
  const C=(typeof cfg!=="undefined"&&cfg.candado||{})[m];
  /* 1 · resumen */
  const res=sec("Resumen de "+nomMes(m),I.todoOk?"✓ cuadra":"hay descuadres",[
    el("p",{class:"hint",style:"margin:0",text:"Del "+dmyA(I.d1)+" al "+dmyA(I.dn)+". "+(C?"🔒 Mes cerrado el "+dmyA(C.ts.slice(0,10))+(C.por?" por "+C.por:"")+": estos datos ya no se pueden cambiar.":"Mes sin cerrar: los datos todavía se pueden corregir.")}),
    tabla(["Nave y aleación","Inicio","+ Entradas","− Consumo","± Ajustes","= Final","Cuadre"],
      I.filas.map(x=>({c:[nomL(x),fmt(Math.round(x.ini.kg))+" kg",fmt(Math.round(x.ent.kg))+" kg",fmt(Math.round((x.conTot||x.con).kg))+" kg",(x.aju.kg>0?"+":x.aju.kg<0?"−":"")+fmt(Math.abs(Math.round(x.aju.kg)))+" kg",fmt(Math.round(x.fin.kg))+" kg",
        el("span",{class:"pill "+(x.cua.ok?"ok":"bad"),text:x.cua.ok?"✓":fmt(Math.round(x.cua.kg))+" kg"})]})),[1,2,3,4,5]),
    tabla(["Nave y aleación","Fardos inicio","+ Entradas","− Consumo","± Ajustes","= Final"],I.filas.map(x=>({c:[nomL(x),fmt(x.ini.fa),fmt(x.ent.fa),fmt((x.conTot||x.con).fa),(x.aju.fa>0?"+":"")+fmt(x.aju.fa),fmt(x.fin.fa)]})),[1,2,3,4,5])]);
  /* 2 · camiones */
  const E=I.entradas.filter(x=>!x.h).slice().sort((a,b)=>a.r.f.localeCompare(b.r.f));
  const porProv={};E.forEach(x=>{const p=x.r.p||x.l.proveedor||"Sin proveedor";const o=porProv[p]=porProv[p]||{n:0,fa:0,kg:0};o.n++;o.fa+=x.fa;o.kg+=x.kg;});
  const cam=sec("Camiones que entraron",E.length+(E.length===1?" camión":" camiones")+" · "+fmt(Math.round(E.reduce((a,x)=>a+x.kg,0)))+" kg",[
    E.length?tabla(["Día","Proveedor","Pedido","Colada","Albarán","Nave","Descarga","Fardos","Kg albarán","Kg báscula","Foto"],
      E.map(x=>{const p=x.r.p||x.l.proveedor||"";const dn=dondeEn(x.l,x.r.f);const kb=typeof x.r.kb==="number"?x.r.kb:null;
        return{c:[dmyA(x.r.f),el("span",{},[dot(p),document.createTextNode(p||"—")]),(typeof pedidoDe==="function"&&pedidoDe(mesDe(x.r.f),p))||"—",x.l.nombre||"—",x.r.a||x.l.albaran||(x.r.sa?"sin albarán":"—"),x.l.nave,dn==="externo"?"Almacén externo":"En la nave",fmt(x.fa),fmt(Math.round(x.kg))+(x.r.ke||x.r.sa?" (estimado)":""),
          kb==null?"—":fmt(kb)+(Math.abs(kb-x.kg)>Math.max(50,x.kg*0.005)?" ("+(kb>x.kg?"+":"−")+fmt(Math.abs(Math.round(kb-x.kg)))+")":""),
          x.r.ft?el("button",{type:"button",class:"btn sec peq",text:"Ver",onclick:()=>verFoto(x.r.ft)}):"—"]};}),[7,8,9],
      ["Total","","","","","","",fmt(E.reduce((a,x)=>a+x.fa,0)),fmt(Math.round(E.reduce((a,x)=>a+x.kg,0))),"",""]):el("p",{class:"empty",text:"Este mes no entró ningún camión."}),
    Object.keys(porProv).length?tabla(["Proveedor","Nº pedido","Camiones","Fardos","Kg"],Object.entries(porProv).sort((a,b)=>b[1].kg-a[1].kg).map(([p,o])=>({c:[el("span",{},[dot(p),document.createTextNode(p)]),(typeof pedidoDe==="function"&&pedidoDe(m,p))||"—",fmt(o.n),fmt(o.fa),fmt(Math.round(o.kg))]})),[2,3,4]):null].filter(Boolean));
  /* 3 · consumo por día y relevo */
  const CM=ms.filter(r=>r.t==="C");const dias={};
  CM.forEach(r=>{const l=lote(r.o);if(!l.nave)return;const d=dias[r.f]=dias[r.f]||{};const k=key(l.nave,l.material)+"|"+r.u;const o=d[k]=d[k]||{fa:0,kg:0};o.fa+=Math.abs(r.fa||0);o.kg+=Math.abs(kgAp(r,Sf)||0);});
  const cols=[];I.filas.forEach(x=>TURNOS.forEach(u=>cols.push([key(x.nave,x.mat),u,x])));
  const usadas=cols.filter(([k,u])=>Object.values(dias).some(d=>d[k+"|"+u]));
  let H=[];try{H=huecos(I.d1,I.dn<hoy()?I.dn:hoy());}catch(e){}const nH=H.reduce((a,d)=>a+d.falta.length,0);
  const tot=CM.reduce((a,r)=>a+Math.abs(kgAp(r,Sf)||0),0);
  const con=sec("Consumo por día y relevo",fmt(Math.round(tot))+" kg · "+fmt(CM.reduce((a,r)=>a+Math.abs(r.fa||0),0))+" fardos",[
    nH?el("div",{class:"banner w",style:"margin:0",text:nH+(nH===1?" relevo sin consumo apuntado":" relevos sin consumo apuntado")+" este mes."}):null,
    Object.keys(dias).length?tabla(["Día"].concat(usadas.map(([k,u,x])=>x.nave.replace("Nave ","N")+" "+MAT[x.mat].nom+" · "+u.toLowerCase())).concat(["Total día"]),
      Object.keys(dias).sort().map(d=>{const D=dias[d];return{c:[dmy(d)+" "+(typeof diaSem==="function"?diaSem(d):"")].concat(usadas.map(([k,u])=>{const o=D[k+"|"+u];return o?o.fa+" f · "+fmt(Math.round(o.kg)):"—";}))
        .concat([fmt(Math.round(Object.values(D).reduce((a,o)=>a+o.kg,0)))+" kg"])};}),usadas.map((_,i)=>i+1).concat([usadas.length+1])):el("p",{class:"empty",text:"Sin consumo apuntado este mes."})].filter(Boolean));
  /* 4 · subidas del externo */
  const TR=ms.filter(r=>r.t==="T").sort((a,b)=>a.f.localeCompare(b.f));
  const sub=TR.length?sec("Subidas del almacén externo",TR.length+(TR.length===1?" subida":" subidas"),[
    tabla(["Día","Colada","Nave","Fardos","Kg","Nota"],TR.map(r=>{const l=lote(r.d||r.o);const fa=r.o===r.d?(+(String(r.n||"").match(/(\d+) fardos/)||[])[1]||null):Math.abs(r.fa||0);
      return{c:[dmyA(r.f),l.nombre||"—",l.nave||"—",fa==null?"todas":fmt(fa),typeof r.kg==="number"?fmt(Math.abs(Math.round(r.kg))):"—",r.n||""]};}),[3,4]),
    el("p",{class:"hint",style:"margin:0",text:"Son traslados dentro de la empresa: no son material nuevo ni cambian el stock total."})]):null;
  /* 5 · ajustes */
  const AJ=ms.filter(r=>r.t==="A").sort((a,b)=>a.f.localeCompare(b.f));
  const MOTN=typeof AJ_MOT!=="undefined"?AJ_MOT:{};
  const aj=sec("Ajustes de recuento",AJ.length?AJ.length+(AJ.length===1?" ajuste":" ajustes")+" · neto "+(()=>{const n=AJ.reduce((a,r)=>a+(r.d?1:-1)*Math.abs(kgAp(r,Sf)||0),0);return(n>0?"+":n<0?"−":"")+fmt(Math.abs(Math.round(n)))+" kg";})():"ninguno",[
    AJ.length?tabla(["Día","Colada","Nave","Fardos","Kg","Motivo","Nota"],AJ.map(r=>{const l=lote(r.o||r.d);const sg=r.d?"+":"−";
      return{c:[dmyA(r.f),l.nombre||"—",l.nave?l.nave+" · "+MAT[l.material].nom:"—",sg+fmt(Math.abs(r.fa||0)),sg+fmt(Math.abs(Math.round(kgAp(r,Sf)||0))),MOTN[r.mot||"sin"]||"Sin motivo",r.n||""]};}),[3,4]):el("p",{class:"empty",text:"Este mes no hubo ajustes: todo lo contado coincidía."})]);
  /* 6 · coladas a fin de mes */
  const CF=I.coladas;
  const fin=sec("Coladas al final del mes",CF.length+" coladas · "+fmt(Math.round(CF.reduce((a,x)=>a+x.s.kg,0)))+" kg",[
    CF.length?tabla(["Colada","Nave y aleación","Dónde","Entró","Proveedor","Fardos","Kg"],CF.map(x=>({c:[x.l.nombre,x.l.nave+" · "+MAT[x.l.material].nom,x.donde==="externo"?"Externo":"Nave",dmyA(x.l.entrada),el("span",{},[dot(x.l.proveedor),document.createTextNode(x.l.proveedor||"—")]),fmt(x.s.fa),fmt(Math.round(x.s.kg))]})),[5,6],
      ["Total","","","","",fmt(CF.reduce((a,x)=>a+x.s.fa,0)),fmt(Math.round(CF.reduce((a,x)=>a+x.s.kg,0)))]):el("p",{class:"empty",text:"No quedaba ninguna colada."})]);
  /* 7 · fábrica */
  const fab=typeof bloqueFabrica==="function"?bloqueFabrica(I):null,arr=typeof bloqueArrastre==="function"?bloqueArrastre(I):null;
  const bajar=async e=>{const b=e.currentTarget;b.disabled=true;try{const dl=await claude.use("downloads");if(!dl){toast("La descarga no está disponible aquí");return;}
      await dl.save({filename:"colada-"+m+".xlsx",data:await excelCierre(I)});toast("Excel de "+nomMes(m)+" descargado");}catch(err){if(!(err&&err.code==="declined"))toast("No se pudo generar el archivo");}finally{b.disabled=false;}};
  const cab=el("div",{class:"card"},[el("div",{class:"bd",style:"display:flex;gap:10px;align-items:center;flex-wrap:wrap"},[
    el("div",{style:"flex:1;min-width:200px"},[el("h2",{style:"margin:0",text:Mayus(nomMes(m))}),el("div",{class:"sub",text:"Todo lo de este mes en una página: para revisar o enseñar en la auditoría."})]),
    el("button",{type:"button",class:"btn",id:"mes-xlsx",text:"Descargar Excel del mes",onclick:bajar}),
    el("button",{type:"button",class:"btn sec",text:"Ir al cierre",onclick:()=>{cierreMes=m;mesSel="";const f=filtro;f.desde=m+"-01";f.hasta=finDeMes(m);PANV.hist="";render();setTimeout(()=>{const t=[...document.querySelectorAll(".stk-t")].find(x=>/Cierre de mes/.test(x.textContent));if(t)t.click();},50);}})])]);
  return el("div",{class:"mes-aud",style:"display:flex;flex-direction:column;gap:14px"},[cab,res,cam,con,sub,aj,incMes(m),fin,typeof regMes==="function"?regMes(m):null,arr,fab].filter(Boolean));}

function incMes(m){if(typeof todasIncid!=="function")return null;const L=todasIncid().filter(r=>(r.f||"").startsWith(m));
  return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Incidencias con el material"}),el("span",{class:"der sub",text:L.length?L.length+"":"ninguna"})]),
    el("div",{class:"bd"},[L.length?el("div",{class:"lst"},L.map(r=>filaIncid(r,true))):el("p",{class:"empty",text:"Este mes no se apuntó ninguna incidencia con el material."})])]);}
