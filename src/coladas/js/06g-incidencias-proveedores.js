/* ---------- Incidencias del material y nota de cada proveedor ----------
   Incidencias: problemas con una colada o un camión (sucio, mojado, aleación equivocada, faltan fardos…) con foto,
   para reclamar al proveedor. Se guardan en la colección «incid» (un documento por año, lista items).
   Nota del proveedor: resumen del año de cada proveedor (camiones, kilos, precio medio, puntualidad frente al
   calendario, diferencias de báscula e incidencias). */
let incidAnos={};
const INC_TIPOS=["Fardos sucios o con barro","Mojados o con humedad","Aleación o colada equivocada","Faltan fardos","El peso no cuadra","Etiqueta mal o sin etiqueta","Fardos rotos o mal flejados","Llegó tarde o fuera de horario","Otro"];
const INC_EST={abierta:["Abierta","bad"],reclamada:["Reclamada al proveedor","warn"],cerrada:["Cerrada","ok"]};
function todasIncid(){const o=[];Object.keys(incidAnos).forEach(y=>(incidAnos[y]||[]).forEach(r=>o.push(r)));return o.sort((a,b)=>(b.f||"").localeCompare(a.f||"")||(b.ts||0)-(a.ts||0));}
function provDeLote(l){if(!l)return"";if(l.proveedor)return l.proveedor;const e=todosMovs().find(r=>r.t==="E"&&r.d===l.id&&r.p);return e?e.p:"";}
function nuevaIncid(l,re){const v={f:hoy(),tipo:"",fa:"",kg:"",nota:"",foto:null};const err=el("div",{class:"banner b",hidden:""});
  const cerrar=()=>ov.remove();
  const guardar=async e=>{const b=e.currentTarget;if(!v.tipo){err.textContent="Elige qué ha pasado.";err.hidden=false;return;}
    const fa=numES(v.fa),kg=numES(v.kg);b.disabled=true;
    try{let ft=null;if(v.foto){b.textContent="Subiendo la foto…";try{ft=await subirFoto(v.foto);}catch(x){toast("La foto no se pudo subir; guardo lo demás");}}
      const rec={i:uid("n"),f:v.f,ts:Date.now(),lote:l.id,colada:l.nombre,nave:l.nave,mat:l.material,prov:provDeLote(l),tipo:v.tipo,estado:"abierta",por:(window.yoNombre&&window.yoNombre())||""};
      if(fa>0)rec.fa=fa;if(kg>0)rec.kg=kg;if(v.nota.trim())rec.nota=v.nota.trim();if(ft)rec.ft=ft;
      await itemsAdd("incid",v.f.slice(0,4),[rec]);cerrar();toast("Incidencia apuntada");if(re)re();render();}
    catch(x){b.disabled=false;b.textContent="Guardar";err.textContent="No se pudo guardar. Inténtalo otra vez.";err.hidden=false;}};
  const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)cerrar();}},[el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"Incidencia"},[
    el("h3",{text:"Incidencia con el material"}),el("p",{class:"sub",text:l.nombre+" · "+l.nave+" · "+(provDeLote(l)||"sin proveedor")}),
    el("form",{onsubmit:e=>e.preventDefault()},[
      el("label",{text:"¿Qué ha pasado?"},[el("select",{id:"inc-tipo",onchange:e=>{v.tipo=e.target.value;}},[el("option",{value:"",text:"Elige…"})].concat(INC_TIPOS.map(t=>el("option",{value:t,text:t}))))]),
      el("div",{class:"row"},[el("label",{text:"Día"},[el("input",{type:"date",max:hoy(),value:v.f,onchange:e=>{v.f=e.target.value||hoy();}})]),
        el("label",{text:"Fardos afectados"},[el("input",{id:"inc-fa",class:"num",type:"text",inputmode:"numeric",placeholder:"opcional",oninput:e=>{v.fa=e.target.value;}})]),
        el("label",{text:"Kilos"},[el("input",{class:"num",type:"text",inputmode:"decimal",placeholder:"opcional",oninput:e=>{v.kg=e.target.value;}})])]),
      el("label",{text:"Nota"},[el("input",{id:"inc-nota",type:"text",placeholder:"qué se ha visto, a quién se ha avisado…",oninput:e=>{v.nota=e.target.value;}})]),
      el("label",{text:"Foto (opcional)"},[el("input",{type:"file",accept:"image/*",onchange:e=>{v.foto=e.target.files&&e.target.files[0]||null;}})]),err]),
    el("div",{class:"dlg-b"},[el("button",{type:"button",class:"btn sec",text:"Cancelar",onclick:cerrar}),el("button",{type:"button",class:"btn",id:"inc-ok",text:"Guardar",onclick:guardar})])])]);
  document.body.appendChild(ov);}
async function estadoIncid(r,est){try{await itemsPut("incid",r.f.slice(0,4),Object.assign({},r,{estado:est,["f_"+est]:hoy()}));toast(INC_EST[est][0]);render();}catch(e){toast("No se pudo guardar");}}
function filaIncid(r,conCol){const[et,ec]=INC_EST[r.estado]||INC_EST.abierta;
  return el("div",{class:"it",style:"cursor:default;flex-wrap:wrap"},[el("span",{class:"stripe "+ec}),
    el("div",{class:"ppal",style:"min-width:0"},[el("div",{class:"t1",text:r.tipo+(conCol?" · "+(r.colada||"?"):"")}),
      el("div",{class:"t2",text:[dmy(r.f),r.prov||"sin proveedor",r.nave,r.fa?r.fa+" f":null,r.kg?fmt(r.kg)+" kg":null,r.nota].filter(Boolean).join(" · ")})]),
    el("span",{class:"pill "+ec,text:et}),
    el("div",{style:"display:flex;gap:6px;flex-wrap:wrap;width:100%;justify-content:flex-end"},[
      r.ft?el("button",{type:"button",class:"btn sec peq",text:"Foto",onclick:()=>verFoto(r.ft)}):null,
      r.estado==="abierta"?el("button",{type:"button",class:"btn sec peq",text:"Reclamada",onclick:()=>estadoIncid(r,"reclamada")}):null,
      r.estado!=="cerrada"?el("button",{type:"button",class:"btn sec peq",text:"Cerrar",onclick:()=>estadoIncid(r,"cerrada")}):el("button",{type:"button",class:"btn txt peq",text:"Reabrir",onclick:()=>estadoIncid(r,"abierta")})].filter(Boolean))]);}
/* en la ficha de una colada */
function cardIncidColada(l,re){const L=todasIncid().filter(r=>r.lote===l.id);
  return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Incidencias"}),el("span",{class:"der sub",text:L.length?L.length+"":"ninguna"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:8px"},[L.length?el("div",{class:"lst"},L.map(r=>filaIncid(r,false))):null,
      el("button",{type:"button",class:"btn sec",id:"inc-nueva",text:"＋ Apuntar una incidencia con esta colada",onclick:()=>nuevaIncid(l,re)})].filter(Boolean))]);}
/* en Consultas: todas */
let incFil="vivas";
function vIncidencias(){const T=todasIncid(),L=T.filter(r=>incFil==="todas"||(incFil==="vivas"?r.estado!=="cerrada":r.estado==="cerrada"));const ab=T.filter(r=>r.estado!=="cerrada").length;
  return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Incidencias del material"}),el("span",{class:"der pill "+(ab?"warn":"ok"),text:ab?ab+" sin cerrar":"✓ ninguna abierta"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[
      el("p",{class:"hint",style:"margin:0",text:"Se apuntan desde la ficha de cada colada (botón «Apuntar una incidencia»), con foto si hace falta. Aquí se ven todas para reclamarlas al proveedor."}),
      el("div",{class:"seg"},[["vivas","Sin cerrar"],["cerradas","Cerradas"],["todas","Todas"]].map(([k,t])=>el("button",{type:"button","aria-pressed":String(incFil===k),text:t,onclick:()=>{incFil=k;render();}}))),
      L.length?el("div",{class:"lst"},L.slice(0,200).map(r=>filaIncid(r,true))):el("p",{class:"empty",text:"No hay incidencias con este filtro."})])]);}
/* ---------- nota de cada proveedor en un año ---------- */
let anoProv=null;
function notaProveedores(y){const P={},hoyF=hoy();const get=p=>P[p]=P[p]||{p,n:0,fa:0,kg:0,eur:0,kgP:0,prev:0,tiempo:0,tarde:0,diasT:0,nollega:0,bas:0,basKg:0,inc:0,incAb:0};
  const ms=Object.keys(meses).filter(m=>m.startsWith(y)&&(meses[m]||[]).some(r=>!r.h));
  ms.forEach(m=>{const I=informeMes(m);I.entradas.filter(e=>!e.h).forEach(e=>{const o=get(e.r.p||e.l.proveedor||"Sin proveedor");o.n++;o.fa+=e.fa;o.kg+=e.kg;if(e.precio){o.eur+=e.importe;o.kgP+=e.kg;}
      if(typeof e.r.kb==="number"&&Math.abs(e.r.kb-e.kg)>Math.max(50,e.kg*0.005)){o.bas++;o.basKg+=e.r.kb-e.kg;}});
    ((cfg.plan||{})[m]||{}).entradas&&cfg.plan[m].entradas.forEach(x=>{if(x.o==="B"||x.ext)return;const l=x.rec&&x.rec.l?lotes.find(z=>z.id===x.rec.l):null;const p=x.p||(l&&provDeLote(l))||"";if(!p)return;const o=get(p);
      if(x.rec&&x.rec.f){o.prev++;const d=Math.round((fDate0(x.rec.f)-fDate0(x.f))/864e5);if(d<=0)o.tiempo++;else{o.tarde++;o.diasT+=d;}}else if(x.f<hoyF){o.prev++;o.nollega++;}});});
  todasIncid().filter(r=>(r.f||"").startsWith(y)).forEach(r=>{const o=get(r.prov||"Sin proveedor");o.inc++;if(r.estado!=="cerrada")o.incAb++;});
  return Object.values(P).filter(o=>o.n||o.inc||o.prev).sort((a,b)=>b.kg-a.kg);}
const fDate0=f=>new Date(+f.slice(0,4),+f.slice(5,7)-1,+f.slice(8,10));
function vProveedoresAno(){const anos=[...new Set(Object.keys(meses).filter(m=>(meses[m]||[]).some(r=>!r.h)).map(m=>m.slice(0,4)))].sort().reverse();if(!anos.length)return null;
  if(!anoProv||!anos.includes(anoProv))anoProv=anos[0];const N=notaProveedores(anoProv),provs=N.map(o=>o.p);
  const dot=p=>el("span",{class:"tagm",style:"background:"+(typeof colProv==="function"?colProv(p,provs):"var(--mut)")});
  const pct=(a,b)=>b?Math.round(a/b*100)+" %":"—";
  return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Proveedores del año"}),el("span",{class:"der sub",text:N.length+" proveedores"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[
      el("label",{text:"Año"},[el("select",{id:"prov-ano",onchange:e=>{anoProv=e.target.value;render();}},anos.map(a=>{const o=el("option",{value:a,text:a});if(a===anoProv)o.selected=true;return o;}))]),
      N.length?el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},["Proveedor","Camiones","Kg","€/kg medio","A tiempo","Retrasos","Sin llegar","Báscula distinta","Incidencias"].map((t,i)=>el("th",{class:i?"r":"",text:t})))]),
        el("tbody",{},N.map(o=>el("tr",{},[el("td",{},[dot(o.p),document.createTextNode(o.p)]),el("td",{class:"r num",text:fmt(o.n)}),el("td",{class:"r num",text:fmt(Math.round(o.kg))}),
          el("td",{class:"r num",text:o.kgP?(o.eur/o.kgP).toLocaleString("es-ES",{minimumFractionDigits:3,maximumFractionDigits:4}):"—"}),
          el("td",{class:"r num",text:o.prev?pct(o.tiempo,o.prev):"—"}),el("td",{class:"r num",text:o.tarde?o.tarde+" (media "+Math.round(o.diasT/o.tarde)+" d)":"0"}),
          el("td",{class:"r num",text:String(o.nollega)}),el("td",{class:"r num",text:o.bas?o.bas+" ("+(o.basKg>0?"+":"−")+fmt(Math.abs(Math.round(o.basKg)))+" kg)":"0"}),
          el("td",{class:"r num"},[o.inc?el("span",{class:"pill "+(o.incAb?"warn":"ok"),text:o.inc+(o.incAb?" · "+o.incAb+" abiertas":"")}):document.createTextNode("0")])])))])]):el("p",{class:"empty",text:"Sin datos de proveedores este año."}),
      el("p",{class:"hint",style:"margin:0",text:"«A tiempo» y «Retrasos» comparan el día que tenía cada camión en el calendario con el día que llegó. «Sin llegar»: camiones del calendario con el día ya pasado que no han llegado. Báscula distinta: más de 50 kg y del 0,5 % con el albarán."})])]);}
/* ---------- certificado de calidad de la colada (fotos en la ficha de la colada: l.cert = [ids]) ---------- */
function cardCertColada(l,re){const C=l.cert||[];
  const sube=async e=>{const fs=[...(e.target.files||[])];if(!fs.length)return;const b=e.target;b.disabled=true;
    try{const ids=[];for(const f of fs)ids.push(await subirFoto(f));await db.doc("lotes/"+l.id).update({cert:C.concat(ids)});toast(ids.length===1?"Certificado guardado":ids.length+" fotos guardadas");if(re)re();}
    catch(x){toast("No se pudo subir el certificado");}finally{b.disabled=false;b.value="";}};
  const quita=async id=>{if(!(await confirmar("¿Quitar esta foto del certificado de "+l.nombre+"?",{titulo:"Quitar foto",ok:"Quitar"})))return;
    try{await db.doc("lotes/"+l.id).update({cert:C.filter(x=>x!==id)});if(re)re();}catch(x){toast("No se pudo guardar");}};
  return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Certificado de calidad"}),el("span",{class:"der sub",text:C.length?C.length+(C.length===1?" foto":" fotos"):"sin certificado"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:8px"},[
      el("p",{class:"hint",style:"margin:0",text:"El análisis de la colada que manda el proveedor. Hazle una foto (o varias si tiene más de una hoja): así lo tienes a mano si hay una reclamación o lo pide el auditor."}),
      C.length?el("div",{style:"display:flex;gap:8px;flex-wrap:wrap"},C.map(id=>el("div",{style:"display:flex;flex-direction:column;gap:4px;align-items:center"},[
        el("img",{class:"thumb",src:fotoUrl(id),alt:"Certificado de "+l.nombre,style:"width:96px;height:96px;object-fit:cover;cursor:pointer;border-radius:6px",onclick:()=>verFoto(id)}),
        el("button",{type:"button",class:"btn txt peq",text:"Quitar",onclick:()=>quita(id)})]))):null,
      el("label",{class:"btn sec",style:"text-align:center;cursor:pointer"},[document.createTextNode(C.length?"＋ Añadir otra foto":"＋ Añadir foto del certificado"),
        el("input",{id:"cert-in",type:"file",accept:"image/*",multiple:true,style:"display:none",onchange:sube})])].filter(Boolean))]);}
/* ---------- trazabilidad: ¿qué colada se usaba ese día? ---------- */
const TZ={f:"",nave:""};
function vTrazabilidad(){if(!TZ.f)TZ.f=hoy();if(!TZ.nave)TZ.nave=NAVES[0];
  const ms=todosMovs().filter(r=>r.t==="C"&&!r.h&&r.f===TZ.f&&(lotes.find(l=>l.id===r.o)||{}).nave===TZ.nave);
  const S=conCorte(TZ.f,saldos);
  const filas=TURNOS.map(u=>{const R=ms.filter(r=>r.u===u),porL={};R.forEach(r=>{const o=porL[r.o]=porL[r.o]||{fa:0,kg:0,fifo:false};o.fa+=Math.abs(r.fa||0);o.kg+=Math.abs(kgAp(r,S)||0);if(/Fuera de FIFO/.test(r.n||""))o.fifo=true;});
    const q=typeof quienTxt==="function"?quienTxt(TZ.f,TZ.nave,u):"";
    return el("div",{class:"it",style:"cursor:default;flex-wrap:wrap"},[el("span",{class:"stripe "+(R.length?"ok":"")}),el("div",{class:"ppal",style:"min-width:0"},[
      el("div",{class:"t1",text:u}),
      el("div",{class:"t2",text:R.length?Object.entries(porL).map(([id,o])=>{const l=lotes.find(x=>x.id===id)||{};return(l.nombre||"?")+" ("+(MAT[l.material]?MAT[l.material].nom:"")+", "+(l.proveedor||provDeLote(l)||"sin proveedor")+"): "+o.fa+" f · "+fmt(Math.round(o.kg))+" kg"+(o.fifo?" · fuera de FIFO":"");}).join(" · "):"Sin consumo apuntado en este relevo"}),
      q?el("div",{class:"sub",text:q}):null])]);});
  const enNave=LINEAS.filter(([n])=>n===TZ.nave).flatMap(([n,m])=>fifoLista(n,m,S).slice(0,3).map(l=>l.nombre+" ("+MAT[m].nom+", "+fmt(S[l.id].fa)+" f)"));
  return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"¿Qué colada se usaba ese día?"}),el("span",{class:"der sub",text:"trazabilidad"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[
      el("p",{class:"hint",style:"margin:0",text:"Si hay una reclamación de una pieza, elige el día en que se fabricó y la nave: sale qué coladas se gastaron en cada relevo, de qué proveedor y quién estaba en el horno."}),
      el("div",{class:"row"},[el("label",{text:"Día"},[el("input",{id:"tz-f",type:"date",max:hoy(),value:TZ.f,onchange:e=>{TZ.f=e.target.value||hoy();render();}})]),
        el("label",{text:"Nave"},[el("div",{class:"seg"},NAVES.map(n=>el("button",{type:"button","aria-pressed":String(TZ.nave===n),text:n,onclick:()=>{TZ.nave=n;render();}})))])]),
      el("div",{class:"lst"},filas),
      enNave.length?el("p",{class:"hint",style:"margin:0",text:"Al acabar ese día quedaban en la nave, por orden de entrada: "+enNave.join(" · ")+"."}):null].filter(Boolean))]);}
