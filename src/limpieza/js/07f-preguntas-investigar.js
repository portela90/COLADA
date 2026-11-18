/* ===== INVESTIGAR · PREGÚNTALE =====
   Escribes la pregunta como la dirías («cuántas veces ha perdido aceite la F19 este año», «quién tarda más en los derrames»,
   «saturación de Juan José el mes pasado») y la app la entiende con reglas (sin servicios de pago): saca el periodo, la persona,
   la máquina o nave, el tipo de problema, el día de la semana y las palabras del trabajo; y qué quieres saber (cuántas veces,
   cuánto tiempo, la media, quién, dónde, qué días, por semana, comparar con antes, saturación, repetidos o tiempos sin empezar).
   Contesta con una frase, una tabla y la lista de trabajos que lo justifican, y se puede bajar en Excel. */
const INV_MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const INV_DSEM=[["domingo",0],["lunes",1],["martes",2],["miercoles",3],["jueves",4],["viernes",5],["sabado",6]];
/* palabras que no son del trabajo (para no filtrar por ellas) */
const INV_NO=new Set(("cuanto cuanta cuantas cuantos veces vez tiempo horas hora minutos min quien quienes donde cuando como que cual cuales mas menos ha han he hemos "+
  "habido hay hace hecho hizo hacen se lo le les la los las de del en el y o u por para con sin a al este esta estos estas ese esa eso mes meses ano anos semana semanas dia dias hoy ayer "+
  "pasado pasada pasados ultimo ultimos ultima ultimas desde hasta entre tarda tardan tardado tardo media promedio total suma lista listado dime dame ensename muestra mostrar ver "+
  "trabajado trabajo trabajos tarea tareas numero saturacion cargado cargada cargados ocupado ocupados mucho mucha muchos poco perdido perdida perdidas pierde pierden perder pierdo "+
  "maquina maquinas sitio sitios zona zonas sido son es esta estan fue fueron era compara comparar comparado comparacion anterior antes subido bajado aumentado empeorado mejorado "+
  "cada vez evolucion tendencia va todo toda todos todas siempre principio historico persona personas trabajador trabajadores operario operarios equipo nave naves uno dos "+
  "problema problemas incidencia incidencias aviso avisos fuga fugas derrame derrames aceite aceites hidraulico taladrina taladrinas agua filtracion filtraciones gotera goteras "+
  "desbordamiento desbordamientos desborda desbordado rebosa resbaladizo resbaladiza suelo rotura roturas averia averias roto rota repite repiten repetido repetidos sigue pasa pasando "+
  "pasan reincide justificar justificado desplazamiento desplazamientos huecos empezar empiezan pulsan pulsa real reales estimado estimados apuntan apunta tiene tienen tenido "+
  "mi mis tu su sus nos nuestro nuestra quiero saber necesito sale salen hubo cuanta mayor menor peor mejor primero primera ultima limpiado limpiar limpiaron limpiada limpiadas limpiados hacer apuntado apuntar apuntados atendido atender recogido "+INV_MESES.join(" ")+" "+INV_DSEM.map(x=>x[0]).join(" ")).split(" "));
const invYMD=(y,m,d)=>y+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");
const invFinMes=(y,m)=>invYMD(y,m,new Date(y,m,0).getDate());
/* periodo escrito en la pregunta (null = el de la pantalla) */
function invPerQ(t){const h=hoyISO(),Y=+h.slice(0,4),M=+h.slice(5,7);let m;
  if((m=t.match(/desde (?:el )?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?.*?hasta (?:el )?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/))){
    const y1=m[3]?(m[3].length===2?2000+ +m[3]:+m[3]):Y,y2=m[6]?(m[6].length===2?2000+ +m[6]:+m[6]):Y;const a=invYMD(y1,+m[2],+m[1]),b=invYMD(y2,+m[5],+m[4]);return{d0:a,d1:b,t:"del "+fDM(a)+" al "+fDM(b)};}
  if(/\bhoy\b/.test(t))return{d0:h,d1:h,t:"hoy"};
  if(/\bayer\b/.test(t)){const a=sumaD(h,-1);return{d0:a,d1:a,t:"ayer"};}
  if(/semana pasada/.test(t)){const l=sumaD(lunesDe(h),-7);return{d0:l,d1:sumaD(l,6),t:"la semana pasada"};}
  if(/esta semana/.test(t))return invPeriodo("sem");
  if(/(mes pasado|ultimo mes|mes anterior)/.test(t)&&!/compar/.test(t))return invPeriodo("mesant");
  if(/este mes/.test(t))return invPeriodo("mes");
  if((m=t.match(/ultim[oa]s?\s+(\d+)\s+(dias|semanas|meses)/))){const n=+m[1]*(m[2]==="dias"?1:m[2]==="semanas"?7:30);return{d0:sumaD(h,-(n-1)),d1:h,t:"los últimos "+m[1]+" "+m[2].replace("dias","días")};}
  if((m=t.match(/ultim[oa]s?\s+(dos|tres|seis)\s+(semanas|meses)/))){const k={dos:2,tres:3,seis:6}[m[1]],n=k*(m[2]==="semanas"?7:30);return{d0:sumaD(h,-(n-1)),d1:h,t:"los últimos "+k+" "+m[2]};}
  const mi=INV_MESES.findIndex(x=>new RegExp("\\b"+x+"\\b").test(t));const ya=(t.match(/\b(20\d\d)\b/)||[])[1];
  if(mi>=0){const y=ya?+ya:(mi+1>M?Y-1:Y);const a=invYMD(y,mi+1,1),b=invFinMes(y,mi+1);return{d0:a,d1:b<h?b:h,t:INV_MESES[mi]+(y!==Y?" de "+y:"")};}
  if(ya)return{d0:ya+"-01-01",d1:(ya+"-12-31")<h?ya+"-12-31":h,t:"el año "+ya};
  if(/(este ano|en lo que va de ano|el ano)/.test(t))return invPeriodo("ano");
  if(/(siempre|desde el principio|historico|todo el tiempo)/.test(t))return{d0:"2025-01-01",d1:h,t:"desde el principio"};
  return null;}
/* tipo de problema nombrado: un tipo, «todos los problemas» o nada */
function invCatQ(t){if(/(aceite|hidraulic)/.test(t))return"aceite";if(/taladrin/.test(t))return"taladrina";if(/(desbord|rebos)/.test(t))return"desborde";
  if(/\b(agua|filtrac|gotera|lluvia|humedad)/.test(t))return"agua";if(/resbal/.test(t))return"resbala";if(/\b(rotura|averi|roto|rota|estropead)/.test(t))return"rotura";
  if(/\b(problema|incidencia|fuga|derrame|perdida|aviso)/.test(t))return"*";return null;}
/* máquina (F19, M3, H-F66) o nave */
function invSitioQ(t){let m=t.match(/\b(?:h-)?([fm])\s?-?(\d{1,3})\b/);if(m)return{k:"maq",v:m[1].toUpperCase()+(+m[2])};
  m=t.match(/\bnave\s*(1|2|uno|dos)\s*(a|b)?\b/);if(m){const n=m[1]==="uno"?"1":m[1]==="dos"?"2":m[1];return{k:"nave",v:"Nave "+n+(m[2]?m[2].toUpperCase():"")};}return null;}
/* personas nombradas (por nombre o nombre y apellido) */
function invPersQ(t,nombres){const tk=n=>sinAcento(n).toLowerCase().split(/\s+/).filter(w=>w.length>=3&&!INV_NO.has(w));
  const enT=w=>new RegExp("\\b"+w+"\\b").test(t);
  const full=nombres.filter(n=>{const k=tk(n);return k.length>1&&k.every(enT);});if(full.length)return full;
  const parcial=nombres.filter(n=>{const k=tk(n);return k.length&&k.some(enT);});
  if(parcial.length<=1)return parcial;
  /* «Cristian» con dos Cristian: los que tienen más palabras en la pregunta */
  const sc=n=>tk(n).filter(enT).length,max=Math.max(...parcial.map(sc));return parcial.filter(n=>sc(n)===max);}
/* lo que hay que contestar */
function invIntQ(t){const has=re=>re.test(t);
  if(has(/(saturac|cargad|ocupad|sin justificar|desplazamiento|hueco|rendimiento|productiv)/))return"sat";
  if(has(/(repite|repetid|sigue pasando|cada cuanto|reincid|vuelve a)/))return"rep";
  if(has(/(sin empezar|tiempo real|estimad|no pulsa|no pulsan|pulsan empezar|pulsa empezar|no apunta)/))return"cal";
  return"gen";}
function invGrupoQ(t){const has=re=>re.test(t);
  if(has(/\b(quien|quienes|por persona|trabajador|operario|cada uno)\b/))return"per";
  if(has(/(donde|que maquina|que maquinas|que sitio|que sitios|que zona|en que (maquina|sitio|zona|nave)|por maquina|por sitio)/))return"sit";
  if(has(/(que dia|que dias|dia de la semana|dias de la semana|por dia de)/))return"dsem";
  if(has(/(por semana|cada semana|semana a semana|evolucion|tendencia|va a mas)/))return"sem";
  if(has(/(por mes|cada mes|mes a mes)/))return"mes";
  if(has(/(que trabajos|que tareas|en que se va|en que se pierde|que es lo que|por trabajo|por tarea)/))return"trab";
  if(has(/(que tipo|por tipo|que problemas)/))return"tipo";
  return null;}
function invMetQ(t){if(/(tarda|media|promedio|cuanto dura|duracion)/.test(t))return"avg";if(/(cuantas veces|cuantos|cuantas|numero de|veces)/.test(t)&&!/(tiempo|horas)/.test(t))return"n";
  if(/(tiempo|horas|minutos|se pierde|perdid)/.test(t)&&!/(cuantas veces)/.test(t))return"min";return"both";}

/* carga (con el periodo anterior para comparar) */
const INV_CACHE={};
async function invCarga(d0,d1){const A=invAnterior(d0,d1),k=A.d0+"|"+d1;if(INV_CACHE[k])return INV_CACHE[k];
  const [O,W,R,FE,SU,EL]=await Promise.all([rpc("ots_rango",{p_tok:S.tok,p_desde:A.d0,p_hasta:d1}),trabajadores(true),rpc("horas_rango",{p_tok:S.tok,p_desde:d0,p_hasta:d1}),
    rpc("festivos_listar",{p_tok:S.tok}),sustRango(d0,d1),rpc("elementos",{p_tok:S.tok}).catch(()=>[])]);
  return INV_CACHE[k]={O:O.filter(o=>!o.borrado),W,R,FE,SU,EL:EL||[],A};}

/* entender la pregunta */
function invEntiende(q,C,F){const t=sinAcento(q).toLowerCase().replace(/[¿?¡!.,;:]/g," ").replace(/\s+/g," ").trim();
  const per=invPerQ(t)||{d0:F.d0,d1:F.d1,t:F.t};
  const nombres=[...new Set(C.W.filter(w=>w.rol!=="admin"||C.O.some(o=>o.hecho_por_n===w.nombre)).map(w=>w.nombre))];
  const pers=invPersQ(t,nombres);
  const sitio=invSitioQ(t),cat=invCatQ(t);
  const dsem=(INV_DSEM.find(([d])=>new RegExp("\\b"+d+"s?\\b").test(t))||[])[1];
  const usadas=new Set();pers.forEach(n=>sinAcento(n).toLowerCase().split(/\s+/).forEach(w=>usadas.add(w)));
  const libres=t.split(" ").filter(w=>w.length>=3&&!INV_NO.has(w)&&!usadas.has(w)&&!/^[fm]\d+$/.test(w)&&!/^20\d\d$/.test(w));
  return{t,q,per,pers,sitio,cat,dsem,libres,int:invIntQ(t),grupo:invGrupoQ(t),met:invMetQ(t),comp:/(compar|anterior|antes|subido|bajado|aumentado|empeorado|mejorado|que el mes)/.test(t),menos:/\bmenos\b/.test(t)};}

/* trabajos que cumplen lo pedido (sin periodo) */
function invFiltra(L,E,C){const nav=sinAcento(E.sitio&&E.sitio.k==="nave"?E.sitio.v:"").toLowerCase();
  const naveMaq={};(C.EL||[]).forEach(e=>{const m=String(e.codigo||"").match(/F\s?-?(\d+)/i);if(m)naveMaq["F"+(+m[1])]=sinAcento(e.lugar||"").toLowerCase();});
  let X=L.filter(o=>{if(E.pers.length&&!E.pers.includes(o.hecho_por_n)&&!(o.estado!=="hecha"&&(o.nombres||[]).some(n=>E.pers.includes(n))))return false;
    if(E.cat==="*"&&!invCat(o))return false;if(E.cat&&E.cat!=="*"&&invCat(o)!==E.cat)return false;
    if(E.sitio&&E.sitio.k==="maq"&&invSitio(o)!==E.sitio.v)return false;
    if(E.sitio&&E.sitio.k==="nave"){const s=invSitio(o),txt=sinAcento([s,o.nave,o.lugar].filter(Boolean).join(" ")).toLowerCase();if(!txt.includes(nav)&&!(naveMaq[s]||"").startsWith(nav))return false;}
    if(E.dsem!=null&&new Date(o.fecha+"T12:00:00").getDay()!==E.dsem)return false;return true;});
  /* palabras del trabajo: solo si hay trabajos que las tengan todas (si no, se ignoran y se dice) */
  E.ignoradas=[];if(E.libres.length){const cl=o=>(invClave(o)+" "+sinAcento((o.descripcion||"")+" "+(o.lugar||"")).toLowerCase()).split(/\s+/);
    const tiene=(o,w)=>cl(o).some(x=>x.startsWith(w.slice(0,Math.max(4,w.length-2))));
    const Y=X.filter(o=>E.libres.every(w=>tiene(o,w)));if(Y.length)X=Y;else{const ok=E.libres.filter(w=>X.some(o=>tiene(o,w)));if(ok.length){X=X.filter(o=>ok.every(w=>tiene(o,w)));}E.ignoradas=E.libres.filter(w=>!ok.includes(w));}}
  return X;}

/* contestar */
function invContesta(E,C){const{d0,d1}=E.per;const enP=o=>o.fecha>=d0&&o.fecha<=d1;const A=invAnterior(d0,d1);const enA=o=>o.fecha>=A.d0&&o.fecha<=A.d1;
  const todos=invFiltra(C.O,E,C),L=todos.filter(enP),La=todos.filter(enA);const H=L.filter(o=>o.estado==="hecha");
  const T=a=>a.reduce((s,o)=>s+invMin(o),0);const r={L,cols:null,filas:[],frase:""};
  const desc=[E.cat==="*"?"problemas":E.cat?invCatN(E.cat).toLowerCase():null,E.sitio?(E.sitio.k==="maq"?"en la "+E.sitio.v:"en la "+E.sitio.v):null,
    E.pers.length?"de "+E.pers.join(" y "):null,E.dsem!=null?"los "+DIAS_INV[E.dsem].toLowerCase():null,E.libres.length&&!E.ignoradas.length?"«"+E.libres.join(" ")+"»":null].filter(Boolean).join(" ");
  const quien=desc||"trabajos";
  if(E.int==="sat"){const J=invJornadas(C.W,C.R,C.FE,C.SU,d0,d1);const X=invDatos(C.O,J,d0,d1,[]);let P=X.sat;if(E.pers.length)P=P.filter(p=>E.pers.includes(p.n));
    r.cols=["Persona","Jornada","Trabajos","Despl. y prep.","Sin justificar","Saturación"];r.filas=P.map(p=>[p.n,invH(p.jor),invH(p.min),invH(p.desp),invH(p.sin),p.jor?invPct(p.cont,p.jor)+" %":"—"]);
    const jo=P.reduce((s,p)=>s+p.jor,0),co=P.reduce((s,p)=>s+p.cont,0);
    r.frase=(P.length===1?"Saturación de "+P[0].n:"Saturación"+(E.pers.length?"":" del equipo"))+" "+E.per.t+": "+(jo?invPct(co,jo)+" %":"sin horas de jornada")+" ("+invH(co)+" de "+invH(jo)+" de jornada).";
    r.L=P.length===1?X.H.filter(o=>o.hecho_por_n===P[0].n):[];return r;}
  if(E.int==="rep"){const X=invDatos(C.O.filter(o=>todos.includes(o)||!invCat(o)),{},d0,d1,C.O.filter(enA));let G=X.rep;
    r.cols=["Sitio","Problema","Veces","Tiempo","Cada (días)","Última","Sigue"];r.filas=G.map(g=>[g.sitio,invCatN(g.cat),g.n,invH(g.min),g.cada!=null?String(Math.round(g.cada*10)/10).replace(".",","):"—",fCorta(g.ult),g.sigue?"Sí":"No"]);
    r.frase=G.length?G.length+(G.length===1?" sitio donde se repite":" sitios donde se repite")+" "+E.per.t+". "+invFrase(G[0]):"Nada se ha repetido en el mismo sitio "+E.per.t+".";r.L=G.length?G[0].L:[];r.rep=G;return r;}
  if(E.int==="cal"){const G={};H.forEach(o=>{const n=o.hecho_por_n||"Sin indicar";const g=G[n]=G[n]||{n,t:0,r:0};g.t++;if(invReal(o))g.r++;});
    const P=Object.values(G).sort((a,b)=>(a.r/a.t)-(b.r/b.t));r.cols=["Persona","Trabajos","Con «Empezar»","Sin empezar","% real"];r.filas=P.map(g=>[g.n,g.t,g.r,g.t-g.r,invPct(g.r,g.t)+" %"]);
    r.frase=P.length?"Quien menos pulsa «Empezar» "+E.per.t+": "+P[0].n+" ("+invPct(P[0].t-P[0].r,P[0].t)+" % de sus trabajos sin tiempo real).":"Ningún trabajo hecho "+E.per.t+".";r.L=H.filter(o=>!invReal(o));return r;}
  /* general: contar, tiempo, media, agrupado */
  const met=E.met,lab={n:"Veces",min:"Tiempo",avg:"Media"};
  const val=(a)=>({n:a.length,min:T(a.filter(o=>o.estado==="hecha")),h:a.filter(o=>o.estado==="hecha").length});
  const fmt=v=>met==="n"?[v.n]:met==="min"?[invH(v.min)]:met==="avg"?[v.h?invH(v.min/v.h):"—"]:[v.n,invH(v.min),v.h?invH(v.min/v.h):"—"];
  const head=met==="n"?["Veces"]:met==="min"?["Tiempo"]:met==="avg"?["Media"]:["Veces","Tiempo","Media"];
  const key=met==="avg"?(v=>v.h?v.min/v.h:-1):met==="n"?(v=>v.n):(v=>v.min||v.n/1000);
  const g=E.grupo;const tot=val(L),ant=val(La);
  const cmp=(a,b)=>b>a?"más":b<a?"menos":"igual";
  if(g){const by=o=>g==="per"?(o.hecho_por_n||"Sin hacer"):g==="sit"?invSitio(o):g==="dsem"?DIAS_INV[new Date(o.fecha+"T12:00:00").getDay()]:g==="sem"?"Semana del "+fDM(lunesDe(o.fecha)):g==="mes"?INV_MESES[+o.fecha.slice(5,7)-1]+" "+o.fecha.slice(0,4):g==="tipo"?(invCat(o)?invCatN(invCat(o)):"Trabajo normal"):(invClave(o)||"(sin título)");
    const M={};L.forEach(o=>{const k=by(o);(M[k]=M[k]||[]).push(o);});const Ma={};La.forEach(o=>{const k=by(o);(Ma[k]=Ma[k]||[]).push(o);});
    let ks=Object.keys(M);if(g==="sem"||g==="mes")ks.sort((a,b)=>M[a][0].fecha.localeCompare(M[b][0].fecha));else if(g==="dsem")ks.sort((a,b)=>((DIAS_INV.indexOf(a)+6)%7)-((DIAS_INV.indexOf(b)+6)%7));
    else ks.sort((a,b)=>E.menos?key(val(M[a]))-key(val(M[b])):key(val(M[b]))-key(val(M[a])));
    const nom=k=>g==="trab"?M[k][0].titulo.replace(/\s*·.*$/,""):k;
    r.cols=[{per:"Persona",sit:"Sitio",dsem:"Día",sem:"Semana",mes:"Mes",trab:"Trabajo",tipo:"Tipo"}[g]].concat(head).concat(E.comp?["Antes"]:[]);
    r.filas=ks.map(k=>[nom(k)].concat(fmt(val(M[k]))).concat(E.comp?[(Ma[k]||[]).length]:[]));
    const top=ks.filter(k=>g!=="sem"&&g!=="mes"&&g!=="dsem")[0]||ks.slice().sort((a,b)=>key(val(M[b]))-key(val(M[a])))[0];
    r.frase=ks.length?quien.charAt(0).toUpperCase()+quien.slice(1)+" "+E.per.t+" ("+tot.n+" en total, "+invH(tot.min)+"). "+(E.menos?"El que menos":"El que más")+": "+nom(top)+" ("+fmt(val(M[top])).join(" · ")+")."+
      (E.comp?" Periodo anterior: "+ant.n+" ("+cmp(ant.n,tot.n)+" ahora).":""):"No hay "+quien+" "+E.per.t+".";
    r.top=k=>M[k];return r;}
  r.cols=["",E.per.t].concat(["Periodo anterior"]);
  r.filas=[["Veces",tot.n,ant.n],["Tiempo",invH(tot.min),invH(ant.min)],["Media por vez",tot.h?invH(tot.min/tot.h):"—",ant.h?invH(ant.min/ant.h):"—"]];
  r.frase=tot.n?quien.charAt(0).toUpperCase()+quien.slice(1)+" "+E.per.t+": "+(met==="avg"?"de media "+(tot.h?invH(tot.min/tot.h):"—")+" cada vez ("+tot.n+" veces)":met==="min"?invH(tot.min)+" en "+tot.n+" veces":tot.n+(tot.n===1?" vez":" veces")+", "+invH(tot.min))+"."+
    " En el periodo anterior: "+ant.n+(ant.n===1?" vez":" veces")+(ant.n!==tot.n?" ("+(tot.n>ant.n?"ha subido":"ha bajado")+")":"")+".":"No hay "+quien+" "+E.per.t+"."+(ant.n?" En el periodo anterior hubo "+ant.n+".":"");
  return r;}

/* la tarjeta del buscador */
const INV_EJ=["¿Cuántas veces ha perdido aceite la F19 este año?","¿Qué máquinas pierden más aceite en los últimos 3 meses?","¿Quién tarda más en los derrames de taladrina?",
  "Saturación de cada uno el mes pasado","¿Qué días hay más derrames?","Tiempo perdido en problemas por semana","¿Dónde se repiten las fugas de agua?","¿Quién no pulsa Empezar?",
  "Derrames de aceite en la Nave 2 comparado con el mes anterior","¿En qué se va el tiempo los sábados?"];
function invPreguntaCard(F){const res=el("div",{id:"invResp"});const qi=el("input",{type:"search",id:"invQ",placeholder:"Escribe tu pregunta…",value:S.invQ||"",style:"flex:1;min-width:0",
    onkeydown:e=>{if(e.key==="Enter"){e.preventDefault();ir();}}});
  const ir=async()=>{const q=qi.value.trim();if(!q){qi.focus();return;}S.invQ=q;res.textContent="";res.appendChild(el("p",{class:"hint",text:"Buscando…"}));
    try{const per=invPerQ(sinAcento(q).toLowerCase())||F;const C=await invCarga(per.d0,per.d1);const E=invEntiende(q,C,F);invPinta(res,E,invContesta(E,C));}
    catch(e){res.textContent="";res.appendChild(el("p",{class:"hint",text:e.message||"No he podido contestar"}));}};
  const ej=el("details",{style:"margin-top:6px"},[el("summary",{class:"hint",style:"cursor:pointer",text:"Ejemplos de preguntas"}),el("div",{class:"chips",style:"margin-top:6px"},INV_EJ.map(x=>el("button",{type:"button",class:"chip",text:x,onclick:()=>{qi.value=x;ir();}})))]);
  if(S.invQ)setTimeout(ir,0);
  return el("div",{class:"card",id:"invPreg"},[el("div",{class:"hd"},el("h2",{text:"Pregúntale"})),el("div",{class:"bd"},[
    el("div",{class:"row",style:"gap:8px;align-items:center;flex-wrap:nowrap"},[qi,el("button",{class:"btn",type:"button",text:"Preguntar",onclick:ir})]),ej,res])]);}
function invPinta(res,E,r){res.textContent="";
  const ent=[["Periodo",E.per.t],E.pers.length?["Persona",E.pers.join(", ")]:null,E.sitio?["Dónde",E.sitio.v]:null,E.cat?["Problema",E.cat==="*"?"todos los problemas":invCatN(E.cat)]:null,
    E.dsem!=null?["Día",DIAS_INV[E.dsem]]:null,E.libres.length&&E.ignoradas.length<E.libres.length?["Trabajo",E.libres.filter(w=>!E.ignoradas.includes(w)).join(" ")]:null].filter(Boolean);
  res.appendChild(el("div",{class:"meta",style:"margin:10px 0 6px"},[el("small",{class:"hint",style:"margin:0",text:"He entendido:"})].concat(ent.map(([a,b])=>el("span",{class:"pill info",text:a+": "+b})))));
  if(E.ignoradas.length)res.appendChild(el("p",{class:"hint",style:"margin:0 0 6px",text:"No encuentro trabajos con «"+E.ignoradas.join(" ")+"»: no lo he tenido en cuenta."}));
  res.appendChild(el("p",{style:"font-weight:600;margin:6px 0 10px",text:r.frase}));
  if(r.cols&&r.filas.length)res.appendChild(el("div",{style:"overflow:auto"},el("table",{class:"g-tab"},[el("thead",null,el("tr",null,r.cols.map(h=>el("th",{text:h})))),
    el("tbody",null,r.filas.slice(0,40).map(f=>el("tr",null,f.map(x=>el("td",{text:String(x)})))))])));
  const L=(r.L||[]).slice().sort((a,b)=>(b.fecha+(b.creado||"")).localeCompare(a.fecha+(a.creado||"")));
  if(L.length)res.appendChild(el("details",{style:"margin-top:10px"},[el("summary",{class:"hint",style:"cursor:pointer;font-weight:600",text:"Ver los "+L.length+" trabajos"}),
    el("div",{style:"overflow:auto"},el("table",{class:"g-tab"},[el("thead",null,el("tr",null,["Día","Trabajo","Dónde","Quién","Tiempo"].map(h=>el("th",{text:h})))),
      el("tbody",null,L.slice(0,200).map(o=>el("tr",null,[el("td",{text:fCorta(o.fecha)}),el("td",{text:o.titulo}),el("td",{text:invSitio(o)}),el("td",{text:o.hecho_por_n||(o.nombres||[]).join(", ")||"—"}),
        el("td",{text:o.estado==="hecha"?invH(invMin(o))+(invReal(o)?"":" (est.)"):(EST[o.estado]||[o.estado])[0]})])))]))]));
  res.appendChild(el("div",{class:"row",style:"margin-top:10px"},[el("button",{class:"btn sec peq",type:"button",text:"Excel de esta respuesta",onclick:async e=>{e.target.disabled=true;
    try{await libXLSX();const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["Pregunta",E.q],["Periodo",E.per.t+" ("+E.per.d0+" a "+E.per.d1+")"],["Respuesta",r.frase]].concat(r.cols?[[],r.cols].concat(r.filas):[])),"Respuesta");
      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(L.length?L.map(o=>({"Fecha":o.fecha,"Hora":o.creado?hora(o.creado):"","Trabajo":o.titulo,"Descripción":o.descripcion||"","Dónde":invSitio(o),"Problema":invCat(o)?invCatN(invCat(o)):"","Quién":o.hecho_por_n||"","Estado":o.estado,"Minutos":o.estado==="hecha"?Math.round(invMin(o)):null,"Tiempo real":invReal(o)?"Sí":"Estimado"})):[{"":"Ningún trabajo"}]),"Trabajos");
      bajar(new Blob([XLSX.write(wb,{type:"array",bookType:"xlsx"})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),"pregunta-limpieza.xlsx");}catch(er){toast(er.message);}e.target.disabled=false;}})]));}
