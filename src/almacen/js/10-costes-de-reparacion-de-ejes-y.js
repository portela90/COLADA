/* ===== COSTES DE REPARACIÓN DE EJES Y AHORRO POR RECUPERAR EN PLANTA ===== */
const eur=n=>(Math.round((+n||0)*100)/100).toLocaleString("es-ES",{minimumFractionDigits:0,maximumFractionDigits:2})+" €";
const precioMod=cod=>{const m=modelo(cod);return m&&+m.precioRep>0?+m.precioRep:0;};
function costeRep(r){if(+r.imp>0)return{v:+r.imp,o:"albarán"};const p=precioMod(modeloDeEje(r.eje));return p?{v:p,o:"precio del modelo"}:{v:0,o:"sin precio"};}
const ejeRecup=()=>cat.ejeRecup||[];
function periodoIC(k){const hy=hoy(),y=hy.slice(0,4),m=hy.slice(0,7);
  if(k==="mes")return{d:m+"-01",h:hy,t:"Este mes ("+fmtMes(m)+")"};
  if(k==="mesant"){const p=sumaDias(m+"-01",-1);return{d:p.slice(0,7)+"-01",h:p,t:cap(fmtMes(p.slice(0,7)))};}
  if(k==="ano")return{d:y+"-01-01",h:hy,t:"Año "+y};
  return{d:sumaDias(hy,-365),h:hy,t:"Últimos 12 meses"};}
function datosIC(k){const P=periodoIC(k),en=f=>f&&f>=P.d&&f<=P.h;
  const reps=todasRep().filter(r=>r.res!=="anulada");
  const recib=reps.filter(r=>r.res==="ok"&&en(r.rec)).map(r=>Object.assign({},r,{mod:modeloDeEje(r.eje),c:costeRep(r)}));
  const env=reps.filter(r=>en(r.env));
  const taller=reps.filter(r=>r.env&&!r.res).map(r=>Object.assign({},r,{mod:modeloDeEje(r.eje),c:costeRep(r)}));
  const recu=ejeRecup().filter(x=>en(x.f)).map(x=>{const mod=(x.mods||[])[0]||"";return Object.assign({},x,{mod,ah:precioMod(mod)});});
  const porMod={};const pm=k2=>porMod[k2]=porMod[k2]||{rep:0,coste:0,rec:0,ahorro:0};
  recib.forEach(r=>{const x=pm(r.mod);x.rep++;x.coste+=r.c.v;});recu.forEach(r=>{const x=pm(r.mod);x.rec++;x.ahorro+=r.ah;});
  const porMes={};recib.forEach(r=>{const x=porMes[r.rec.slice(0,7)]=porMes[r.rec.slice(0,7)]||{rep:0,coste:0,rec:0,ahorro:0};x.rep++;x.coste+=r.c.v;});
  recu.forEach(r=>{const x=porMes[r.f.slice(0,7)]=porMes[r.f.slice(0,7)]||{rep:0,coste:0,rec:0,ahorro:0};x.rec++;x.ahorro+=r.ah;});
  const sinPrecio=[...new Set(recib.filter(r=>!r.c.v).map(r=>r.mod).concat(recu.filter(r=>!r.ah).map(r=>r.mod)).concat(taller.filter(r=>!r.c.v).map(r=>r.mod)))].filter(Boolean);
  return{P,recib,env,taller,recu,porMod,porMes,sinPrecio,coste:recib.reduce((t,r)=>t+r.c.v,0),ahorro:recu.reduce((t,r)=>t+r.ah,0),costeTaller:taller.reduce((t,r)=>t+r.c.v,0)};}
const OPS_IC=[["#","Resumen"],["mod","Por modelo"],["mes","Por mes"],["#","Hojas del Excel"],["h:Por modelo","Por modelo"],["h:Por mes","Por mes"],["h:Reparaciones","Detalle de reparaciones"],["h:Recuperados en planta","Recuperados en planta"]];
function textoIC(D,s){s=s||incluirSel("costes",OPS_IC);const L=["INFORME DE EJES DE INYECCIÓN · "+D.P.t.toUpperCase()+" · MAPRI",""];
  L.push("Reparados por el taller (recibidos OK): "+D.recib.length+" ejes · coste "+eur(D.coste));
  L.push("Recuperados en planta (no se mandaron al taller): "+D.recu.length+" ejes · ahorro "+eur(D.ahorro));
  L.push("Enviados a reparar en el periodo: "+D.env.length);
  L.push("En el taller ahora: "+D.taller.length+" ejes · coste previsto "+eur(D.costeTaller));L.push("");
  const ks=Object.keys(D.porMod).sort((a,b)=>D.porMod[b].coste-D.porMod[a].coste);
  if(s.mes){const ms=Object.keys(D.porMes).sort();if(ms.length){L.push("POR MES:");ms.forEach(k=>{const x=D.porMes[k];L.push("- "+cap(fmtMes(k))+": "+x.rep+" reparados ("+eur(x.coste)+")"+(x.rec?" · "+x.rec+" recuperados ("+eur(x.ahorro)+")":""));});L.push("");}}
  if(s.mod&&ks.length){L.push("POR MODELO:");ks.forEach(k=>{const x=D.porMod[k],m=modelo(k);L.push("- "+(m?m.ref+" ("+k+")":k)+": "+x.rep+" reparados ("+eur(x.coste)+")"+(x.rec?" · "+x.rec+" recuperados ("+eur(x.ahorro)+" ahorrados)":""));});}
  if(D.sinPrecio.length){L.push("");L.push("Sin precio de reparación (no suman): "+D.sinPrecio.join(", "));}
  return L.join("\n");}
function informeCostes(){draft.ic=draft.ic||"12m";const D=datosIC(draft.ic);
  const seg=el("div",{class:"seg",role:"group","aria-label":"Periodo"},[["mes","Este mes"],["mesant","Mes pasado"],["ano","Este año"],["12m","12 meses"]].map(([k,t])=>el("button",{type:"button","aria-pressed":String(draft.ic===k),text:t,onclick:()=>{draft.ic=k;render(true);}})));
  const t=(h,rows)=>el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},h.map(([x,r])=>el("th",{class:r?"r":null,text:x})))),el("tbody",{},rows)]));
  const ks=Object.keys(D.porMod).sort((a,b)=>D.porMod[b].coste+D.porMod[b].ahorro-D.porMod[a].coste-D.porMod[a].ahorro);const ms=Object.keys(D.porMes).sort();
  return el("details",{class:"card",open:draft.icOpen?true:null,ontoggle:e=>{draft.icOpen=e.target.open;}},[el("summary",{class:"hd",style:"cursor:pointer"},el("h2",{text:"Costes de reparación y ahorro"})),
    el("div",{class:"bd",style:"display:grid;gap:10px"},[seg,
      el("dl",{class:"kpis num"},[["Coste taller",eur(D.coste)],["Reparados",String(D.recib.length)],["Ahorro en planta",eur(D.ahorro)],["Recuperados",String(D.recu.length)],["En taller ahora",D.taller.length+" · "+eur(D.costeTaller)]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))),
      D.sinPrecio.length?el("div",{class:"banner",text:"Sin precio de reparación: "+D.sinPrecio.join(", ")+". Esos ejes no suman. Ponlo en «Precios de reparación»."}):null,
      incluirChips("costes",OPS_IC,null,"Qué incluir al copiar o descargar (se recuerda):").node,
      el("div",{class:"acciones"},[el("button",{type:"button",class:"btn",text:"Descargar Excel",onclick:e=>excelIC(D,e.currentTarget)}),
        el("button",{type:"button",class:"btn sec",text:"Copiar resumen",onclick:async()=>{const tx=textoIC(D);try{await navigator.clipboard.writeText(tx);toast("Resumen copiado");}catch(er){dlg("Resumen",el("textarea",{readonly:true,style:"min-height:240px;font-size:13px",value:tx}),[{t:"Cerrar",cls:"sec"}]);}}}),
        el("button",{type:"button",class:"btn sec",text:"Precios de reparación",onclick:formPrecios})])]),
    ks.length?el("div",{class:"gh",text:"Por modelo · "+D.P.t}):null,ks.length?t([["Modelo"],["Reparados",1],["Coste",1],["Recuperados",1],["Ahorro",1]],ks.map(k=>{const x=D.porMod[k],m=modelo(k);return el("tr",{},[el("td",{text:m?m.ref+" ("+k+")":k}),el("td",{class:"r num",text:x.rep}),el("td",{class:"r num",text:eur(x.coste)}),el("td",{class:"r num",text:x.rec}),el("td",{class:"r num",text:eur(x.ahorro)})]);})):el("p",{class:"hint",style:"padding:8px 14px",text:"No hay reparaciones recibidas ni ejes recuperados en este periodo."}),
    ms.length>1?el("div",{class:"gh",text:"Por mes"}):null,ms.length>1?t([["Mes"],["Reparados",1],["Coste",1],["Recuperados",1],["Ahorro",1]],ms.map(k=>{const x=D.porMes[k];return el("tr",{},[el("td",{text:cap(fmtMes(k))}),el("td",{class:"r num",text:x.rep}),el("td",{class:"r num",text:eur(x.coste)}),el("td",{class:"r num",text:x.rec}),el("td",{class:"r num",text:eur(x.ahorro)})]);})):null,
    el("p",{class:"hint",style:"padding:8px 14px",text:"Coste = importe del albarán si lo pusiste al recibir; si no, el precio de reparación del modelo. Ahorro = precio de reparación de cada eje con pistón agarrotado que recuperas en planta («Recuperado en planta»)."})]);}
function formPrecios(){const x={};(cat.modelos||[]).forEach(m=>x[m.id]=m.precioRep||"");
  const mods=(cat.modelos||[]).slice().sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true}));
  dlg("Precios de reparación por modelo",[el("p",{class:"hint",text:"Lo que suele cobrar el taller por reparar un eje de cada modelo. Si al recibir pones el importe del albarán, se usa ese."}),
    el("div",{class:"tw"},el("table",{},el("tbody",{},mods.map(m=>el("tr",{},[el("td",{},[el("div",{text:m.ref}),el("div",{class:"sub",text:m.cod})]),el("td",{},inp("pr"+m.id,x[m.id],v=>x[m.id]=v,{inputmode:"decimal",class:"num",placeholder:"€",style:"width:90px;padding:7px 6px;font-size:16px"}))])))))],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{(cat.modelos||[]).forEach(m=>{const n=parseN(x[m.id]);if(isFinite(n)&&n>0)m.precioRep=n;else delete m.precioRep;});try{await saveCat();toast("Precios guardados");}catch(e){return false;}render(true);}}]);}
async function excelIC(D,btn){if(!downloads){toast("Esta vista no permite descargar archivos");return;}btn.disabled=true;
  try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();const ref=c=>{const m=modelo(c);return m?m.ref:"";};
    const res=[["Informe de ejes de inyección · MAPRI"],["Periodo",D.P.t+" ("+fmtF(D.P.d)+" a "+fmtF(D.P.h)+")"],[],["Reparados por el taller (recibidos OK)",D.recib.length],["Coste de reparación (€)",Math.round(D.coste*100)/100],
      ["Recuperados en planta",D.recu.length],["Ahorro por recuperar en planta (€)",Math.round(D.ahorro*100)/100],["Enviados a reparar en el periodo",D.env.length],["En el taller ahora",D.taller.length],["Coste previsto de los que están en el taller (€)",Math.round(D.costeTaller*100)/100]];
    if(D.sinPrecio.length)res.push([],["Modelos sin precio (no suman)",D.sinPrecio.join(", ")]);
    const w1=X.utils.aoa_to_sheet(res);w1["!cols"]=[{wch:48},{wch:40}];X.utils.book_append_sheet(wb,w1,"Resumen");
    const pm=Object.keys(D.porMod).map(k=>{const x=D.porMod[k];return{"Modelo":k,"Referencia":ref(k),"Reparados":x.rep,"Coste (€)":Math.round(x.coste*100)/100,"Recuperados en planta":x.rec,"Ahorro (€)":Math.round(x.ahorro*100)/100,"Precio reparación (€)":precioMod(k)||""};});
    if(hojaIC("Por modelo"))X.utils.book_append_sheet(wb,X.utils.json_to_sheet(pm.length?pm:[{"Modelo":"Sin datos"}]),"Por modelo");
    const pmes=Object.keys(D.porMes).sort().map(k=>{const x=D.porMes[k];return{"Mes":cap(fmtMes(k)),"Reparados":x.rep,"Coste (€)":Math.round(x.coste*100)/100,"Recuperados en planta":x.rec,"Ahorro (€)":Math.round(x.ahorro*100)/100};});
    if(hojaIC("Por mes"))X.utils.book_append_sheet(wb,X.utils.json_to_sheet(pmes.length?pmes:[{"Mes":"Sin datos"}]),"Por mes");
    const det=D.recib.sort((a,b)=>a.rec.localeCompare(b.rec)).map(r=>({"Eje":r.eje,"Modelo":r.mod,"Referencia":ref(r.mod),"Desperfecto":r.desp||"","Enviado":r.env?fmtF(r.env):"","Recibido":fmtF(r.rec),"Albarán":r.alb||"","Coste (€)":r.c.v||"","Origen del coste":r.c.o}));
    if(hojaIC("Reparaciones"))X.utils.book_append_sheet(wb,X.utils.json_to_sheet(det.length?det:[{"Eje":"Sin reparaciones en el periodo"}]),"Reparaciones");
    const rc=D.recu.sort((a,b)=>a.f.localeCompare(b.f)).map(r=>({"Fecha recuperado":fmtF(r.f),"Inyectora":r.maq,"Modelo":r.mod,"Referencia":ref(r.mod),"Cambio de pistón":r.fPist?fmtF(r.fPist):"","Ahorro (€)":r.ah||""}));
    if(hojaIC("Recuperados en planta"))X.utils.book_append_sheet(wb,X.utils.json_to_sheet(rc.length?rc:[{"Fecha recuperado":"Sin ejes recuperados en el periodo"}]),"Recuperados en planta");
    await downloads.save({filename:"Informe_ejes_"+D.P.d+"_"+D.P.h+".xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Informe descargado");
  }catch(e){toast(e&&e.code==="declined"?"Descarga cancelada":"No se pudo crear el informe");}btn.disabled=false;}
const hojaIC=n=>incluirSel("costes",OPS_IC)["h:"+n]!==false;

/* ===== RECUENTO DE EJES: revisar modelo a modelo dónde está cada eje y ajustar ===== */
const EST_R=[["planta","En planta"],["preparado","Preparado"],["reparacion","En taller"],["baja","No está"]];
const estR=e=>e.estado==="devuelto"?"reparacion":e.estado;
const porCod=(a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true});
function recuentoEjes(modIni){const mods=(cat.modelos||[]).slice().sort(porCod);if(!mods.length){toast("No hay modelos de eje");return;}
  /* marca por eje: visto (lo veo de repuesto) · maquina (sé que está puesto) · reparacion · preparado · baja. Sin marca = se queda como está */
  const st={mod:modIni||mods[0].cod,f:hoy(),mk:{},nue:[],vistos:new Set()};
  const cuerpo=el("div",{style:"display:grid;gap:10px"});
  const selM=sel("rcMod",[],st.mod,v=>{st.mod=v;pinta();});
  const fin=e=>{const k=st.mk[e.id];return k==="visto"||k==="maquina"?"planta":k||estR(e);};
  const cambia=e=>fin(e)!==estR(e);
  const nCam=cod=>ejes.filter(e=>(!cod||e.mod===cod)&&cambia(e)).length+st.nue.filter(x=>!cod||x.mod===cod).length;
  const opts=()=>{selM.textContent="";mods.forEach(m=>{const n=nCam(m.cod);selM.appendChild(el("option",{value:m.cod,text:(st.vistos.has(m.cod)?"✓ ":"")+m.cod+" · "+m.ref+(n?" ("+n+" cambios)":"")}));});selM.value=st.mod;};
  const info=el("p",{class:"sub",style:"margin:0"});
  const ix=()=>mods.findIndex(m=>m.cod===st.mod);
  const MK=[["visto","Lo veo"],["maquina","En máquina"],["reparacion","En taller"],["preparado","Preparado"]];
  function cuadre(){const m=modelo(st.mod);if(!m)return null;const G=grupoEje(m),cs=G.map(x=>x.cod),M=maqG(m);
    const es=ejes.filter(e=>cs.includes(e.mod));const vis=es.filter(e=>st.mk[e.id]==="visto").length+st.nue.filter(x=>cs.includes(x.mod)).length;
    const sinVer=es.filter(e=>fin(e)==="planta"&&st.mk[e.id]!=="visto");const d=sinVer.length-M;
    const pl=(n,a,b)=>n+" "+(n===1?a:b);if(!es.some(e=>st.mk[e.id])&&!st.nue.some(x=>cs.includes(x.mod)))return el("p",{class:"hint",text:"Cuando marques los repuestos que ves, aquí te dirá si cuadra con las "+pl(M,"máquina","máquinas")+" que llevan este eje."});
    const comp=G.length>1?" (lo comparte con "+G.filter(x=>x.cod!==st.mod).map(x=>x.cod).join(", ")+": se cuentan juntos)":"";
    let txt,niv;
    if(d===0){niv="ok";txt="Cuadra: "+pl(vis,"repuesto visto","repuestos vistos")+" + "+pl(M,"puesto en máquina","puestos en máquina")+" = "+(vis+M)+" en planta"+comp+".";}
    else if(d>0){niv="bad";txt="Sobran "+d+": la app tiene "+sinVer.length+" en planta que no ves, pero solo hay "+pl(M,"máquina","máquinas")+comp+". "+(d===1?"Ese estará en el taller o perdido: márcalo «En taller» (o dalo de baja si se ha desechado).":"Esos "+d+" estarán en el taller o perdidos: márcalos «En taller» (o dales de baja si se han desechado).");}
    else{niv="warn";txt="Faltan "+(-d)+": hay "+pl(M,"máquina","máquinas")+comp+" y solo "+sinVer.length+" ejes en planta sin ver. Alguno que la app tiene en el taller estará ya puesto: márcalo «En máquina».";}
    return el("div",{class:"banner",style:niv==="ok"?"background:var(--ok-bg);color:var(--ok);border-color:var(--ok)":niv==="bad"?"background:var(--bad-bg);color:var(--bad);border-color:var(--bad)":"",text:txt});}
  function pinta(){st.vistos.add(st.mod);opts();cuerpo.textContent="";const m=modelo(st.mod);
    const es=ejes.filter(e=>e.mod===st.mod).sort(porCod);
    cuerpo.appendChild(el("div",{class:"sub",text:m?inyDe(m).length+" máquinas lo llevan ("+(inyDe(m).join(", ")||"ninguna en la ficha")+"). Los puestos en máquina no hace falta identificarlos: déjalos sin tocar.":""}));
    const cq=cuadre();if(cq)cuerpo.appendChild(cq);
    es.forEach(e=>{const ab=abiertaDe(e.cod);const ch=cambia(e);const k=st.mk[e.id];
      const seg=el("div",{class:"seg",role:"group","aria-label":"Dónde está "+e.cod,style:"display:grid;grid-template-columns:repeat(4,1fr);gap:4px"},MK.map(([kk,t])=>{const b=el("button",{type:"button","aria-pressed":String(k===kk),text:t,style:"font-size:12px;padding:7px 2px;min-width:0"});
        b.onclick=()=>{if(st.mk[e.id]===kk)delete st.mk[e.id];else st.mk[e.id]=kk;pinta();};return b;}));
      const est=(EST_E[e.estado]||[e.estado])[0];
      cuerpo.appendChild(el("div",{style:"display:grid;gap:4px;padding:8px 10px;border-radius:8px;border:1px solid "+(k==="baja"?"var(--bad)":ch?"var(--warn)":k?"var(--ok)":"var(--line2)")+";background:"+(k==="baja"?"var(--bad-bg)":ch?"var(--warn-bg)":"transparent")},[
        el("div",{style:"display:flex;justify-content:space-between;gap:8px;align-items:baseline"},[el("b",{text:e.cod}),el("span",{class:"sub",text:"la app dice: "+est+(ab&&ab.desp&&ab.desp!=="—"&&e.estado!=="planta"?" · "+ab.desp:"")+(e.cont?" · contado "+fmtF(e.cont):"")})]),
        k==="baja"?el("div",{style:"display:flex;justify-content:space-between;align-items:center"},[el("span",{class:"sub",text:"Se dará de baja (desechado o perdido)"}),el("button",{type:"button",class:"btn txt peq",text:"Deshacer",onclick:()=>{delete st.mk[e.id];pinta();}})]):seg,
        k==="baja"?null:el("button",{type:"button",class:"btn txt peq",style:"justify-self:end;font-size:12px",text:"Dar de baja…",onclick:()=>confirmar("¿Dar de baja "+e.cod+"?","Solo si se ha desechado o se ha perdido. Si puede estar en el taller, márcalo «En taller». Su historial se conserva.","Dar de baja",()=>{st.mk[e.id]="baja";pinta();})})]));});
    st.nue.filter(x=>x.mod===st.mod).forEach(x=>cuerpo.appendChild(el("div",{style:"display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:8px;border:1px solid var(--ok);background:var(--ok-bg)"},[
      el("span",{},[el("b",{text:x.mod+"-"+x.num}),el("span",{class:"sub",text:" · nuevo, lo veo en planta"})]),el("button",{type:"button",class:"btn txt peq",text:"Quitar",onclick:()=>{st.nue=st.nue.filter(z=>z!==x);pinta();}})])));
    const nI=inp("rcNum","",null,{inputmode:"numeric",class:"num",placeholder:"Nº",style:"width:80px"});
    cuerpo.appendChild(el("div",{style:"display:flex;gap:8px;align-items:center;flex-wrap:wrap"},[el("span",{class:"sub",text:"¿Ves uno que no sale en la lista? "+st.mod+"-"}),nI,
      el("button",{type:"button",class:"btn sec peq",text:"Añadir",onclick:()=>{const n=parseInt(nI.value,10);if(!(n>0)){toast("Pon el número");return;}const cod=st.mod+"-"+n;
        if(ejes.some(z=>z.cod===cod)||st.nue.some(z=>z.mod===st.mod&&z.num===n)){toast(cod+" ya está en la lista");return;}st.nue.push({mod:st.mod,num:n});pinta();}})]));
    const i=ix();if(i<mods.length-1)cuerpo.appendChild(el("button",{type:"button",class:"btn sec",text:"Siguiente modelo: "+mods[i+1].cod+" →",onclick:()=>{st.mod=mods[i+1].cod;pinta();const d=cuerpo.closest(".dlg");if(d)d.scrollTop=0;}}));
    const t=nCam();info.textContent=t?t+" ejes cambian en total":"Sin cambios todavía";}
  const nav=el("div",{style:"display:flex;gap:8px"},[el("button",{type:"button",class:"btn sec peq",text:"← Anterior",onclick:()=>{const i=ix();if(i>0){st.mod=mods[i-1].cod;pinta();}}}),
    el("button",{type:"button",class:"btn sec peq",text:"Siguiente modelo →",onclick:()=>{const i=ix();if(i<mods.length-1){st.mod=mods[i+1].cod;pinta();}else toast("Era el último modelo");}})]);
  pinta();
  dlg("Recuento de ejes",[el("p",{class:"hint",text:"Marca solo lo que sabes: «Lo veo» los repuestos que tienes delante y «En taller» los que te confirma el taller. Los que están puestos en las máquinas déjalos sin tocar; la app comprueba que cuadren con el número de máquinas. Lo que no toques se queda como está."}),
    fld("Fecha del recuento",inp("rcF",st.f,v=>st.f=v,{type:"date"})),fld("Modelo",selM),nav,cuerpo,info],
    [{t:"Cancelar",cls:"sec"},{t:"Guardar recuento",fn:async()=>{const t=nCam();const vistos=Object.keys(st.mk).length;if(!t&&!vistos){toast("No has marcado nada");return false;}
      if(t&&!confirm("Se van a ajustar "+t+" ejes. Las reparaciones abiertas se cierran o se anulan según corresponda. ¿Seguir?"))return false;
      const cam={};Object.keys(st.mk).forEach(id=>{cam[id]=st.mk[id]==="visto"||st.mk[id]==="maquina"?"planta":st.mk[id];});
      try{const n=await aplicarRecuento({f:st.f,cam,nue:st.nue,vistos:st.vistos,marcados:Object.keys(st.mk)});toast(n?"Recuento guardado: "+n+" ejes ajustados":"Recuento guardado: todo cuadraba");}catch(e){toast("No se pudo guardar: "+(e&&e.message||"error"));return false;}render(true);}}]);}
async function aplicarRecuento(st){const f=st.f||hoy();let n=0;
  for(const id of Object.keys(st.cam)){const e=ejes.find(x=>x.id===id);const nu=st.cam[id];if(!e||estR(e)===nu)continue;const ant=estR(e);const ab=abiertaDe(e.cod);
    if(nu==="baja"){if(ab)await updReps([[ab,{res:"anulada",rec:f,obs:"Baja en recuento"}]]);await updEje(e,{estado:"baja",baja:f,cont:f});}
    else if(nu==="planta"){if(ab)await updReps([[ab,ant==="reparacion"?{res:"ok",rec:f,recuento:true}:{res:"anulada",rec:f}]]);await updEje(e,{estado:"planta",cont:f});}
    else if(nu==="reparacion"){if(ab&&!ab.env)await updReps([[ab,{env:f}]]);else if(!ab)await addRep({eje:e.cod,desp:"SIN DATOS (RECUENTO)",alta:f,env:f,recuento:true});await updEje(e,{estado:"reparacion",cont:f});}
    else if(nu==="preparado"){if(!ab)await addRep({eje:e.cod,desp:"SIN DATOS (RECUENTO)",alta:f,env:null,recuento:true});else if(ab.env)await updReps([[ab,{env:null}]]);await updEje(e,{estado:"preparado",cont:f});}
    n++;}
  for(const x of st.nue){const cod=x.mod+"-"+x.num;if(ejes.some(z=>z.cod===cod))continue;
    await db.doc("ejes/"+docId(cod)).set({cod,mod:x.mod,num:x.num,estado:"planta",marcado:true,obs:"Alta en recuento",alta:f,cont:f});n++;}
  const vis=[...st.vistos];let tocado=false;(cat.modelos||[]).forEach(m=>{if(vis.includes(m.cod)){m.cont=f;tocado=true;}});if(tocado)await saveCat();
  return n;}

/* ===== REVISIÓN DE EJES: marcar uno a uno por código, avisando de códigos repetidos ===== */
const revDesde=()=>(cat.revEjes||{}).desde||null;
const revisado=e=>!!(revDesde()&&e.rev&&e.rev.slice(0,10)>=revDesde());
const codN=c=>String(c||"").toUpperCase().replace(/[\s.\-_]/g,"");
const horaRev=t=>{if(!t)return"";const d=new Date(t);return isNaN(d)?fmtF(String(t).slice(0,10)):fmtF(t.slice(0,10))+" "+d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});};
/* pasa un eje a otro estado dejando las reparaciones coherentes */
async function cambiarEstadoEje(e,nu,f,extra){const ant=estR(e),ab=abiertaDe(e.cod);const x=Object.assign({},extra||{});
  if(ant===nu){await updEje(e,x);return;}
  if(nu==="baja"){if(ab)await updReps([[ab,{res:"anulada",rec:f,obs:"Baja en revisión"}]]);x.baja=f;}
  else if(nu==="planta"){if(ab)await updReps([[ab,ant==="reparacion"?{res:"ok",rec:f,recuento:true}:{res:"anulada",rec:f}]]);}
  else if(nu==="reparacion"){if(ab&&!ab.env)await updReps([[ab,{env:f}]]);else if(!ab)await addRep({eje:e.cod,desp:"SIN DATOS (REVISIÓN)",alta:f,env:f,recuento:true});}
  else if(nu==="preparado"){if(!ab)await addRep({eje:e.cod,desp:"SIN DATOS (REVISIÓN)",alta:f,env:null,recuento:true});else if(ab.env)await updReps([[ab,{env:null}]]);}
  await updEje(e,Object.assign({estado:nu},x));Object.assign(e,{estado:nu},x);}
function revisionEjes(){if(!db){toast("No se puede guardar en esta vista");return;}
  const st={msg:null,abierto:null,ult:[]};
  const res=el("div",{"aria-live":"polite"}),cab=el("div"),lst=el("div",{style:"display:grid;gap:8px"});
  const dl=el("datalist",{id:"lRevE"});
  const cI=inp("revCod","",null,{list:"lRevE",autocomplete:"off",placeholder:"Código del eje (p. ej. 2.3.C-4)",style:"font-size:18px"});
  const aviso=(niv,txt,btns)=>{res.textContent="";res.appendChild(el("div",{class:"banner",style:niv==="ok"?"background:var(--ok-bg);color:var(--ok);border-color:var(--ok)":niv==="bad"?"background:var(--bad-bg);color:var(--bad);border-color:var(--bad);font-weight:600":"",},[el("div",{text:txt})].concat(btns&&btns.length?[el("div",{style:"display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"},btns)]:[])));};
  async function marcar(){const raw=cI.value.trim();if(!raw)return;const n=codN(raw);const e=ejes.find(z=>codN(z.cod)===n);
    if(!e){const m=(cat.modelos||[]).slice().sort((a,b)=>b.cod.length-a.cod.length).find(mo=>n.startsWith(codN(mo.cod)));const num=m?parseInt(n.slice(codN(m.cod).length),10):NaN;
      aviso("warn","«"+raw+"» no existe en la app."+(m&&num>0?" ¿Es un eje nuevo del modelo "+m.ref+" ("+m.cod+")?":" Revisa el código."),m&&num>0?[el("button",{type:"button",class:"btn peq",text:"Dar de alta "+m.cod+"-"+num,onclick:async()=>{const cod=m.cod+"-"+num;const ts=new Date().toISOString();
        await db.doc("ejes/"+docId(cod)).set({cod,mod:m.cod,num,estado:"planta",marcado:true,obs:"Alta en revisión",alta:hoy(),cont:hoy(),rev:ts});st.ult.unshift(cod);aviso("ok","✓ "+cod+" dado de alta y revisado.");cI.value="";cI.focus();setTimeout(pinta,300);}})]:null);return;}
    if(revisado(e)){aviso("bad",""+e.cod+" YA ESTÁ REVISADO ("+horaRev(e.rev)+"). Puede que haya dos ejes con el mismo código: comprueba la marca grabada.");cI.select();return;}
    const ts=new Date().toISOString(),ant=estR(e),antTxt=(EST_E[e.estado]||[e.estado])[0];
    try{await cambiarEstadoEje(e,"planta",hoy(),{rev:ts,cont:hoy()});}catch(er){aviso("bad","No se pudo guardar: "+(er&&er.message||"error"));return;}
    st.ult.unshift(e.cod);st.abierto=e.mod;
    const mq=maqsDeEje(e);const bts=mq.map(c=>el("button",{type:"button",class:"btn sec peq",text:"Puesto en "+c,onclick:async()=>{await ponerEnMaq(e,c);aviso("ok","✓ "+e.cod+" revisado y puesto en "+c+".");setTimeout(pinta,300);cI.focus();}}));
    if(e.maq)bts.push(el("button",{type:"button",class:"btn txt peq",text:"Es repuesto",onclick:async()=>{await quitarDeMaq(e);aviso("ok","✓ "+e.cod+" revisado · de repuesto.");setTimeout(pinta,300);cI.focus();}}));
    aviso(ant==="planta"?"ok":"warn",(ant==="planta"?"✓ "+e.cod+" revisado · "+ejeRef(e):"✓ "+e.cod+" revisado. La app lo tenía «"+antTxt+"»: lo he pasado a planta.")+(e.maq?" Apuntado puesto en "+e.maq+".":mq.length?" Si está puesto en una máquina, toca cuál:":""),bts);
    cI.value="";cI.focus();setTimeout(pinta,300);}
  cI.addEventListener("keydown",ev=>{if(ev.key==="Enter"){ev.preventDefault();marcar();}});
  function pinta(){const d=revDesde();const vivos=ejes.filter(e=>e.estado!=="baja");const tot=vivos.length,rv=vivos.filter(revisado).length;
    dl.textContent="";ejes.filter(e=>!revisado(e)).sort(porCod).forEach(e=>dl.appendChild(el("option",{value:e.cod})));
    cab.textContent="";cab.appendChild(el("div",{style:"display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"},[
      el("span",{class:"sub",text:d?"Revisión desde el "+fmtF(d)+": "+rv+" de "+tot+" revisados":"Sin revisión empezada"}),
      el("button",{type:"button",class:"btn sec peq",text:d?"Empezar otra revisión":"Empezar revisión",onclick:()=>confirmar("¿Empezar una revisión nueva?","Todos los ejes vuelven a quedar como «sin revisar». No se borra nada más.","Empezar",async()=>{cat.revEjes={desde:hoy()};await saveCat();res.textContent="";pinta();})})]));
    if(!d){lst.textContent="";return;}
    lst.textContent="";const vistos=new Set();
    (cat.modelos||[]).slice().sort(porCod).forEach(m=>{const k=grupoKey(m);if(vistos.has(k))return;vistos.add(k);const G=grupoEje(m),cs=G.map(x=>x.cod),M=maqG(m);
      const es=ejes.filter(e=>cs.includes(e.mod)&&e.estado!=="baja").sort(porCod);if(!es.length)return;const r=es.filter(revisado);const sinRev=es.filter(e=>!revisado(e));
      const plSin=sinRev.filter(e=>estR(e)==="planta").length,dif=plSin-Math.max(0,M-r.filter(e=>e.maq&&estR(e)==="planta").length);
      const niv=!r.length?"":dif===0?"ok":dif>0?"bad":"warn";
      const txt=!r.length?"sin empezar":dif===0?"cuadra":dif>0?"sobran "+dif:"faltan "+(-dif);
      const abierto=st.abierto===k||st.abierto===m.cod;
      const det=abierto?el("div",{style:"display:grid;gap:6px;padding:8px 0 4px"},[
        el("p",{class:"hint",text:"Sin revisar en planta: "+plSin+" · máquinas que lo llevan: "+M+(inyDe(m).length||G.length>1?" ("+[...new Set([].concat(...G.map(inyDe)))].join(", ")+")":"")+". "+(dif>0?"Sobran "+dif+": de los que no has visto, alguno estará en el taller o perdido.":dif<0?"Faltan "+(-dif)+": algún eje que la app tiene en el taller estará puesto en máquina.":"Los que quedan sin revisar en planta son los puestos en máquina.")}),
      ].concat(sinRev.map(e=>el("div",{style:"display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;border-top:1px solid var(--line2);padding-top:6px"},[
        el("span",{},[el("b",{text:e.cod}),el("span",{class:"sub",text:" · "+(EST_E[e.estado]||[e.estado])[0]})]),
        el("div",{style:"display:flex;gap:4px;flex-wrap:wrap"},[estR(e)!=="reparacion"?el("button",{type:"button",class:"btn sec peq",text:"Está en el taller",onclick:async()=>{await cambiarEstadoEje(e,"reparacion",hoy(),{cont:hoy()});toast(e.cod+" en taller");setTimeout(pinta,300);}}):null,
          estR(e)!=="planta"?el("button",{type:"button",class:"btn sec peq",text:"Está en máquina",onclick:async()=>{await cambiarEstadoEje(e,"planta",hoy(),{cont:hoy()});toast(e.cod+" en planta");setTimeout(pinta,300);}}):null,
          el("button",{type:"button",class:"btn txt peq",text:"Baja…",onclick:()=>confirmar("¿Dar de baja "+e.cod+"?","Solo si se ha desechado o perdido. Si puede estar en el taller, usa «Está en el taller». Su historial se conserva.","Dar de baja",async()=>{await cambiarEstadoEje(e,"baja",hoy(),{cont:hoy()});setTimeout(pinta,300);})})])])))):null;
      lst.appendChild(el("div",{style:"border:1px solid var(--line2);border-radius:8px;padding:8px 10px"},[
        el("button",{type:"button",style:"appearance:none;border:0;background:none;font:inherit;color:inherit;width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer;padding:0;text-align:left",onclick:()=>{st.abierto=abierto?null:k;pinta();}},[
          el("span",{},[el("b",{text:G.map(x=>x.cod).join(" + ")}),el("span",{class:"sub",text:" · "+r.length+"/"+es.length+" revisados"})]),
          el("span",{class:"pill "+(niv||"na"),text:txt})]),det]));});}
  pinta();
  dlg("Revisar ejes",[el("p",{class:"hint",text:"Escribe el código grabado en cada eje que revises y pulsa Intro. Si un código ya está revisado te avisa: puede haber dos ejes con el mismo código. Los puestos en máquina no hace falta revisarlos: la app comprueba que cuadren con las máquinas."}),
    cab,el("div",{style:"display:flex;gap:8px"},[cI,el("button",{type:"button",class:"btn",text:"Revisado",onclick:marcar})]),dl,res,lst],[{t:"Cerrar",cls:"sec"}]);
  setTimeout(()=>cI.focus(),60);}

