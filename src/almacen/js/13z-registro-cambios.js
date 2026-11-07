/* ===== REGISTRO DE CAMBIOS (Almacén) =====
   La base de datos apunta cada cambio en la tabla «cambios»: quién, cuándo, qué había antes y qué hay después.
   Movimientos, cambios de pistón, reparaciones de ejes, averías, contadores, ejes, catálogo (artículos, proveedores,
   máquinas, modelos, almacenes…) y notas de las fichas. Aquí se leen y se cuentan en palabras.
   Lo que se cambia directamente en la base de datos sale como «directo en la base de datos». */
const RGA={L:null,ts:0,err:null,usu:{},f:"cambios",q:""};
const RGA_COL={alm_mov:"Movimientos",alm_pist:"Cambios de pistón",alm_rep:"Reparaciones de ejes",alm_aver:"Averías",alm_cont:"Contadores",alm_ejes:"Ejes",alm_cat:"Catálogo",alm_fnotas:"Notas de fichas"};
const RGA_CAT={articulos:"Artículo",proveedores:"Proveedor",maquinas:"Inyectora",modelos:"Modelo de eje",almacenes:"Almacén",operarios:"Operario",contens:"Contenedor",secc:"Sección",dot:"Dotación"};
async function cargarRGA(filtro){const sb=window.sbColada;if(!sb){RGA.err="Solo se puede ver en la app conectada.";return[];}
  try{let q=sb.from("cambios").select("id,at,por,col,doc,item,op,antes,despues").in("col",Object.keys(RGA_COL)).order("at",{ascending:false}).limit(600);
    if(filtro)q=filtro(q);const r=await q;if(r.error)throw r.error;
    if(!Object.keys(RGA.usu).length){try{const u=await sb.from("usuarios").select("user_id,nombre");(u.data||[]).forEach(x=>{RGA.usu[x.user_id]=x.nombre;});}catch(e){}}
    RGA.err=null;return r.data||[];}catch(e){RGA.err="No se pudo leer el registro: "+(e.message||e);return[];}}
const quienRGA=c=>c.por?(RGA.usu[c.por]||"un usuario"):"directo en la base de datos";
const horaRGA=c=>{const d=new Date(c.at);return fmtF(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"))+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");};
function valRGA(k,x){if(x==null||x==="")return"—";if(k==="art"){const a=art(x);return a?a.desc:x;}if(k==="maq")return maqN(x);if(k==="alm"||k==="dest"){const a=(cat.almacenes||[]).find(z=>z.id===x);return a?a.nom:String(x);}
  if(k==="prov")return provN(x)||String(x);if(k==="f"||k==="env"||k==="rec")return /^\d{4}-\d\d-\d\d$/.test(x)?fmtF(x):String(x);if(typeof x==="object")return Array.isArray(x)?x.length+" elementos":"(datos)";return String(x);}
const NOM_RGA={f:"fecha",cant:"cantidad",art:"artículo",alm:"almacén",dest:"destino",maq:"máquina",nota:"nota",prov:"proveedor",alb:"albarán",tipo:"tipo",motivo:"motivo",diam:"Ø",resp:"responsable",
  estado:"estado",env:"enviado",rec:"recibido",res:"resultado",causa:"causa",desc:"nombre",min:"mínimo",precio:"precio",nom:"nombre",cod:"código",ud:"unidad",plazo:"plazo",tel:"teléfono",email:"correo",obs:"observaciones",t:"texto",txt:"texto"};
function difRGA(A,D){A=A||{};D=D||{};return Object.keys(Object.assign({},A,D)).filter(k=>!["ts","id","ph","docs","historial","links"].includes(k)&&JSON.stringify(A[k])!==JSON.stringify(D[k]))
  .slice(0,6).map(k=>(NOM_RGA[k]||k)+" "+valRGA(k,A[k])+" → "+valRGA(k,D[k])).join(" · ");}
function txtRGA(c){const v=c.despues||c.antes||{},op=c.op==="alta"?"Nuevo":c.op==="baja"?"Borrado":"Cambiado";
  if(c.col==="alm_mov"){const a=art(v.art);const base=(TIPOS[v.tipo]||"Movimiento")+" · "+(a?a.desc:"artículo sin saber")+" · "+fmtN(+v.cant||0)+" "+(a&&a.ud||"")+(v.f?" · "+fmtF(v.f):"");
    return{t:op+": "+base,d:c.op==="cambio"?difRGA(c.antes,c.despues):[v.alm?valRGA("alm",v.alm):null,v.maq?maqN(v.maq):null,v.nota].filter(Boolean).join(" · ")};}
  if(c.col==="alm_pist")return{t:op+": cambio de pistón "+(v.diam||"")+" · "+maqN(v.maq)+(v.f?" · "+fmtF(v.f):""),d:c.op==="cambio"?difRGA(c.antes,c.despues):[cap(v.motivo||""),v.resp?respTxt(v.resp):null].filter(Boolean).join(" · ")};
  if(c.col==="alm_rep")return{t:op+": reparación del eje "+(v.eje||""),d:c.op==="cambio"?difRGA(c.antes,c.despues):[v.env?"enviado "+fmtF(v.env):null,v.alb?"albarán "+v.alb:null].filter(Boolean).join(" · ")};
  if(c.col==="alm_aver")return{t:op+": avería "+maqN(v.maq)+(v.t?" · "+v.t:""),d:c.op==="cambio"?difRGA(c.antes,c.despues):(v.estado||"")};
  if(c.col==="alm_cont")return{t:op+": lectura de contadores"+(v.nave?" · "+v.nave:"")+(v.f?" · "+fmtF(v.f):""),d:c.op==="cambio"?difRGA(c.antes,c.despues):""};
  if(c.col==="alm_ejes")return{t:op+": eje "+(v.cod||c.doc.replace(/^e-/,"")),d:c.op==="cambio"?difRGA(c.antes,c.despues):[v.estado,v.maq?"en la "+maqN(v.maq):null].filter(Boolean).join(" · ")};
  if(c.col==="alm_fnotas")return{t:op+": nota en "+c.doc.replace(/^(maq|eje|art|prov)_/,m=>({maq_:"la máquina ",eje_:"el eje ",art_:"el artículo ",prov_:"el proveedor "})[m]),d:(v.txt||"").slice(0,120)};
  if(c.col==="alm_cat"){const [k,id]=String(c.item).split("/");const tipo=RGA_CAT[k]||("Ajustes: "+k);
    if(!id)return{t:"Cambiado: ajustes del catálogo · "+k,d:""};const nom=v.desc||v.nom||v.cod||id;
    return{t:op+": "+tipo.toLowerCase()+" · "+nom,d:c.op==="cambio"?difRGA(c.antes,c.despues):""};}
  return{t:op+": "+(RGA_COL[c.col]||c.col),d:""};}
function filaRGA(c){const x=txtRGA(c);return el("div",{class:"it",style:"cursor:default;flex-wrap:wrap"},[el("span",{class:"stripe "+(c.op==="baja"?"bad":c.op==="cambio"?"warn":"")}),
  el("div",{class:"ppal",style:"min-width:0"},[el("div",{class:"t1",text:x.t}),x.d?el("div",{class:"t2",style:"overflow-wrap:anywhere",text:x.d}):null,el("div",{class:"sub",text:horaRGA(c)+" · "+quienRGA(c)+" · "+(RGA_COL[c.col]||c.col)})])]);}
function vRegAlm(v){const box=el("div",{style:"display:flex;flex-direction:column;gap:10px"});
  const pinta=()=>{box.textContent="";if(RGA.err){box.appendChild(el("div",{class:"banner w",text:RGA.err}));return;}if(!RGA.L){box.appendChild(el("p",{class:"hint",text:"Cargando el registro…"}));return;}
    const q=nq(RGA.q||"");let L=RGA.L.filter(c=>RGA.f==="todo"||(RGA.f==="cambios"?c.op!=="alta":RGA.f==="cat"?c.col==="alm_cat":RGA.f==="mov"?c.col==="alm_mov":["alm_pist","alm_ejes","alm_rep"].includes(c.col)));
    if(q)L=L.filter(c=>{const x=txtRGA(c);return nq(x.t+" "+x.d+" "+quienRGA(c)).includes(q);});
    box.appendChild(el("div",{class:"seg"},[["cambios","Cambios y borrados"],["todo","Todo"],["mov","Movimientos"],["pe","Pistones y ejes"],["cat","Catálogo"]].map(([k,t])=>el("button",{type:"button","aria-pressed":String(RGA.f===k),text:t,onclick:()=>{RGA.f=k;pinta();}}))));
    box.appendChild(L.length?el("div",{class:"lst"},L.slice(0,250).map(filaRGA)):el("p",{class:"empty",text:"Nada que enseñar con este filtro."}));
    if(L.length>250)box.appendChild(el("p",{class:"hint",text:"Se ven los 250 más recientes. Usa la búsqueda para encontrar uno más antiguo."}));};
  const bus=el("input",{type:"search",placeholder:"Busca por artículo, máquina, persona…","aria-label":"Buscar en el registro",value:RGA.q,oninput:e=>{RGA.q=e.target.value;pinta();}});
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Registro de cambios"}),el("span",{class:"der sub",text:"quién cambió qué y cuándo"})]),
    el("div",{class:"bd",style:"display:flex;flex-direction:column;gap:10px"},[el("p",{class:"hint",style:"margin:0",text:"Cada apunte, ficha o ajuste nuevo, cambiado o borrado queda guardado para siempre con la hora y la persona. Lo de hace más de 60 días (antes de poner el registro) no está."}),bus,box])]));
  pinta();if(!RGA.L||Date.now()-RGA.ts>60000)cargarRGA().then(L=>{RGA.L=L;RGA.ts=Date.now();pinta();});}
/* historial de cambios de una ficha (artículo, máquina, proveedor, eje): para la pestaña de la ficha */
function cajaCambiosFicha(filtro){const box=el("div",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Cambios en esta ficha"})),el("div",{class:"bd"},el("p",{class:"hint",text:"Cargando…"}))]);
  cargarRGA(filtro).then(L=>{const bd=box.querySelector(".bd");bd.textContent="";if(RGA.err){bd.appendChild(el("div",{class:"banner w",text:RGA.err}));return;}
    bd.appendChild(L.length?el("div",{class:"lst"},L.slice(0,100).map(filaRGA)):el("p",{class:"hint",style:"margin:0",text:"Sin cambios guardados todavía."}));});
  return box;}
