/* ---------- Registro de cambios (para la auditoría) ----------
   La base de datos apunta cada cambio en la tabla «cambios» (quién, cuándo, qué había antes y qué hay después),
   para siempre: apuntes de consumo, entradas, ajustes y traslados (mov), coladas (lotes) y ajustes de la app (cfg).
   Aquí se leen y se cuentan en palabras. Los cambios hechos directamente en la base de datos salen como tales. */
const REG={L:null,cargando:false,err:null,usu:{},filtro:"cambios",mes:""};
const REG_CFG={precios:"Precios",pedidos:"Nº de pedido",candado:"Candado de mes",fab:"Cifras de la fábrica",plan:"Plan y calendario de camiones",
  proveedores:"Proveedores",provNave:"Nave de descarga de cada proveedor",minimos:"Mínimos",recuentos:"Recuentos hechos",cierres:"Cierres enviados",
  horneros:"Horneros",envioParte:"Envío del parte",maquinas:"Máquinas"};
async function cargarCambios(f){const sb=window.sbColada;if(!sb){REG.err="Solo se puede ver en la app conectada.";REG.L=[];return;}
  try{let q=sb.from("cambios").select("id,at,por,col,doc,item,op,antes,despues").in("col",["mov","lotes","cfg"]).order("at",{ascending:false}).limit(500);
    if(f&&f.mov)q=sb.from("cambios").select("id,at,por,col,doc,item,op,antes,despues").eq("col","mov").eq("doc",f.mov).order("at",{ascending:false}).limit(500);
    const r=await q;if(r.error)throw r.error;
    if(!Object.keys(REG.usu).length){try{const u=await sb.from("usuarios").select("user_id,nombre");(u.data||[]).forEach(x=>{REG.usu[x.user_id]=x.nombre;});}catch(e){}}
    REG.err=null;return r.data||[];}
  catch(e){REG.err="No se pudo leer el registro: "+(e.message||e);return[];}}
const quienCambio=c=>c.por?(REG.usu[c.por]||"un usuario"):"directo en la base de datos";
const horaCambio=c=>{const d=new Date(c.at);return dmy(ymd(d))+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");};
const TIPO_MOV={C:"Consumo",E:"Entrada",A:"Ajuste",T:"Traslado",G:"Granalla de cobre"};
function txtCambio(c){const v=c.despues||c.antes||{};
  if(c.col==="mov"){const l=lotes.find(x=>x.id===(v.o||v.d))||{};
    const base=(TIPO_MOV[v.t]||"Apunte")+" · "+(l.nombre||(v.t==="G"?"granalla":"colada sin saber"))+(l.nave?" · "+l.nave:"")+" · "+(v.f?dmy(v.f):"")+(v.u?" "+String(v.u).toLowerCase():"");
    if(c.op==="alta")return{t:"Nuevo: "+base,d:(v.fa!=null?Math.abs(v.fa)+" f":"")+(typeof v.kg==="number"?" · "+fmt(Math.abs(Math.round(v.kg)))+" kg":"")};
    if(c.op==="baja")return{t:"Borrado: "+base,d:(v.fa!=null?Math.abs(v.fa)+" f":"")+(typeof v.kg==="number"?" · "+fmt(Math.abs(Math.round(v.kg)))+" kg":"")};
    const A=c.antes||{},D=c.despues||{},N={fa:"fardos",kg:"kilos",f:"fecha",u:"relevo",o:"colada",d:"colada",a:"albarán",kb:"báscula",mot:"motivo",n:"nota",p:"proveedor"};
    const ch=Object.keys(N).filter(k=>JSON.stringify(A[k])!==JSON.stringify(D[k])).map(k=>{const f=x=>x==null?"—":k==="o"||k==="d"?((lotes.find(y=>y.id===x)||{}).nombre||x):k==="f"?dmy(x):k==="kg"||k==="kb"?fmt(Math.abs(Math.round(x))):k==="mot"&&typeof AJ_MOT!=="undefined"?(AJ_MOT[x]||x):Math.abs(+x)===+x||isNaN(+x)?String(x):String(Math.abs(+x));
      return N[k]+" "+f(A[k])+" → "+f(D[k]);});
    return{t:"Cambiado: "+base,d:ch.join(" · ")||"cambio interno"};}
  if(c.col==="lotes"){const n=(c.despues||c.antes||{}).nombre||((lotes.find(x=>x.id===c.doc)||{}).nombre)||"colada";
    if(c.op!=="cambio")return{t:(c.op==="alta"?"Colada nueva: ":"Colada borrada: ")+n,d:[v.nave,v.material&&MAT[v.material]?MAT[v.material].nom:"",v.donde==="externo"?"externo":v.donde?"nave":""].filter(Boolean).join(" · ")};
    const A=c.antes||{},D=c.despues||{};return{t:"Colada cambiada: "+n,d:Object.keys(Object.assign({},A,D)).map(k=>k+" "+(A[k]==null?"—":String(A[k]))+" → "+(D[k]==null?"—":String(D[k]))).join(" · ")};}
  return{t:"Ajustes de la app: "+(REG_CFG[c.item]||c.item),d:c.item==="candado"?Object.keys(Object.assign({},c.antes,c.despues)).map(m=>(c.despues&&c.despues[m]?"cerrado ":"reabierto ")+m).join(" · "):""};}
function filaCambio(c){const x=txtCambio(c);
  return el("div",{class:"it",style:"cursor:default;flex-wrap:wrap"},[el("span",{class:"stripe "+(c.op==="baja"?"bad":c.op==="cambio"?"warn":"")}),
    el("div",{class:"ppal",style:"min-width:0"},[el("div",{class:"t1",text:x.t}),x.d?el("div",{class:"t2",style:"overflow-wrap:anywhere",text:x.d}):null,
      el("div",{class:"sub",text:horaCambio(c)+" · "+quienCambio(c)})])]);}
function vRegistro(){const box=el("div",{style:"display:flex;flex-direction:column;gap:8px"});
  const pinta=()=>{box.textContent="";if(REG.err){box.appendChild(el("div",{class:"banner w",text:REG.err}));return;}
    if(!REG.L){box.appendChild(el("p",{class:"hint",text:"Cargando el registro…"}));return;}
    const L=REG.L.filter(c=>REG.filtro==="todo"||(REG.filtro==="cambios"?c.op!=="alta":REG.filtro==="cfg"?c.col==="cfg":true));
    box.appendChild(el("div",{class:"seg"},[["cambios","Cambios y borrados"],["todo","Todo"],["cfg","Ajustes de la app"]].map(([k,t])=>el("button",{type:"button","aria-pressed":String(REG.filtro===k),text:t,onclick:()=>{REG.filtro=k;pinta();}}))));
    box.appendChild(L.length?el("div",{class:"lst"},L.slice(0,200).map(filaCambio)):el("p",{class:"empty",text:"Nada que enseñar con este filtro."}));
    if(L.length>200)box.appendChild(el("p",{class:"hint",text:"Se ven los 200 más recientes."}));};
  pinta();if(!REG.L||Date.now()-(REG.ts||0)>60000)cargarCambios().then(L=>{if(L){REG.L=L;REG.ts=Date.now();}pinta();});
  return el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Registro de cambios"}),el("span",{class:"der sub",text:"quién cambió qué y cuándo"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[
      el("p",{class:"hint",style:"margin:0",text:"Cada apunte nuevo, cambiado o borrado queda guardado para siempre con la hora y la persona. Lo que se ha cambiado directamente en la base de datos sale como «directo en la base de datos»."}),box])]);}
/* en la ficha del mes: lo que se ha cambiado o borrado de los apuntes de ese mes */
function regMes(m){const box=el("div",{style:"display:flex;flex-direction:column;gap:8px"},[el("p",{class:"hint",text:"Cargando…"})]);
  const sec=el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Cambios en los apuntes de este mes"})]),el("div",{class:"bd"},[box])]);
  REG.M=REG.M||{};const yaM=REG.M[m]&&Date.now()-REG.M[m].ts<60000;
  (yaM?Promise.resolve(REG.M[m].L):cargarCambios({mov:m})).then(L=>{L=L||[];if(!yaM&&!REG.err)REG.M[m]={L,ts:Date.now()};box.textContent="";if(REG.err){box.appendChild(el("div",{class:"banner w",text:REG.err}));return;}
    const C=L.filter(c=>c.op!=="alta");
    box.appendChild(el("p",{class:"hint",style:"margin:0",text:C.length?C.length+(C.length===1?" apunte cambiado o borrado después de hacerlo.":" apuntes cambiados o borrados después de hacerlos.")+" Todos los apuntes nuevos también quedan guardados ("+L.filter(c=>c.op==="alta").length+")."
      :"Ningún apunte de este mes se ha cambiado ni borrado ("+L.length+" apuntes guardados en el registro)."}));
    if(C.length)box.appendChild(el("div",{class:"lst"},C.slice(0,100).map(filaCambio)));});
  return sec;}
