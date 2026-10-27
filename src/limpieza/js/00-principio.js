
(function(){
const URL_SB="https://uddejncrjcyyaxjocbpj.supabase.co",KEY="sb_publishable_UqnQLvLkCI0kk_y1KDt94Q_ccYmLw2i";
const CHECK=["Canaletas limpias","Robot limpio","Cubetos de barreduras vacíos","Máquinas limpias","Zona de trabajo limpia","Cuadros eléctricos y de robot limpios","Suelo limpio"];
const CHECK_FIN=["Espátulas","Palas","Martillo","Aspiradora","Hidrolimpiadora","Cincel","Materiales de trabajo"];
const DIAS=[["lunes","L"],["martes","M"],["miercoles","X"],["jueves","J"],["viernes","V"],["sabado","S"],["domingo","D"]];
const TURNOS_S=["Partido","Tarde","Refuerzo"],TURNOS_F=["Mañana finde"];
const EST={pendiente:["Pendiente","warn"],en_curso:["En curso","info"],hecha:["Hecha","ok"],no_hecha:["No hecha","bad"]};
const ERR={FALTA_NOTA:"Escribe qué se ha hecho o qué se va a hacer",JUNTA_MAL:"Esa junta no es de este horno",JUNTA_CANT_MAL:"Cantidad de juntas no válida",FALTA_TOLVA:"Elige si la tolva es de hierro o refractaria",TOLVA_MAL:"Tipo de tolva no válido",FALTA_ALTA:"Todavía no tienes PIN. Pide al jefe tu código de alta.",PIDE_CODIGO:"Escribe el código de alta que te ha dado el jefe",CODIGO_MAL:"Código de alta incorrecto",YA_TIENE_PIN:"Ya tienes PIN: vuelve atrás y entra con él",FALTA_FOTO:"Haz una foto de cómo está el trabajo",YA_PEDIDO:"Ya has pedido quedarte para este trabajo. Espera la respuesta.",FALTA_MOTIVO:"Escribe por qué tienes que quedarte",YA_RESPONDIDA:"Esa petición ya está respondida",NO_EXISTE_EL:"Ese código no está dado de alta",CODIGO_REPETIDO:"Ya hay otro con ese código",NO_HECHA:"Ese trabajo no está terminado",SESION:"Tu sesión ha caducado. Vuelve a entrar.",PIN_MAL:"PIN incorrecto",BLOQUEADO:"Demasiados intentos. Espera 10 minutos.",PIN_FORMATO:"El PIN son 4 números",NO_PERMISO:"No tienes permiso",NO_ADMIN:"Solo el administrador",FALTA_TITULO:"Pon un título",FOTO_MAL:"La foto no vale",NO_TE_QUITES_ADMIN:"No puedes quitarte a ti mismo de administrador",FALTAN_DATOS:"Faltan datos",MISMA_PERSONA:"No puede cubrirse a sí mismo",FECHAS_MAL:"Las fechas están al revés",DEMASIADAS:"Demasiadas fotos a la vez",HORARIO_MAL:"El horario no es correcto",TIEMPO_MAL:"El tiempo estimado no es correcto"};
const $=id=>document.getElementById(id);
function el(t,a,k){const e=document.createElement(t);if(a)for(const x in a){const v=a[x];if(v==null||v===false)continue;if(x==="text")e.textContent=v;else if(x==="html")e.innerHTML=v;else if(x.startsWith("on"))e[x]=v;else e.setAttribute(x,v===true?"":v);}
  (Array.isArray(k)?k:k!=null?[k]:[]).flat(9).forEach(c=>{if(c==null||c===false)return;e.appendChild(typeof c==="string"?document.createTextNode(c):c);});return e;}
const ls={get:k=>{try{return localStorage.getItem(k);}catch(e){return null;}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch(e){}}};
function toast(t){const d=el("div",{class:"toast",text:t});document.body.appendChild(d);setTimeout(()=>d.remove(),2600);}
/* ---------- sin conexión ----------
   Lecturas: se guarda la última respuesta en el móvil y se usa si no hay red.
   Acciones de los operarios (empezar, pausar, terminar, registrar en el horno…): sin red se guardan y se envían al volver. */
const LEER=new Set(["ots_dia","ots_rango","semana","elementos","elemento_ficha","lista_trabajadores","avisos_activos","avisos_todos","festivos_listar","horas_dia_leer","horas_rango","tareas","habituales","zonas","lugares","consumos_dia","horno_gasto","prl_pendientes","resp_hornos_yo","resp_hornos_admin","sust_lista","yo","extra_lista","extra_ver","cal_pendientes","check_ot_puntos","check_el_puntos","fotos_ot","enc_resumen","auto_estado","ot_historial","trabajadores_admin","trabajadores_gestor"]);
const EN_COLA={estado_ot:"Cambio de estado de un trabajo",ot_pausa:"Pausa de un trabajo",checklist_ot:"Checklist de un trabajo",terminar_ot:"Trabajo terminado",horno_registrar:"Registro en un horno",limpieza_abrir:"Limpieza apuntada",ot_abrir:"Trabajo nuevo",consumo_nave:"Nave de un consumo"};
OFF.ambito="limpieza";
const claveR=(fn,a)=>"r:"+fn+":"+JSON.stringify(Object.assign({},a||{},{p_tok:undefined}));
/* lo pendiente se ve ya en el día: el trabajo empezado o terminado sin red sale como tal */
function conPendientes(fn,j){if(fn!=="ots_dia"||!j)return j;const P=OFF.cola().filter(o=>o.fn==="limp");if(!P.length)return j;
  const ahora=new Date().toISOString();const toca=o=>{P.forEach(q=>{const a=q.args||{};if(a.p_ot!==o.id)return;
    if(q.rpc==="estado_ot"){o.estado=a.p_estado;if(a.p_estado==="en_curso"&&!o.inicio)o.inicio=ahora;if(a.p_estado==="hecha"){o.fin=ahora;o.hecho_por_n=(S.yo&&S.yo.nombre)||o.hecho_por_n;}}
    if(q.rpc==="terminar_ot"){o.estado="hecha";o.fin=ahora;o.hecho_por_n=(S.yo&&S.yo.nombre)||o.hecho_por_n;}
    if(q.rpc==="ot_pausa")o.pausa_desde=a.p_pausar?ahora:null;});};
  ["dia","atrasadas"].forEach(k=>(j[k]||[]).forEach(toca));return j;}
async function rpc(fn,args){let r;
  try{if(!navigator.onLine)throw new TypeError("offline");r=await fetch(URL_SB+"/rest/v1/rpc/"+fn,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:JSON.stringify(args||{})});}
  catch(e){OFF.red(false);
    if(LEER.has(fn)){const c=await OFF.lee(claveR(fn,args));if(c!==undefined)return conPendientes(fn,JSON.parse(JSON.stringify(c)));throw new Error("Sin conexión, y esto todavía no se había abierto en este móvil.");}
    if(EN_COLA[fn]){await OFF.encola({fn:"limp",rpc:fn,args,desc:EN_COLA[fn]});return{id:null,pendiente:true};}
    throw new Error("Sin conexión: esto necesita red. Inténtalo cuando vuelva la cobertura.");}
  OFF.red(true);
  const j=await rpcRespuesta(fn,args,r);
  if(LEER.has(fn))OFF.guarda(claveR(fn,args),j);
  return conPendientes(fn,j);}
/* lo que se envía desde la cola: con el PIN de ahora, y sin volver a meterlo en la cola si falla la red */
OFF.ejecutor=async op=>{const a=Object.assign({},op.args,op.args&&op.args.p_tok&&S.tok?{p_tok:S.tok}:{});
  const r=await fetch(URL_SB+"/rest/v1/rpc/"+op.rpc,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:JSON.stringify(a)});
  await rpcRespuesta(op.rpc,a,r);};
OFF.alVaciar=()=>{try{if(S.tok&&!document.querySelector(".ov"))pinta();}catch(e){}};
async function rpcRespuesta(fn,args,r){
  const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null;}catch(e){}
  if(!r.ok){const m=(j&&j.message)||txt||("Error "+r.status);const k=Object.keys(ERR).find(x=>m.includes(x));if(!k&&r.status!==401&&window.reportarError)reportarError(new Error("rpc "+fn+": "+String(m).slice(0,300)),"args: "+Object.keys(args||{}).join(","));if(k==="SESION"){salir(true);}throw new Error(k?ERR[k]:m);}
  if(j&&j.error){throw new Error(ERR[j.error]||j.error);}
  if(FIRMAR.includes(fn))await firmarFotos(j);return j;}
/* fotos del almacén privado: la base de datos da la ruta y aquí se pide un enlace firmado que caduca en 1 hora */
const FIRMAR=["fotos_ot","fotos_datos","extra_lista","extra_ver"];
async function firmarFotos(j){const L=Array.isArray(j)?j:(j?[j]:[]);const T=[];
  L.forEach(o=>{if(!o||typeof o!=="object")return;if(o.ruta&&!o.data)T.push([o,"data",o.ruta]);if(o.foto_ruta&&!o.foto_url)T.push([o,"foto_url",o.foto_ruta]);});
  for(let i=0;i<T.length;i+=100){const lote=T.slice(i,i+100);
    try{const x=await fetch(URL_SB+"/storage/v1/object/sign/fotos",{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:JSON.stringify({expiresIn:3600,paths:lote.map(t=>t[2])})});
      if(!x.ok)continue;const R=await x.json();
      lote.forEach(([o,k,ru])=>{const f=(R||[]).find(y=>y.path===ru);if(f&&f.signedURL)o[k]=URL_SB+"/storage/v1"+f.signedURL;});}catch(e){}}}
/* fotos: van al almacén de Supabase (Storage); si algo falla, se guardan como antes, dentro de la base de datos */
async function subirAlmacen(ruta,blob){const x=await fetch(URL_SB+"/storage/v1/object/fotos/"+ruta,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":blob.type||"image/jpeg"},body:blob});
  if(!x.ok)throw new Error("No se pudo subir la foto ("+x.status+")");}
async function fotoAlmacen(ot,d){const r=await rpc("foto_reservar",{p_tok:S.tok,p_ot:ot});await subirAlmacen(r.ruta,await (await fetch(d)).blob());await rpc("foto_confirmar",{p_tok:S.tok,p_id:r.id});return r.id;}
async function guardarFoto(ot,d){if(!navigator.onLine||!ot)throw new Error("Sin conexión: las fotos no se pueden subir sin red. Quita la foto o espera a tener cobertura.");try{const r=await rpc("foto_reservar",{p_tok:S.tok,p_ot:ot});await subirAlmacen(r.ruta,await (await fetch(d)).blob());return await rpc("foto_confirmar",{p_tok:S.tok,p_id:r.id});}
  catch(e){return rpc("foto_add",{p_tok:S.tok,p_ot:ot,p_data:d});}}
const hoyISO=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10);};
const sumaD=(f,n)=>{const d=new Date(f+"T12:00:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
const fLarga=f=>new Date(f+"T12:00:00").toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"});
const fLargaM=f=>{const t=fLarga(f);return t.charAt(0).toUpperCase()+t.slice(1);};
const fCorta=f=>new Date(f+"T12:00:00").toLocaleDateString("es-ES",{weekday:"short",day:"numeric",month:"numeric"});
const hora=ts=>ts?new Date(ts).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}):"";
const finde=f=>{const d=new Date(f+"T12:00:00").getDay();return d===0||d===6;};
let S={tok:ls.get("limp.tok"),yo:JSON.parse(ls.get("limp.yo")||"null"),tab:"hoy",fecha:hoyISO()};
/* el jefe puede probar la app como un operario (solo en pantalla; el servidor sigue tratándolo como jefe) */
const esAdm=()=>!!(S.yo&&S.yo.rol==="admin"&&!S.verOp);
/* encargado (segundo): ve todos los trabajos, crea/asigna trabajos y pone faltas; no borra ni ve datos personales */
const esEnc=()=>!!(S.yo&&S.yo.encargado&&S.yo.rol!=="admin");
const esGes=()=>esAdm()||esEnc();
try{const ir=new URLSearchParams(location.search).get("ir");if(ir&&S.yo&&esAdm()&&["resumen","equipo","tareas","avisos","semana"].includes(ir))S.tab=ir;}catch(e){}
function salir(sinAviso){const tk=S.tok;if(tk&&!sinAviso)(async()=>{try{const s=await subActual();if(s)await rpc("push_baja",{p_tok:tk,p_endpoint:s.endpoint});}catch(e){}rpc("salir",{p_tok:tk}).catch(()=>{});})();else if(tk)rpc("salir",{p_tok:tk}).catch(()=>{});S.tok=null;S.yo=null;ls.set("limp.tok",null);ls.set("limp.yo",null);if(!sinAviso)toast("Sesión cerrada");pinta();}
$("bsalir").onclick=()=>dlg("¿Cerrar sesión?",el("p",{style:"margin:0",text:"Para volver a entrar tendrás que poner tu PIN, y este móvil dejará de recibir avisos hasta que entres de nuevo."}),[{t:"Cancelar",cls:"sec"},{t:"Cerrar sesión",cls:"bad",fn:()=>salir()}]);
function confirma(t,txt,bt,fn,cls){dlg(t,el("p",{style:"margin:0",text:txt}),[{t:"Cancelar",cls:"sec"},{t:bt,cls:cls||"bad",fn}]);}
function dlg(titulo,cuerpo,botones){const ov=el("div",{class:"ov"});const cerrar=()=>ov.remove();
  const bs=(botones||[{t:"Cerrar",cls:"sec"}]).map(b=>el("button",{class:"btn "+(b.cls||""),text:b.t,onclick:async e=>{if(!b.fn){cerrar();return;}e.target.disabled=true;try{const r=await b.fn();if(r!==false)cerrar();}catch(er){toast(er.message);}e.target.disabled=false;}}));
  ov.appendChild(el("div",{class:"dlg",role:"dialog","aria-modal":"true"},[el("h3",{text:titulo}),cuerpo,el("div",{class:"row",style:"margin-top:12px"},bs)]));
  ov.onclick=e=>{if(e.target===ov)cerrar();};document.body.appendChild(ov);return cerrar;}
const fld=(l,c)=>el(/^(INPUT|SELECT|TEXTAREA)$/.test(c.tagName)?"label":"div",{class:"f"},[el("span",{text:l}),c]);
function inp(v,on,a){const i=el("input",Object.assign({value:v==null?"":v},a||{}));i.oninput=()=>on(i.value);return i;}
function area(v,on){const i=el("textarea",{rows:3});i.value=v||"";i.oninput=()=>on(i.value);return i;}
function sel(ops,v,on){const s=el("select",null,ops.map(([k,t])=>el("option",{value:k,text:t})));s.value=v==null?"":v;s.onchange=()=>on(s.value);return s;}

/* ---------- entrar ---------- */
async function vEntrar(v){v.appendChild(el("p",{class:"hint",style:"font-size:16px;margin:8px 0 14px",text:"¿Quién eres? Toca tu nombre."}));
  const box=el("div",{class:"names"},el("div",{class:"empty",text:"Cargando…"}));v.appendChild(box);
  try{const L=await rpc("lista_trabajadores");box.textContent="";L.forEach(w=>box.appendChild(el("button",{text:w.nombre,onclick:()=>pinPad(w)})));}
  catch(e){box.textContent="";box.appendChild(el("div",{class:"empty",text:"No se puede conectar. Revisa la conexión. ("+e.message+")"}));}}
function pinPad(w){let pin="",pin1=null,alta=null;const nuevo=!w.tiene_pin;const msg=el("p",{class:"hint",style:"text-align:center;font-size:15px"});const dots=el("div",{class:"dots"});
  const fase=()=>nuevo&&alta==null?"codigo":"pin";
  const pintaDots=()=>{dots.textContent="";const n=fase()==="codigo"?6:Math.max(4,pin.length);for(let i=0;i<n;i++)dots.appendChild(el("span",{class:i<pin.length?"on":""}));
    msg.textContent=!nuevo?"Pon tu PIN":fase()==="codigo"?"Es tu primera vez: escribe el código de alta de 6 números que te da el jefe":pin1==null?"Ahora inventa tu PIN de 4 números":"Repite el PIN para confirmarlo";};
  const pad=el("div",{class:"pad"});let cerrar;
  const listo=async()=>{if(fase()==="codigo"){if(pin.length!==6){toast("El código tiene 6 números");return;}alta=pin;pin="";pintaDots();return;}
    if(pin.length<4)return;if(nuevo&&pin1==null){pin1=pin;pin="";pintaDots();return;}if(nuevo&&pin!==pin1){toast("No coinciden, vuelve a empezar");pin1=null;pin="";pintaDots();return;}
    try{const r=await (nuevo?rpc("entrar_alta",{p_id:w.id,p_alta:alta,p_pin:pin}):rpc("entrar",{p_id:w.id,p_pin:pin}));S.tok=r.token;S.yo=r.yo;ls.set("limp.tok",r.token);ls.set("limp.yo",JSON.stringify(r.yo));cerrar();S.tab="hoy";S.fecha=hoyISO();pinta();pushSync();}
    catch(e){toast(e.message);pin="";if(nuevo){pin1=null;if(e.message===ERR.CODIGO_MAL||e.message===ERR.FALTA_ALTA)alta=null;}pintaDots();}};
  ["1","2","3","4","5","6","7","8","9","⌫","0","✓"].forEach(k=>pad.appendChild(el("button",{text:k,"aria-label":k==="⌫"?"Borrar":k==="✓"?"Entrar":k,onclick:()=>{if(k==="⌫")pin=pin.slice(0,-1);else if(k==="✓"){listo();return;}else if(pin.length<8)pin+=k;pintaDots();if(fase()==="codigo"&&pin.length===6)listo();else if(pin.length===4&&!nuevo)listo();}})));
  pintaDots();cerrar=dlg(w.nombre,el("div",null,[msg,dots,pad]),[{t:"Cancelar",cls:"sec"}]);}

/* visor de fotos dentro de la app (los móviles no dejan abrir la foto en otra pestaña) */
function verFoto(src,pie){const ov=el("div",{class:"visor",role:"dialog","aria-modal":"true","aria-label":"Foto"});
  const cerrar=()=>{ov.remove();document.removeEventListener("keydown",tec);};const tec=e=>{if(e.key==="Escape")cerrar();};document.addEventListener("keydown",tec);
  ov.appendChild(el("div",{class:"vbar"},[el("span",{style:"flex:1",text:pie||""}),el("a",{class:"btn sec peq",href:src,download:"foto-"+Date.now()+".jpg",text:"Guardar"}),el("button",{class:"btn peq",text:"✕ Cerrar",onclick:cerrar})]));
  ov.appendChild(el("div",{class:"vimg",onclick:e=>{if(e.target===e.currentTarget)cerrar();}},el("img",{src,alt:pie||"foto"})));document.body.appendChild(ov);}
const miniFoto=(x,pie)=>x.data?el("button",{class:"mini",type:"button","aria-label":"Ver foto",onclick:()=>verFoto(x.data,pie)},el("img",{src:x.data,alt:"foto"})):el("span",{class:"pill",text:"guardada en la copia"});
/* ---------- tarjeta de OT ---------- */
const durTxt=m=>{if(m==null)return"";m=Math.max(0,Math.round(m));if(m<60)return m+" min";const r=m%60;return Math.floor(m/60)+" h"+(r?" "+String(r).padStart(2,"0")+" min":"");};
const desde=ts=>(Date.now()-new Date(ts).getTime())/60000;
/* minutos trabajados de una OT descontando las pausas (pausado_min + la pausa actual si la hay) */
const trabajadoMin=(ini,pm,pa)=>desde(ini)-(pm||0)-(pa?desde(pa):0);
const sinAsignar=o=>!o.todo_equipo&&!(o.asignados||[]).length;
/* ¿es un trabajo del fin de semana? */
const esFindeOT=o=>o.equipo==="Finde"||finde(o.fecha);
function puedeMarcarFinde(o){if(esAdm())return true;if(sinAsignar(o))return esEnc();
  if(o.todo_equipo)return true;return (o.asignados||[]).includes(S.yo.id)||!!cubroYo(o);}
function quienTxt(o){if(o.todo_equipo)return"Todo el equipo "+(o.equipo||"");if(sinAsignar(o))return"";
  const cub=o.cubre||[];return(o.nombres||[]).map(n=>{const c=cub.find(x=>x.ausente===n);return c?(c.sustituto?n+" → lo hace "+c.sustituto:n+" (falta, sin cubrir)"):n;}).join(", ");}
/* ---- pedir permiso para quedarse más tiempo ---- */
const durPet=m=>m<60?m+" min":String(Math.round(m/6)/10).replace(".",",")+" h";
function pillPet(o){const p=S.pet&&S.pet[o.id];if(!p)return null;
  if(p.estado==="pendiente")return el("span",{class:"pill warn",text:"Pidió quedarse +"+durPet(p.minutos)+" · esperando respuesta"});
  if(p.estado==="si")return el("span",{class:"pill ok",text:"Puede quedarse +"+durPet(p.minutos)});
  if(p.estado==="no")return el("span",{class:"pill bad",text:"No quedarse: se deja para mañana"});return null;}
/* aviso de fin de jornada: si al abrir o empezar un trabajo queda poco de jornada (o el trabajo no da tiempo), la app lo recuerda y guía para pedir permiso */
function finJornada(){const h=S.miHor;return h&&h.length?h[h.length-1][1]:null;}
function minHastaFin(){const f=finJornada();if(!f)return null;const [hh,mm]=f.split(":").map(Number);const d=new Date();return hh*60+mm-(d.getHours()*60+d.getMinutes());}
function faltaOT(o){if(!o.minutos_est)return null;if(o.estado==="en_curso"&&o.inicio)return Math.max(0,Math.round(o.minutos_est-trabajadoMin(o.inicio,o.pausado_min,o.pausa_desde)));return o.minutos_est;}
const esMiaOT=o=>!!o.todo_equipo||o.hecho_por===S.yo.id||(o.asignados||[]).includes(S.yo.id)||(o.nombres||[]).includes(S.yo.nombre);
function avisoJornada(o,re){if(esAdm()||o.fecha!==hoyISO()||!(o.estado==="pendiente"||o.estado==="en_curso"))return false;if(!esMiaOT(o))return false;
  const p=S.pet&&S.pet[o.id];if(p&&p.estado!=="anulada")return false;
  const quedan=minHastaFin();if(quedan==null)return false;const falta=faltaOT(o);
  if(!(quedan<=30||(falta!=null&&falta>quedan)))return false;
  const k="aj."+o.id+"."+hoyISO()+"."+(quedan<=0?"fin":"pre");if(ls.get(k))return false;ls.set(k,"1");
  const urg=o.prioridad==="alta",fin=finJornada();
  setTimeout(()=>dlg("Se acaba tu jornada",el("div",null,[
    el("p",{style:"margin:0 0 6px;font-size:17px;font-weight:700",text:quedan>0?"Tu jornada termina a las "+fin+": te quedan "+durTxt(quedan)+".":"Tu jornada terminó a las "+fin+"."}),
    el("p",{style:"margin:0 0 10px",text:o.titulo+(falta!=null?" · "+(o.estado==="en_curso"?"te falta ~"+durTxt(falta):"suele llevar ~"+durTxt(falta)):"")}),
    el("div",{class:"aviso"+(urg?" mal":""),style:urg?"":"background:var(--surf2);color:var(--ink)"},[urg?"Este trabajo es URGENTE.":"Este trabajo NO es urgente.",el("small",{style:"display:block;font-weight:400",text:urg?"Si no te da tiempo, pide permiso a Cristian para quedarte.":"Lo normal es dejarlo para mañana. Pide quedarte solo si de verdad hace falta."})]),
    el("p",{class:"hint",text:"Sin el sí de Cristian, no te quedes."})]),
    [{t:"Me da tiempo",cls:"sec"},
     {t:"No me da tiempo: pedir permiso",cls:"ok",fn:()=>{setTimeout(()=>pedirQuedarse(o,re,falta!=null?falta-Math.max(0,quedan):60),0);}},
     {t:"Lo dejo para mañana",cls:"bad",fn:()=>{cambia(o,"no_hecha",re,"Falta de tiempo: se deja para mañana");}}]),0);
  return true;}
/* se revisa al abrir el Día y cada minuto: primero los trabajos empezados, luego los pendientes (incluidos los del finde, que no tienen «Empezar») */
function revisaJornada(){if(!S.tok||!S.yo||esAdm()||S.tab!=="hoy"||document.hidden||document.querySelector(".ov"))return;
  const L=(S.diaD||[]).filter(o=>o.estado==="en_curso").concat((S.diaD||[]).filter(o=>o.estado==="pendiente"));
  for(const o of L){if(avisoJornada(o,()=>pinta()))break;}}
setInterval(revisaJornada,60000);
function pedirQuedarse(o,re,sug){let min=sug&&sug>0?Math.min(120,Math.max(30,Math.ceil(sug/30)*30)):60,mot="",foto=null;const urg=o.prioridad==="alta";
  const fbox=el("div",{class:"fotos"});
  const fbtn=el("label",{class:"btn sec",style:"display:block;text-align:center;cursor:pointer;margin:0 0 10px"},["Hacer foto de cómo está (obligatoria)",el("input",{type:"file",accept:"image/*",capture:"environment",style:"display:none",onchange:async e=>{const f=e.target.files[0];if(!f)return;try{foto=await comprime(f);}catch(er){toast("Esa foto no se ha podido leer. Prueba otra vez.");return;}fbox.textContent="";fbox.appendChild(el("img",{src:foto,alt:"foto"}));fbtn.firstChild.textContent="Cambiar la foto";}})]);
  const ch=el("div",{class:"chips"});const pc=()=>{ch.textContent="";[30,60,90,120].forEach(m=>ch.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(min===m),text:"+"+durPet(m),onclick:()=>{min=m;pc();}})));};pc();
  dlg("¿Necesitas quedarte?",el("div",null,[el("div",{class:"aviso"+(urg?" mal":""),style:urg?"":"background:var(--surf2);color:var(--ink)"},[urg?"Este trabajo es URGENTE.":"Este trabajo NO es urgente.",el("small",{style:"display:block;font-weight:400",text:urg?"Pide permiso igualmente: Cristian te responde al momento.":"Si no da tiempo, lo normal es dejarlo para mañana. Pide permiso solo si de verdad hace falta."})]),
    el("p",{style:"margin:0 0 6px;font-weight:700",text:o.titulo}),
    el("div",{class:"f"},[el("span",{text:"¿Cuánto tiempo más?"}),ch]),fld("¿Por qué hace falta hoy?",area("",x=>mot=x,3)),fbtn,fbox,
    el("p",{class:"hint",text:"Le llega un aviso a Cristian. No te quedes hasta que te responda que sí."})]),
    [{t:"Cancelar",cls:"sec"},{t:"Pedir permiso",cls:"ok",fn:async()=>{if(!mot.trim()){toast("Escribe por qué hace falta hoy");return false;}if(!foto){toast("Haz una foto de cómo está el trabajo");return false;}
      try{const fid=await fotoAlmacen(o.id,foto);await rpc("extra_pedir",{p_tok:S.tok,p_ot:o.id,p_minutos:min,p_motivo:mot.trim(),p_foto:fid});toast("Enviado. Espera la respuesta antes de quedarte.");re();}catch(e){toast(e.message);return false;}}}]);}
function responderPet(p,re,si){let nota="";
  dlg(si?"Sí, puede quedarse":"No, se deja para mañana",el("div",null,[el("p",{style:"margin:0 0 8px",text:(p.nombre||"")+" · "+p.titulo+" · +"+durPet(p.minutos)}),
    fld("Mensaje para "+(p.nombre||"").split(" ")[0]+" (opcional)",inp("",v=>nota=v,{placeholder:si?"p. ej. Vale, pero no más de esa hora":"p. ej. Mañana lo terminas a primera hora"})),
    si?el("p",{class:"hint",text:"Se apunta solo como hora extra de hoy, con el trabajo y el motivo."}):null]),
    [{t:"Cancelar",cls:"sec"},{t:si?"Sí, que se quede":"No, mañana",cls:si?"ok":"bad",fn:async()=>{try{await rpc("extra_responder",{p_tok:S.tok,p_id:p.id,p_si:si,p_nota:nota.trim()||null});cerrarTodo();toast(si?"Le ha llegado el sí":"Le ha llegado el no");re();}catch(e){toast(e.message);return false;}}}]);}
function filaPet(p,re){const pend=p.estado==="pendiente";
  return el("div",{class:"ot"},[el("div",{class:"t",style:"font-weight:700",text:(p.nombre||"").split(" ")[0]+" pide quedarse +"+durPet(p.minutos)}),
    el("div",{class:"meta"},[el("span",{class:"pill "+(p.urgente?"bad":""),text:p.urgente?"Urgente":"No urgente"}),el("span",{text:p.titulo+(p.lugar?" · "+p.lugar:"")}),el("span",{text:"a las "+hora(p.creado)}),
      !pend?el("span",{class:"pill "+(p.estado==="si"?"ok":"bad"),text:(p.estado==="si"?"Sí":"No")+(p.respondido?" · "+hora(p.respondido):"")}):null]),
    el("div",{class:"d",text:p.motivo+(p.respuesta?"  ·  Respuesta: "+p.respuesta:"")}),
    p.foto_url?el("div",{class:"fotos",style:"margin:6px 0"},miniFoto({data:p.foto_url},(p.nombre||"")+" · "+p.titulo+" · "+hora(p.creado))):null,
    pend?el("div",{class:"row acc"},[el("button",{class:"btn ok peq",text:"Sí",onclick:()=>responderPet(p,re,true)}),el("button",{class:"btn bad peq",text:"No, mañana",onclick:()=>responderPet(p,re,false)})]):null]);}
/* el trabajador ve la respuesta del jefe al abrir la app (el aviso del móvil no sale si tiene la app abierta) */
function respuestasPet(PE){const p=PE.find(x=>(x.estado==="si"||x.estado==="no")&&!ls.get("petv."+x.id));if(!p)return;ls.set("petv."+p.id,"1");
  const si=p.estado==="si",quien=(p.respondido_por_n||"Cristian").split(" ")[0];
  setTimeout(()=>dlg(si?"Puedes quedarte":"No hace falta quedarse",el("div",null,[
    el("div",{class:"aviso",style:si?"background:var(--okbg);color:var(--ok)":"background:var(--badbg);color:var(--bad)"},[si?"Puedes quedarte +"+durPet(p.minutos)+".":"Vete a casa: se deja para mañana.",el("small",{style:"display:block;font-weight:400",text:p.titulo})]),
    p.respuesta?el("p",{style:"margin:0;font-size:16px",text:quien+": «"+p.respuesta+"»"}):null]),[{t:"Entendido",cls:"ok"}]),400);}
function bloquePeticiones(box,PE,re){box.textContent="";if(!PE.length)return;const pend=PE.filter(p=>p.estado==="pendiente"),resto=PE.filter(p=>p.estado!=="pendiente");
  if(pend.length)box.appendChild(el("div",{class:"card",style:"border-color:var(--warn)"},[el("div",{class:"hd"},el("h2",{text:"Piden quedarse ("+pend.length+")"})),el("div",{class:"bd"},pend.map(p=>filaPet(p,re)))]));
  if(resto.length)box.appendChild(el("details",{class:"card"},[el("summary",{class:"hd",style:"cursor:pointer"},el("h2",{text:"Peticiones respondidas hoy ("+resto.length+")"})),el("div",{class:"bd"},resto.map(p=>filaPet(p,re)))]));}
function tarjeta(o,re){const [et,ec]=EST[o.estado]||["?",""];const admin=esAdm();
  const quien=quienTxt(o);const sinCubrir=(o.cubre||[]).some(c=>!c.sustituto);
  const acc=[];
  if(o.estado==="pendiente")acc.push(el("button",{class:"btn peq",text:"Empezar",onclick:async()=>{await cambia(o,"en_curso",re);avisoJornada(Object.assign({},o,{estado:"en_curso",inicio:new Date().toISOString(),pausado_min:0,pausa_desde:null}),re);}}));
  if(o.estado==="en_curso"&&!o.pausa_desde)acc.push(el("button",{class:"btn sec peq",text:"Pausar",title:"Para el tiempo (por ejemplo, si hay una urgencia)",onclick:()=>pausar(o,re,true)}));
  if(o.estado==="en_curso"&&o.pausa_desde)acc.push(el("button",{class:"btn peq",text:"Seguir",onclick:()=>pausar(o,re,false)}));
  if(o.estado==="en_curso"||o.estado==="pendiente")acc.push(el("button",{class:"btn ok peq",text:"Terminar",onclick:()=>terminar(o,re)}));
  if(o.estado==="pendiente"||o.estado==="en_curso")acc.push(el("button",{class:"btn sec peq",text:"No se pudo",onclick:()=>noHecha(o,re)}));
  if(o.estado==="hecha"||o.estado==="no_hecha")acc.push(el("button",{class:"btn sec peq",text:"Reabrir",onclick:()=>confirma("¿Reabrir este trabajo?","«"+o.titulo+"» vuelve a estar por hacer. Se borran la hora de inicio y de fin.","Reabrir",()=>cambia(o,"pendiente",re),"ok")}));
  acc.push(el("button",{class:"btn sec peq",text:"Fotos"+(o.nfotos?" "+o.nfotos:""),"aria-label":"Fotos",onclick:()=>verFotos(o,re)}));
  if(admin||esEnc())acc.push(el("button",{class:"btn sec peq",text:sinAsignar(o)?"Asignar":"Editar",onclick:()=>formOT(o,re)}));
  if(admin&&o.estado!=="hecha")acc.push(el("button",{class:"btn sec peq quitar","aria-label":"Quitar este trabajo",text:"Quitar",onclick:()=>confirma("¿Quitar este trabajo?","«"+o.titulo+"» deja de salir en la lista.","Quitar",async()=>{try{await rpc("ot_borrar",{p_tok:S.tok,p_ot:o.id});toast("Quitado");re();}catch(e){toast(e.message);return false;}})}));
  else if(puedoEditar(o)&&!esEnc())acc.push(el("button",{class:"btn sec peq",text:"Corregir","aria-label":"Corregir o borrar",onclick:()=>editarOT(o,re)}));
  if(puedoTiempo(o))acc.push(el("button",{class:"btn sec peq",text:"Tiempo","aria-label":"Corregir el tiempo",onclick:()=>corregirTiempo(o,re)}));
  if(!admin){const T=t=>acc.find(b=>b.textContent.indexOf(t)===0);
    const emp=T("Empezar"),ter=T("Terminar"),pau=acc.find(b=>/Pausar|Seguir/.test(b.textContent)),noS=T("No se pudo"),fot=T("Fotos"),rea=T("Reabrir");
    const fin=[];
    if(emp){emp.className="btn grande";fin.push(emp);}
    else if(ter){ter.className="btn grande ok";fin.push(ter);}
    if(emp&&ter){ter.textContent="Ya lo hice";ter.className="btn sec peq";fin.push(ter);}
    [pau,noS,rea,fot].forEach(b=>{if(b)fin.push(b);});
    acc.filter(b=>!fin.includes(b)).forEach(b=>fin.push(b));
    acc.length=0;acc.push(...fin);}
  if(esFindeOT(o)){/* fin de semana: sin «Empezar»; «Hecha» (con tiempo) y «No hecha» (con motivo).
       Sin persona: solo lo marca el encargado. Con persona: solo esa persona (y el jefe). */
    const puede=puedeMarcarFinde(o),f=[];
    if(puede&&(o.estado==="pendiente"||o.estado==="en_curso")){f.push(el("button",{class:"btn ok",text:"Hecha",onclick:()=>terminar(o,re)}));f.push(el("button",{class:"btn bad",text:"No hecha",onclick:()=>noHecha(o,re,true)}));}
    if(puede&&(o.estado==="hecha"||o.estado==="no_hecha"))f.push(el("button",{class:"btn sec peq",text:"Reabrir",onclick:()=>confirma("¿Reabrir este trabajo?","«"+o.titulo+"» vuelve a estar por hacer.","Reabrir",()=>cambia(o,"pendiente",re),"ok")}));
    acc.filter(b=>/^Fotos|^Editar|^Asignar|^Quitar|^Corregir|^Tiempo/.test(b.textContent)).forEach(b=>f.push(b));
    if(!puede&&(o.estado==="pendiente"||o.estado==="en_curso")&&!sinAsignar(o))f.unshift(el("span",{class:"hint",style:"align-self:center;margin:0",text:"Lo marca "+((o.nombres||[]).map(n=>n.split(" ")[0]).join(", ")||"quien lo tenga")}));
    acc.length=0;acc.push(...f);}
  return el("div",{class:"ot"+(o.estado==="en_curso"?" curso":"")},[el("button",{class:"tit",onclick:()=>{detalle(o);avisoJornada(o,re);}},[el("span",{class:"t",text:o.titulo}),el("span",{class:"pill "+ec,text:et}),el("span",{class:"mas","aria-hidden":"true",text:"›"})]),
    o.descripcion?el("div",{class:"d",text:o.descripcion}):null,
    el("div",{class:"meta"},[pillPet(o),o.fecha!==S.fecha?el("span",{class:"pill bad",text:"Atrasada · "+fCorta(o.fecha)}):null,o.prioridad==="alta"?el("span",{class:"pill bad",text:"Urgente"}):null,
      sinAsignar(o)?el("span",{class:"pill warn",text:"Sin asignar"}):null,
      o.orig_n&&o.orig_n.length?el("span",{class:"pill info",title:"La app lo ha pasado automáticamente porque esa persona no está",text:"Era de "+o.orig_n.map(n=>n.split(" ")[0]).join(", ")}):null,
      o.auto_motivo==="sin_nadie"&&o.estado==="pendiente"&&admin?el("span",{class:"pill bad",text:"Nadie disponible para hacerlo"}):null,
      admin&&S.plant&&o.fecha===S.fecha?(o.nombres||[]).filter(n=>S.plant[n]&&!S.plant[n].length&&!(o.cubre||[]).some(c=>c.ausente===n&&c.sustituto)).map(n=>el("span",{class:"pill bad",text:n.split(" ")[0]+" libra hoy"})):null,sinCubrir&&admin?el("span",{class:"pill bad",text:"Falta alguien"}):null,
      o.lugar?el("span",{text:o.lugar}):null,o.turno?el("span",{text:"Turno: "+o.turno}):null,quien?el("span",{text:quien}):null,
      o.origen==="rapida"&&o.creado_por_n?el("span",{text:"Abierta por "+o.creado_por_n.split(" ")[0]+" a las "+hora(o.creado)}):null,
      o.resultado?el("span",{class:"pill "+(o.resultado==="OK"?"ok":"bad"),text:"Checklist "+o.resultado}):null,
      o.estado==="pendiente"&&o.minutos_est?el("span",{text:"~"+durTxt(o.minutos_est)}):null,
      o.estado==="en_curso"&&o.pausa_desde?el("span",{class:"pill warn",text:"En pausa desde las "+hora(o.pausa_desde)+" (no cuenta el tiempo)"}):null,
      o.estado==="en_curso"&&o.inicio?el("span",{class:"pill "+(o.minutos_est&&trabajadoMin(o.inicio,o.pausado_min,o.pausa_desde)>o.minutos_est?"warn":"info")},["Empezó "+hora(o.inicio)+(o.hecho_por_n?" ("+o.hecho_por_n.split(" ")[0]+")":"")+" · lleva ",el("b",{class:"vivo","data-ini":o.inicio,"data-pm":o.pausado_min||0,"data-pa":o.pausa_desde||"",text:durTxt(trabajadoMin(o.inicio,o.pausado_min,o.pausa_desde))}),o.minutos_est?" de ~"+durTxt(o.minutos_est):""]):null,
      o.estado==="hecha"&&o.minutos!=null?(o.tiempo_auto?el("span",{class:"pill",title:"No pulsó «Empezar»: se ha puesto el tiempo estimado",text:durTxt(o.minutos)+" (tiempo estimado)"}):o.tiempo_decl?el("span",{class:"pill "+(o.minutos_est&&o.minutos>o.minutos_est*1.25?"warn":"ok"),title:"Tiempo indicado por el trabajador al terminar",text:durTxt(o.minutos)+" (lo indicó "+((o.hecho_por_n||"").split(" ")[0]||"él")+")"}):el("span",{class:"pill "+(o.minutos_est&&o.minutos>o.minutos_est*1.25?"warn":"ok"),text:durTxt(o.minutos)+(o.minutos_est?" (estimado "+durTxt(o.minutos_est)+")":"")})):null,
      o.hecho_por_n&&(o.estado==="hecha"||o.estado==="no_hecha")?el("span",{text:"Por "+o.hecho_por_n+(o.fin?" a las "+hora(o.fin):"")}):null,o.nota?el("span",{text:"Nota: "+o.nota}):null]),
    el("div",{class:"row acc"},acc)]);}
setInterval(()=>document.querySelectorAll(".vivo").forEach(x=>x.textContent=durTxt(trabajadoMin(x.dataset.ini,+x.dataset.pm||0,x.dataset.pa))),30000);
async function pausar(o,re,pausar){try{await rpc("ot_pausa",{p_tok:S.tok,p_ot:o.id,p_pausar:pausar});toast(pausar?"En pausa: el tiempo deja de contar":"Seguimos: el tiempo vuelve a contar");re();}catch(er){toast(er.message);}}
async function cambia(o,e,re,nota){try{await rpc("estado_ot",{p_tok:S.tok,p_ot:o.id,p_estado:e,p_nota:nota||null});toast(e==="en_curso"?"Empezado: el tiempo cuenta desde ahora":EST[e][0]);re();}catch(er){toast(er.message);}}
const ACC={creada:"Creada",en_curso:"Empezada",hecha:"Terminada",no_hecha:"No se pudo",pendiente:"Reabierta",reasignada:"Asignada a",editada:"Editada",checklist:"Checklist",borrada:"Borrada",foto:"Foto añadida"};
const diaDe=ts=>{const d=new Date(ts);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10);};
/* OT hecha con material del almacén (cambio de bidón, Pistonwax…): se puede corregir la nave y los kilos */
function habAlmOT(o){const h=(HAB||[]).find(x=>x.id===o.habitual_id);return !!(o.pide_alm||o.alm_cant_real!=null||(h&&h.alm_art));}
function puedoCorregirAlm(o){return o.estado==="hecha"&&habAlmOT(o)&&(esAdm()||(S.yo&&S.yo.encargado)||(S.yo&&o.hecho_por===S.yo.id));}
function corregirAlm(o,re){const h=(HAB||[]).find(x=>x.id===o.habitual_id);let nave=/^Nave [12]$/.test(o.nave||"")?o.nave:"";
  let kg=String(o.alm_cant_real!=null?o.alm_cant_real:(h&&h.alm_cant)||"");
  const nb=el("div",{class:"seg sel"});const pn=()=>{nb.textContent="";["Nave 1","Nave 2"].forEach(n=>nb.appendChild(el("button",{type:"button","aria-pressed":String(nave===n),text:n,onclick:()=>{nave=n;pn();}})));};pn();
  dlg("Corregir nave y kilos",el("div",null,[el("p",{class:"hint",text:o.titulo}),fld("¿En qué nave?",nb),fld("Kilos",inp(kg,v=>kg=v,{inputmode:"decimal"}))]),
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",cls:"ok",fn:async()=>{const n=parseFloat(String(kg).replace(",","."));if(!nave){toast("Elige la nave");return false;}if(!(n>0)){toast("Pon los kilos");return false;}
      const r=await rpc("ot_consumo_editar",{p_tok:S.tok,p_ot:o.id,p_nave:nave,p_cant:n});toast("Corregido"+(r&&r.almacen?". "+r.almacen:""));re();}}]);}
/* El jefe o el encargado cambia la respuesta: «es la misma» o «es otra cosa» */
function cambiarRepite(o,re){const cambia=async resp=>{try{await rpc("ot_repite_cambiar",{p_tok:S.tok,p_ot:o.id,p_resp:resp});toast("Respuesta guardada");re();}catch(e){toast(e.message||"No se pudo cambiar");return false;}};
  dlg("¿Es la misma o es otra cosa?",el("p",{class:"hint",text:o.titulo+" · "+fCorta(o.fecha)+(o.repite_resp?" · ahora: "+(o.repite_resp==="misma"?"es la misma":"es otra cosa"):"")}),
    [{t:"Cancelar",cls:"sec"},{t:"Es otra cosa",cls:"sec",fn:()=>cambia("otra")},{t:"Es la misma",cls:"ok",fn:()=>cambia("misma")}]);}
/* Cambio de horno ya hecho: se desmarca lo que no hizo falta y el Almacén anula ese descuento */
function puedoCorregirMat(o){return o.estado==="hecha"&&/^cambio/.test(o.accion_horno||"")&&!!o.elemento_id;}
function corregirMaterial(o,re){let P=[];const lista=el("div",null,el("p",{class:"hint",text:"Cargando piezas…"}));
  const pintaL=()=>{lista.textContent="";if(!P.length){lista.appendChild(el("p",{class:"hint",text:"No hay piezas descontadas en esta OT."}));return;}
    P.forEach(p=>{const cb=el("input",{type:"checkbox"});cb.checked=p.usada;cb.addEventListener("change",()=>{p.usada=cb.checked;});
      lista.appendChild(el("label",{class:"chk"},[cb,el("span",{text:" "+p.nombre+" × "+String(p.cant).replace(".",",")})]));});};
  dlg("Corregir material · "+o.titulo,el("div",null,[el("p",{class:"hint",text:"Desmarca lo que no se ha cambiado. Se anula en el Almacén el descuento de lo desmarcado."}),lista]),
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",cls:"ok",fn:async()=>{const sel=P.filter(p=>p.usada).map(p=>({art:p.art,cant:p.cant}));
      try{await rpc("horno_corregir_material",{p_tok:S.tok,p_ot:o.id,p_piezas:sel});toast(sel.length?"Material corregido":"Anulado: no se descontó nada");re();}
      catch(e){toast(e.message||"No se pudo corregir");return false;}}}]);
  rpc("horno_piezas_ot",{p_tok:S.tok,p_ot:o.id}).then(L=>{P=L.map(p=>Object.assign({usada:true},p));pintaL();}).catch(e=>{lista.textContent=e.message||"No se pudieron cargar las piezas";});}
function detalle(o){const fbox=el("div",{class:"fotos"}),hbox=el("div",null,el("p",{class:"hint",text:"Cargando…"}));
  const fila=(k,v)=>v?el("tr",null,[el("th",{text:k}),el("td",{text:v})]):null;
  const ck=Object.entries(o.checklist||{}).concat(Object.entries(o.checklist_final||{}));
  dlg(o.titulo,el("div",null,[o.descripcion?el("p",{style:"margin:0 0 10px",text:o.descripcion}):null,
    el("table",{class:"det"},el("tbody",null,[fila("Día",fLarga(o.fecha)),fila("Dónde",o.lugar),fila("Quién",quienTxt(o)||(sinAsignar(o)?"Sin asignar":"")),fila("Estado",(EST[o.estado]||[o.estado])[0]),
      fila("Empezó",o.inicio?hora(o.inicio):""),fila("Terminó",o.fin?hora(o.fin):""),fila("Tiempo",o.minutos!=null?durTxt(o.minutos)+(o.tiempo_auto?" (estimado: no pulsó Empezar)":o.tiempo_decl?" (indicado por el trabajador)":""):""),fila("Estimado",o.minutos_est?durTxt(o.minutos_est):""),fila("Hecho por",o.hecho_por_n),fila("Abierta por",o.origen==="rapida"?o.creado_por_n:""),fila("Nota",o.nota),o.repite_resp?fila("Repetición",o.repite_resp==="misma"?"Es la misma":"Es otra cosa (mismo sitio)"):null,habAlmOT(o)?fila("Almacén",(o.nave||"sin nave")+" · "+(o.alm_cant_real!=null?String(o.alm_cant_real).replace(".",",")+" kg":"sin kilos apuntados")):null])),
    ck.length?el("div",null,[el("h4",{text:"Checklist"}),el("div",{class:"chips"},ck.map(([k,v])=>el("span",{class:"pill "+(v==="OK"?"ok":v==="NO-OK"?"bad":""),text:k+": "+v})))]):null,
    el("h4",{text:"Fotos"}),fbox,el("h4",{text:"Historial"}),hbox]),[esAdm()&&o.estado!=="hecha"?{t:"WhatsApp",cls:"wa",fn:()=>{enviarOTWA(o);return false;}}:null,
      puedoEditar(o)?{t:"Corregir",cls:"sec",fn:()=>{setTimeout(()=>editarOT(o,()=>pinta()),0);}}:null,
      puedoTiempo(o)?{t:"Tiempo",cls:"sec",fn:()=>{setTimeout(()=>corregirTiempo(o,()=>pinta()),0);}}:null,
      (esAdm()||(S.yo&&S.yo.encargado))&&(o.repite_resp||esProblema(o.titulo,o.descripcion))?{t:"¿Es la misma?",cls:"sec",fn:()=>{setTimeout(()=>cambiarRepite(o,()=>pinta()),0);}}:null,
      puedoCorregirAlm(o)?{t:"Corregir nave y kilos",cls:"ok",fn:()=>{setTimeout(()=>corregirAlm(o,()=>pinta()),0);}}:null,puedoCorregirMat(o)?{t:"Corregir material",cls:"sec",fn:()=>{setTimeout(()=>corregirMaterial(o,()=>pinta()),0);}}:null,{t:"Cerrar",cls:"sec"}].filter(Boolean));
  rpc("ot_historial",{p_tok:S.tok,p_ot:o.id}).then(H=>{hbox.textContent="";hbox.appendChild(H.length?el("ol",{class:"hist"},H.map(h=>el("li",null,[el("b",{text:hora(h.cuando)}),diaDe(h.cuando)!==o.fecha?el("small",{text:" "+fCorta(diaDe(h.cuando))}):null," · "+(ACC[h.accion]||h.accion)+(h.detalle?": "+h.detalle:"")+" — "+h.quien]))):el("p",{class:"hint",text:"Sin movimientos registrados."}));}).catch(e=>hbox.textContent=e.message);
  if(o.nfotos)rpc("fotos_ot",{p_tok:S.tok,p_ot:o.id}).then(L=>L.forEach(x=>fbox.appendChild(miniFoto(x,o.titulo+(x.por?" · "+x.por:"")+" · "+hora(x.creado))))).catch(()=>{});
  else fbox.appendChild(el("p",{class:"hint",text:"Sin fotos."}));}
/* «No se pudo»: cuatro motivos fijos, sin escribir */
function noHecha(o,re,otros){const MOT=["Falta de tiempo","Falta de material","Avería de máquina","Se suspendió el trabajo"].concat(otros?["Otro motivo"]:[]);let cerrar=()=>{};
  cerrar=dlg("No se pudo hacer",el("div",{class:"lst"},MOT.map(m=>el("button",{type:"button",class:"btn grande sec",style:"width:100%;margin-bottom:8px",text:m,onclick:()=>{cerrar();if(m.indexOf("suspendió")>=0){setTimeout(()=>motivoSuspension(o,re),0);return;}if(m.indexOf("Otro motivo")>=0){setTimeout(()=>otroMotivo(o,re),0);return;}cambia(o,"no_hecha",re,m);}}))),[{t:"Cancelar",cls:"sec"}]);}
function otroMotivo(o,re){let motivo="";
  dlg("¿Por qué no se pudo hacer?",el("div",null,[el("p",{class:"hint",text:"Escribe el motivo."}),area("",x=>motivo=x)]),
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",cls:"ok",fn:async()=>{if(!motivo.trim()){toast("Escribe el motivo");return false;}
      try{await rpc("estado_ot",{p_tok:S.tok,p_ot:o.id,p_estado:"no_hecha",p_nota:motivo.trim()});toast("Guardado");re();}catch(er){toast(er.message);return false;}}}]);}
/* suspender un trabajo: hay que escribir el motivo */
function motivoSuspension(o,re){let motivo="";
  dlg("Motivo de la suspensión",el("div",null,[el("p",{class:"hint",text:"Explica por qué se suspende el trabajo."}),area("",x=>motivo=x)]),
    [{t:"Cancelar",cls:"sec"},{t:"Guardar",cls:"ok",fn:async()=>{if(!motivo.trim()){toast("Escribe el motivo");return false;}
      try{await rpc("estado_ot",{p_tok:S.tok,p_ot:o.id,p_estado:"no_hecha",p_nota:"Se suspendió el trabajo: "+motivo.trim()});toast("Suspendido");re();}catch(er){toast(er.message);return false;}}}]);}
function segOK(v,on){const b=[["OK","v-ok"],["NO-OK","v-no"],["N/A","v-na"]].map(([k,c])=>el("button",{type:"button",class:c,"aria-pressed":String(v===k),text:k,onclick:()=>{on(k);b.forEach(x=>x.setAttribute("aria-pressed",String(x.textContent===k)));}}));return el("div",{class:"seg"},b);}
const CHECKLIST_ACTIVA=false; /* desactivada hasta definir la checklist de inyectoras de fin de semana */
/* ¿hay un tiempo medido de verdad? (pulsó «Empezar» hace al menos 2 minutos) */
const medido=o=>!!(o.inicio&&!o.tiempo_auto&&desde(o.inicio)>=2);
/* al terminar: si la tarea tiene tiempo normal, primero solo se pregunta «¿Sí o no?»; las opciones de minutos salen solo si dicen que no */
function preguntaTiempo(o){const av=preguntaTiempoAv(o);if(!o.minutos_est)return av;
  let modo=null;const marca=(a,b)=>{a.setAttribute("aria-pressed","true");b.setAttribute("aria-pressed","false");};
  const si=el("button",{type:"button",class:"btn ok",text:"Sí, "+durTxt(o.minutos_est),"aria-pressed":"false",onclick:()=>{modo="si";av.hidden=true;marca(si,no);}});
  const no=el("button",{type:"button",class:"btn sec",text:"No, he tardado distinto","aria-pressed":"false",onclick:()=>{modo="no";av.hidden=false;marca(no,si);}});
  av.hidden=true;av.firstChild.hidden=true;/* sin el título repetido */
  const w=el("div",{class:"tpreg"},[el("b",{text:"¿Cuánto has tardado?"}),el("p",{class:"hint",style:"margin:2px 0 8px",text:"Esta tarea suele tardar "+durTxt(o.minutos_est)+". ¿Has tardado eso?"}),el("div",{class:"row"},[si,no]),av]);
  w.val=()=>modo==="si"?o.minutos_est:(modo==="no"?av.val():null);return w;}
function preguntaTiempoAv(o){let val=o.minutos_est||null;const OPC=[5,10,15,20,30,45,60,90,120];if(val&&!OPC.includes(val)){OPC.push(val);OPC.sort((a,b)=>a-b);}
  const box=el("div",{class:"chips tmp"});const otro=el("input",{type:"number",inputmode:"numeric",min:"1",max:"720",placeholder:"otro",class:"otro","aria-label":"Otros minutos"});
  const pin=()=>{box.textContent="";OPC.forEach(m=>box.appendChild(el("button",{type:"button",class:"chip","aria-pressed":String(val===m),text:durTxt(m)+(m===o.minutos_est?" ★":""),onclick:()=>{val=m;otro.value="";pin();}})));box.appendChild(otro);};
  otro.oninput=()=>{const n=parseInt(otro.value,10);val=n>0?n:null;box.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed","false"));};pin();
  const w=el("div",{class:"tpreg"},[el("b",{text:"¿Cuánto has tardado?"}),el("p",{class:"hint",style:"margin:2px 0 8px",text:(esFindeOT(o)?"":o.inicio&&!o.tiempo_auto?"Has pulsado «Empezar» y «Terminar» casi a la vez.":"No pulsaste «Empezar».")+(o.minutos_est?" Viene marcado el tiempo normal de esta tarea (★); cámbialo si has tardado más o menos.":" Toca el tiempo que más se parezca.")}),box]);
  w.val=()=>val;return w;}
/* checklist editable (hornos mantenedores): se pueden quitar o añadir puntos en cada limpieza */
function puntosEd(pts,ck){const box=el("div",{class:"chk"});const dib=()=>{box.textContent="";pts.forEach((k,i)=>box.appendChild(el("div",{class:"it"},[el("b",{text:k}),segOK(ck[k],v=>ck[k]=v),el("button",{type:"button",class:"btn sec peq",text:"✕",onclick:()=>{delete ck[k];pts.splice(i,1);dib();}})])));};dib();
  const add=el("input",{type:"text",placeholder:"Añadir un punto…"});
  return el("div",null,[box,el("div",{class:"row"},[add,el("button",{type:"button",class:"btn sec peq",text:"＋ Añadir",onclick:()=>{const v=add.value.trim();if(!v||pts.includes(v))return;pts.push(v);add.value="";dib();}})])]);}
/* checklists por trabajo: los grupos que el jefe ha puesto «al terminar ciertos trabajos» (los decide el servidor) */
function puntoTrab(p,ck){const it=el("div",{class:"it"});const tit=p.ayuda||p.tipo==="num"&&p.minimo!=null?el("div",null,[el("b",{text:p.texto}),el("small",{class:"hint",style:"display:block;margin:2px 0 0",text:[p.ayuda,p.tipo==="num"&&p.minimo!=null?"Mínimo: "+p.minimo:null].filter(Boolean).join(" · ")})]):el("b",{text:p.texto});
  if(p.tipo==="num"){const i=el("input",{type:"number",inputmode:"decimal",min:"0",style:"max-width:110px",value:ck[p.texto]==null?"":ck[p.texto]});i.oninput=()=>{if(i.value==="")delete ck[p.texto];else ck[p.texto]=i.value;};it.append(tit,i);return it;}
  if(p.tipo==="txt"){const i=el("input",{type:"text",placeholder:"(opcional)",value:ck[p.texto]||""});i.oninput=()=>{if(i.value.trim())ck[p.texto]=i.value;else delete ck[p.texto];};it.append(tit,i);return it;}
  it.append(tit,segOK(ck[p.texto],v=>ck[p.texto]=v));return it;}
/* tareas fijas que reponen material del almacén (p. ej. Pistonwax): antes de terminar, nave y cantidad */
function pedirNaveCant(o,seguir){let nave=o.nave&&/^Nave [12]$/.test(o.nave)?o.nave:"",kg="";
  const nb=el("div",{class:"seg sel"});const pn=()=>{nb.textContent="";["Nave 1","Nave 2"].forEach(n=>nb.appendChild(el("button",{type:"button","aria-pressed":String(nave===n),text:n,onclick:()=>{nave=n;pn();}})));};pn();
  dlg("¿Cuánto repones?",el("div",null,[el("p",{class:"hint",text:"Pistonwax dúo 15: sale del Almacén general."}),fld("¿En qué nave?",nb),
    fld("Kilos que repones",inp(o.alm_cant_real||"",v=>kg=v,{inputmode:"decimal",placeholder:"ej. 15"}))]),
    [{t:"Cancelar",cls:"sec"},{t:"Continuar",cls:"ok",fn:async()=>{const n=parseFloat(String(kg).replace(",","."));if(!nave){toast("Elige la nave");return false;}if(!(n>0)){toast("Pon cuántos kilos repones");return false;}
      await rpc("ot_consumo_fijar",{p_tok:S.tok,p_ot:o.id,p_nave:nave,p_cant:n});o.nave=nave;o.alm_cant_real=n;seguir();}}]);}
function terminar(o,re,PT){if(o.pide_alm&&o.alm_cant_real==null){pedirNaveCant(o,()=>terminar(o,re,PT));return;}if(o.elemento_id&&!ELS){elementosL().then(()=>terminar(o,re,PT));return;}if(PT===undefined){rpc("check_ot_puntos",{p_tok:S.tok,p_ot:o.id}).then(r=>terminar(o,re,Array.isArray(r)?r:[])).catch(()=>terminar(o,re,[]));return;}const eo=o.elemento_id&&ELS?ELS.find(x=>x.id===o.elemento_id):null;const esLim=!o.accion_horno||o.accion_horno==="limpieza";const P1=!esLim?[]:(o.puntos&&o.puntos.length)?o.puntos:((eo&&eo.puntos)||[]);const pts=P1.length?P1.slice():null;const iny=!pts&&PT&&PT.length?PT:null;const usaCk=CHECKLIST_ACTIVA||!!pts||!!iny;const preg=medido(o)?null:preguntaTiempo(o);const ck=Object.assign({},o.checklist||{}),fin=Object.assign({},o.checklist_final||{});const conFin=!pts&&!iny&&usaCk&&(finde(o.fecha)||o.equipo==="Finde");let nota="";const fotos=[];
  const fbox=el("div",{class:"fotos"});
  const body=el("div",null,[preg,medido(o)?el("p",{class:"hint",text:"Tiempo: "+durTxt(desde(o.inicio))+" desde que pulsaste «Empezar»."}):null,usaCk?el("p",{class:"hint",text:"Marca cómo ha quedado cada punto."}):el("p",{class:"hint",text:"Si quieres, añade una nota o una foto de cómo ha quedado."}),usaCk?(pts?puntosEd(pts,ck):iny?el("div",{class:"chk"},iny.map((p,i)=>[new Set(iny.map(x=>x.grupo)).size>1&&(i===0||iny[i-1].grupo!==p.grupo)?el("b",{style:"margin-top:6px;color:var(--mut);font-size:13px;text-transform:uppercase",text:p.grupo}):null,puntoTrab(p,ck)]).flat().filter(Boolean)):el("div",{class:"chk"},CHECK.map(k=>el("div",{class:"it"},[el("b",{text:k}),segOK(ck[k],v=>ck[k]=v)])))):null,
    conFin?el("div",null,[el("b",{text:"Material al terminar"}),el("div",{class:"chk"},CHECK_FIN.map(k=>el("div",{class:"it"},[el("span",{text:k}),segOK(fin[k],v=>fin[k]=v)])))]):null,
    el("details",{class:"mas-op"},[el("summary",{text:"＋ Añadir foto o nota (opcional)"}),fld("Nota (opcional)",area("",x=>nota=x)),
      el("label",{class:"btn sec",style:"display:block;text-align:center;cursor:pointer"},["Añadir foto",el("input",{type:"file",accept:"image/*",style:"display:none",onchange:async e=>{const f=e.target.files[0];if(!f)return;let d;try{d=await comprime(f);}catch(er){toast("Esa foto no se ha podido leer. Prueba con otra.");return;}fotos.push(d);fbox.appendChild(el("img",{src:d,alt:"foto"}));}})]),fbox])]);
  dlg("Terminar: "+o.titulo,body,[{t:"Cancelar",cls:"sec"},{t:"Guardar como hecha",cls:"ok",fn:async()=>{if(preg&&!preg.val()){toast("Marca cuánto has tardado");return false;}const falta=usaCk?(pts||(iny?iny.filter(x=>x.tipo!=="txt").map(x=>x.texto):CHECK)).filter(k=>!ck[k]):[];if(falta.length){toast("Falta marcar: "+falta[0]);return false;}
    const sinFoto=iny&&!fotos.length&&iny.find(x=>x.foto_si_mal&&ck[x.texto]==="NO-OK");if(sinFoto){toast("Pon una foto de cómo ha quedado: "+sinFoto.texto);return false;}
    if(conFin&&CHECK_FIN.some(k=>!fin[k])){toast("Falta marcar el material");return false;}
    if(usaCk)await rpc("checklist_ot",{p_tok:S.tok,p_ot:o.id,p_check:ck,p_final:conFin?fin:null});for(const d of fotos)await guardarFoto(o.id,d);
    if(preg){try{await rpc("terminar_ot",{p_tok:S.tok,p_ot:o.id,p_minutos:preg.val(),p_nota:nota.trim()||null});toast("Hecha · "+durTxt(preg.val()));re();}catch(er){toast(er.message);}}
    else await cambia(o,"hecha",re,nota.trim());}}]);}
function comprime(f){return new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const M=1100,k=Math.min(1,M/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);/* ~150 KB por foto: se ve bien en el móvil y la base dura unas 3 veces más */let q=.62,d=c.toDataURL("image/jpeg",q);while(d.length>220000&&q>.32){q-=.08;d=c.toDataURL("image/jpeg",q);}if(d.length>220000){const c2=document.createElement("canvas");c2.width=Math.round(c.width*.75);c2.height=Math.round(c.height*.75);c2.getContext("2d").drawImage(c,0,0,c2.width,c2.height);d=c2.toDataURL("image/jpeg",.55);}ok(d);};im.onerror=ko;im.src=r.result;};r.onerror=ko;r.readAsDataURL(f);});}
async function verFotos(o,re){const box=el("div",{class:"fotos"},el("div",{class:"empty",text:"Cargando…"}));
  const add=el("label",{class:"btn sec",style:"display:block;text-align:center;cursor:pointer;margin-top:10px"},["Añadir foto",el("input",{type:"file",accept:"image/*",style:"display:none",onchange:async e=>{const f=e.target.files[0];if(!f)return;try{await guardarFoto(o.id,await comprime(f));toast("Foto guardada");carga();re();}catch(er){toast(er.message);}}})]);
  const carga=async()=>{try{const L=await rpc("fotos_ot",{p_tok:S.tok,p_ot:o.id});box.textContent="";if(!L.length)box.appendChild(el("p",{class:"hint",text:"Sin fotos todavía."}));L.forEach(x=>box.appendChild(miniFoto(x,o.titulo+(x.por?" · "+x.por:"")+" · "+hora(x.creado))));}catch(e){box.textContent=e.message;}};
  dlg("Fotos · "+o.titulo,el("div",null,[box,add]));carga();}

