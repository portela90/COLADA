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
  "mi mis tu su sus nos nuestro nuestra quiero saber necesito sale salen hubo cuanta mayor menor peor mejor primero primera ultima limpiado limpiar limpiaron limpiada limpiadas limpiados hacer apuntado apuntar apuntados atendido atender recogido "+
  "perdemos perdiendo repetir repetimos repetirse repetida repetidas mismo misma mismos mismas soluciona solucionan solucionado solucionar solucion arregla arreglan arreglado arreglar arreglo "+
  "porque vuelve vuelven volver otra otras otro otros carga cargas libre libres desocupado desocupados parado parados holgado trabaja trabajan "+
  "franja franjas turno turnos manana tarde noche partido refuerzo primera segunda tercera cuarta quinta resumen informe jefe jefes pendiente pendientes hechos hecha hechas "+
  "terminar terminado terminados quedado quedaron quedan queda ahorro ahorrar ahorramos ahorrariamos ahorraria ahorrarian vuelto frente versus contra tardamos tardais "+
  "arreglaron arreglen solucionaron solucionen respecto empeora empeoran mejora mejoran subir bajar "+INV_MESES.join(" ")+" "+INV_DSEM.map(x=>x[0]).join(" ")).split(" "));
const invYMD=(y,m,d)=>y+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");
const invFinMes=(y,m)=>invYMD(y,m,new Date(y,m,0).getDate());
/* periodo escrito en la pregunta (null = el de la pantalla) */
function invPerQ(t){const h=hoyISO(),Y=+h.slice(0,4),M=+h.slice(5,7);let m;
  if((m=t.match(/desde (?:el )?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?.*?hasta (?:el )?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/))){
    const y1=m[3]?(m[3].length===2?2000+ +m[3]:+m[3]):Y,y2=m[6]?(m[6].length===2?2000+ +m[6]:+m[6]):Y;const a=invYMD(y1,+m[2],+m[1]),b=invYMD(y2,+m[5],+m[4]);return{d0:a,d1:b,t:"del "+fDM(a)+" al "+fDM(b)};}
  if((m=t.match(/desde (?:el )?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/))){const y=m[3]?(m[3].length===2?2000+ +m[3]:+m[3]):Y;let a=invYMD(y,+m[2],+m[1]);if(!m[3]&&a>h)a=invYMD(Y-1,+m[2],+m[1]);return{d0:a,d1:h,t:"desde el "+fDM(a)};}
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
/* periodo de la pregunta o, si no dice ninguno, el de la pantalla (para el ahorro, los últimos 3 meses: da una media más fiable) */
const INV_AHORRO=/(ahorr|si (lo |la |los |las |se |le )?(arregl|solucion))/;
function invPerDef(t,F){const p=invPerQ(t);if(p)return p;if(INV_AHORRO.test(t)){const h=hoyISO();return{d0:sumaD(h,-89),d1:h,t:"los últimos 3 meses"};}return{d0:F.d0,d1:F.d1,t:F.t};}
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
  if(has(/(resumen|informe del mes|informe para|como ha ido)/))return"res";
  if(has(/(sin hacer|no se (han )?hecho|no se hicieron|no se ha hecho|pendiente|quedado sin|quedaron sin|quedan sin|no hech|sin terminar)/))return"pend";
  /* Nave 1 frente a Nave 2 (no «la Nave 2 comparado con el mes anterior») */
  if(has(/(compar|frente|versus|\bvs\b|contra|entre|diferencia).*\bnaves\b|\bnaves\b.*(compar|frente|versus|\bvs\b)|las dos naves|ambas naves|cada nave|por naves?\b/)||
     has(/nave\s*(1|uno)\b.*nave\s*(2|dos)\b|nave\s*(2|dos)\b.*nave\s*(1|uno)\b|nave\s*(1|uno)\s*(y|con|frente a|vs|contra)\s*(la\s*)?(2|dos)\b/))return"naves";
  if(has(INV_AHORRO))return"ahorro";
  if(has(/(ha vuelto|han vuelto|vuelto a pasar|vuelto a perder|vuelto a salir|desde que (se |la |lo |le )?(arregl|solucion))/))return"vuelto";
  if(has(/(saturac|carga|ocupad|desocupad|libre|parad|holgad|sin justificar|desplazamiento|hueco|rendimiento|productiv)/)||has(/(quien|que trabajador|que operario).*(menos|mas) trabaj/))return"sat";
  if(has(/(que|cual|cuales|donde|en que)\b.{0,25}(empeor|a peor|mejorad|a mejor|ha subido|han subido|ha bajado|han bajado|ha aumentado|han aumentado)/))return"evo";
  if(has(/(repite|repetid|repetir|sigue pasando|cada cuanto|reincid|vuelve a|vuelven a|no se solucion|no se arregl|no lo arregl|no lo solucion|sin solucion|sin arregl)/))return"rep";
  /* «¿dónde se pierde más tiempo?» = en repetir el mismo trabajo porque el problema no se arregla (Cristian, 18/11/2026);
     con «por semana», «por día»… es el tiempo en problemas de cada semana o día */
  if(has(/(se pierde|se pierden|pierde mas|perdemos|perdiendo|perder (mas )?tiempo|tiempo perdido)/)&&!["dsem","sem","mes","hora","semmes","turno","per"].includes(invGrupoQ(t)))return"rep";
  if(has(/(sin empezar|tiempo real|estimad|no pulsa|no pulsan|pulsan empezar|pulsa empezar|no apunta)/))return"cal";
  return"gen";}
function invGrupoQ(t){const has=re=>re.test(t);
  if(has(/(a que hora|que hora|en que horas|por horas?\b|franja|horario)/))return"hora";
  if(has(/(semana del mes|que semana|primera semana|segunda semana|tercera semana|cuarta semana|ultima semana del mes)/))return"semmes";
  if(has(/(por turno|que turno|cada turno|turnos|segun el turno)/))return"turno";
  if(has(/\b(quien|quienes|por persona|trabajador|operario|cada uno)\b/))return"per";
  if(has(/(donde|que maquina|que maquinas|que sitio|que sitios|que zona|en que (maquina|sitio|zona|nave)|por maquina|por sitio)/))return"sit";
  if(has(/(que dia|que dias|dia de la semana|dias de la semana|por dia de)/))return"dsem";
  if(has(/(por semana|cada semana|semana a semana|evolucion|tendencia|va a mas)/))return"sem";
  if(has(/(por mes|cada mes|mes a mes)/))return"mes";
  if(has(/(que trabajos|que tareas|en que se va|en que se pierde|que es lo que|por trabajo|por tarea)/))return"trab";
  if(has(/(que tipo|por tipo|que problemas)/))return"tipo";
  return null;}
/* turno nombrado («turno de tarde», «los de mañana»): se filtra por él */
function invTurnoQ(t){const m=t.match(/\b(?:turno (?:de )?(?:la )?)?(manana finde|manana|tarde|noche|partido|refuerzo)\b/);if(!m)return null;
  if(!/turno/.test(t)&&!/(de|por|en) la (manana|tarde|noche)/.test(t))return null;return m[1];}
/* turno del trabajo: el apuntado o, si no, el de quien lo hizo (entre semana o el finde) */
function invTurno(o,C){if(o.turno)return o.turno;const W=C._wid||(C._wid=Object.fromEntries((C.W||[]).map(w=>[w.id,w])));const id=o.hecho_por||(o.asignados||[])[0];const w=W[id];
  if(!w)return"Sin turno";const fin=[0,6].includes(new Date(o.fecha+"T12:00:00").getDay());return(fin?w.turno_finde:w.turno_semana)||w.turno_semana||"Sin turno";}
/* hora del aviso (cuando se dio el aviso; los fijos no tienen: se usa cuando se empezó) */
function invHora(o){const x=o.origen==="rapida"&&o.creado?o.creado:o.inicio;if(!x)return null;return new Date(x).getHours();}
const invFranja=h=>h==null?"Sin hora":String(h-h%2).padStart(2,"0")+"–"+String(h-h%2+2).padStart(2,"0")+" h";
const invSemMes=f=>{const d=+f.slice(8,10),k=Math.min(5,Math.ceil(d/7));return k+".ª semana (días "+((k-1)*7+1)+"–"+(k===5?"31":k*7)+")";};
function invMetQ(t){if(/(tarda|media|promedio|cuanto dura|duracion)/.test(t))return"avg";if(/(cuantas veces|cuantos|cuantas|numero de|veces)/.test(t)&&!/(tiempo|horas)/.test(t))return"n";
  if(/(tiempo|horas|minutos|se pierde|perdid)/.test(t)&&!/(cuantas veces)/.test(t))return"min";return"both";}

/* carga (con el periodo anterior para comparar) */
const INV_CACHE={};
async function invCarga(d0,d1){const A=invAnterior(d0,d1),k=A.d0+"|"+d1;if(INV_CACHE[k])return INV_CACHE[k];
  const [O,W,R,FE,SU,EL]=await Promise.all([rpc("ots_rango",{p_tok:S.tok,p_desde:A.d0,p_hasta:d1}),trabajadores(true),rpc("horas_rango",{p_tok:S.tok,p_desde:d0,p_hasta:d1}),
    rpc("festivos_listar",{p_tok:S.tok}),sustRango(d0,d1),rpc("elementos",{p_tok:S.tok}).catch(()=>[])]);
  return INV_CACHE[k]={O:O.filter(o=>!o.borrado),W,R,FE,SU,EL:EL||[],A};}

/* ===== lo que Cristian le enseña (tabla inv_dic): persona, lugar, problema, frase y favorita ===== */
let INV_DIC=[];
async function invDicCarga(){try{INV_DIC=(await rpc("inv_dic_listar",{p_tok:S.tok}))||[];}catch(e){INV_DIC=[];}return INV_DIC;}
const INV_CATW={aceite:"aceite",taladrina:"taladrina",agua:"agua",desborde:"desborde",resbala:"resbaladizo",rotura:"rotura"};
const invRe=w=>new RegExp("(^|\\s)"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?=\\s|$)","g");
/* aplica el diccionario a la pregunta ya en minúsculas y sin tildes; devuelve el texto y las personas que nombra */
function invAplicaDic(t){const pers=[];
  INV_DIC.filter(d=>d.tipo==="frase").forEach(d=>{t=t.replace(invRe(d.palabra),"$1"+sinAcento(d.valor||"").toLowerCase());});
  INV_DIC.filter(d=>d.tipo==="problema"&&INV_CATW[d.valor]).forEach(d=>{t=t.replace(invRe(d.palabra),"$1"+INV_CATW[d.valor]);});
  INV_DIC.filter(d=>d.tipo==="persona").sort((a,b)=>b.palabra.length-a.palabra.length).forEach(d=>{if(invRe(d.palabra).test(t)){pers.push(d.valor);t=t.replace(invRe(d.palabra),"$1");}});
  /* grupo de trabajos (ronda 3): «hornos» = los trabajos con horno, escoria, bolones… (solo la palabra enseñada: «el horno de fusión» sigue siendo ese horno) */
  let conj=null;INV_DIC.filter(d=>d.tipo==="grupo"&&d.valor).forEach(d=>{if(conj)return;const re=invRe(sinAcento(d.palabra).toLowerCase());
    if(re.test(t)){conj={n:d.palabra.charAt(0).toUpperCase()+d.palabra.slice(1),w:sinAcento(d.valor).toLowerCase().split(/\s*,\s*/).map(w=>w.trim()).filter(Boolean)};t=t.replace(re,"$1");}});
  return{t:t.replace(/\s+/g," ").trim(),pers,conj};}
/* ¿el trabajo es del grupo? (alguna palabra del título, descripción o lugar empieza por una de las del grupo;
   las cortas, de 4 letras o menos, tienen que ser la palabra entera o su plural: «saca» sí, «sacar» no) */
const invEnConj=(o,c)=>{const w=sinAcento([o.titulo,o.descripcion,o.lugar].filter(Boolean).join(" ")).toLowerCase().split(/[^a-z0-9ñ]+/);return c.w.some(g=>w.some(x=>g.length>4?x.startsWith(g):(x===g||x===g+"s"||x===g+"es")));};
/* sitio por su nombre tal como sale en los avisos («14024», «punto de consumo m3», «moriz»): gana el que más palabras casa */
const INV_SIT_NO=new Set(["de","del","la","el","a","al","junto","en","y"]);
function invSitioNom(t,O){let best=null;[...new Set(O.map(invSitio))].forEach(s=>{if(/^(nave|sin lugar|\d+ y \d+$)/i.test(s))return;
    const tk=sinAcento(s).toLowerCase().split(/[\s,.()·]+/).filter(w=>(w.length>=2||/^\d$/.test(w))&&!INV_SIT_NO.has(w));
    if(tk.length&&tk.every(w=>invRe(w).test(t))&&(!best||tk.length>best.n))best={v:s,n:tk.length,tk};});return best;}

/* entender la pregunta */
function invEntiende(q,C,F){const t0=sinAcento(q).toLowerCase().replace(/[¿?¡!.,;:]/g," ").replace(/\s+/g," ").trim();
  const D=invAplicaDic(t0),t=D.t;
  const per=invPerDef(t,F);const turno=invTurnoQ(t);
  const nombres=[...new Set(C.W.filter(w=>w.rol!=="admin"||C.O.some(o=>o.hecho_por_n===w.nombre)).map(w=>w.nombre))];
  const pers=[...new Set(D.pers.concat(invPersQ(t,nombres)))];
  const sn=invSitioNom(t,C.O),sr=invSitioQ(t);
  const sitio=sn&&(sn.n>1||!sr||sr.k!=="maq"||sr.v!==sn.v)&&!(sr&&sr.k==="nave"&&sn.n<2)?{k:"lugar",v:sn.v}:sr;
  const cat=invCatQ(t);
  /* días de la semana (varios a la vez); «el finde» / «fin de semana» = sábado y domingo (ronda 2) */
  let dsem=INV_DSEM.filter(([d])=>new RegExp("\\b"+d+"s?\\b").test(t)).map(x=>x[1]);if(/\b(finde|findes|fin de semana|fines de semana)\b/.test(t))dsem=[...new Set(dsem.concat([6,0]))];if(!dsem.length)dsem=null;
  const usadas=new Set();if(turno)turno.split(" ").forEach(w=>usadas.add(w));pers.forEach(n=>sinAcento(n).toLowerCase().split(/\s+/).forEach(w=>usadas.add(w)));if(sitio&&sitio.k==="lugar"&&sn)sn.tk.forEach(w=>usadas.add(w));
  const libres=t.split(" ").filter(w=>w.length>=3&&!INV_NO.has(w)&&!usadas.has(w)&&!/^[fm]\d+$/.test(w)&&!/^20\d\d$/.test(w));
  const int=invIntQ(t);
  return{t,q,per,pers,sitio:int==="naves"&&sitio&&sitio.k==="nave"?null:sitio,cat,dsem,turno,libres,conj:D.conj,int,grupo:invGrupoQ(t),met:invMetQ(t),comp:/(compar|anterior|antes|subido|bajado|aumentado|empeorado|mejorado|que el mes)/.test(t),menos:/\bmenos\b/.test(t)};}

/* trabajos que cumplen lo pedido (sin periodo) */
function invFiltra(L,E,C){const nav=sinAcento(E.sitio&&E.sitio.k==="nave"?E.sitio.v:"").toLowerCase();
  const naveMaq={};(C.EL||[]).forEach(e=>{const m=String(e.codigo||"").match(/F\s?-?(\d+)/i);if(m)naveMaq["F"+(+m[1])]=sinAcento(e.lugar||"").toLowerCase();});
  let X=L.filter(o=>{if(E.pers.length&&!E.pers.includes(o.hecho_por_n)&&!(o.estado!=="hecha"&&(o.nombres||[]).some(n=>E.pers.includes(n))))return false;
    if(E.cat==="*"&&!invCat(o))return false;if(E.cat&&E.cat!=="*"&&invCat(o)!==E.cat)return false;
    if(E.sitio&&(E.sitio.k==="maq"||E.sitio.k==="lugar")&&invSitio(o)!==E.sitio.v)return false;
    if(E.sitio&&E.sitio.k==="nave"){const s=invSitio(o);if(/^horno fusi[oó]n nave/i.test(s))return false;const enDic=INV_DIC.some(d=>d.tipo==="lugar"&&d.valor===s);/* sitio enseñado: cuenta en la nave solo si su nombre la dice («Horno fusión AlSi12 (Nave 1)» sí; «Brother y Moriz» no) */
      const txt=sinAcento((enDic?[s]:[s,o.nave,o.lugar]).filter(Boolean).join(" ")).toLowerCase();if(!txt.includes(nav)&&!(naveMaq[s]||"").startsWith(nav)&&!(/^nave 1 y 2$/i.test(s)&&/^nave [12]$/.test(nav)))return false;}
    if(E.conj&&!invEnConj(o,E.conj))return false;
    if(E.turno&&!sinAcento(invTurno(o,C)).toLowerCase().startsWith(E.turno))return false;
    if(E.dsem&&!E.dsem.includes(new Date(o.fecha+"T12:00:00").getDay()))return false;return true;});
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
    E.conj?"de "+E.conj.n.toLowerCase():null,E.pers.length?"de "+E.pers.join(" y "):null,E.dsem?"los "+E.dsem.map(d=>DIAS_INV[d].toLowerCase()).join(" y "):null,E.libres.length&&!E.ignoradas.length?"«"+E.libres.join(" ")+"»":null].filter(Boolean).join(" ");
  const quien=desc||"trabajos";
  const lista=(a,n)=>a.slice(0,n).join(", ")+(a.length>n?" y "+(a.length-n)+" más":"");
  const vez=n=>n+(n===1?" vez":" veces");
  /* Nave 1 frente a Nave 2 */
  if(E.int==="naves"){const N=["Nave 1","Nave 2"].map(v=>{const E2=Object.assign({},E,{sitio:{k:"nave",v}});const X=invFiltra(C.O,E2,C);const a=X.filter(enP),b=X.filter(enA);
      const h=a.filter(o=>o.estado==="hecha"),pr=a.filter(o=>invCat(o)),S={};pr.forEach(o=>{const k=invSitio(o);S[k]=(S[k]||0)+1;});const top=Object.entries(S).sort((x,y)=>y[1]-x[1])[0];
      return{v,a,n:a.length,min:T(h),h:h.length,np:pr.length,mp:T(pr.filter(o=>o.estado==="hecha")),na:b.length,top};});
    const[a,b]=N;r.cols=["",a.v,b.v];
    r.filas=[["Veces",a.n,b.n],["Tiempo",invH(a.min),invH(b.min)],["Media por vez",a.h?invH(a.min/a.h):"—",b.h?invH(b.min/b.h):"—"],
      ["Problemas (aceite, agua…)",a.np,b.np],["Tiempo en problemas",invH(a.mp),invH(b.mp)],["Sitio con más problemas",a.top?a.top[0]+" ("+a.top[1]+")":"—",b.top?b.top[0]+" ("+b.top[1]+")":"—"],
      ["Veces el periodo anterior",a.na,b.na]];
    const m=a.min>=b.min?a:b,o2=m===a?b:a;
    r.frase=(quien==="trabajos"?"":quien.charAt(0).toUpperCase()+quien.slice(1)+", ")+"Nave 1 frente a Nave 2 "+E.per.t+": la Nave 1 "+vez(a.n)+" y "+invH(a.min)+"; la Nave 2 "+vez(b.n)+" y "+invH(b.min)+"."+
      (a.min!==b.min?" En la "+m.v+" se va "+invH(m.min-o2.min)+" más.":"")+" Problemas: "+a.np+" en la Nave 1 y "+b.np+" en la Nave 2.";
    r.L=a.a.concat(b.a);return r;}
  /* ¿cuánto se ahorraría si se arregla? horas al mes en problemas */
  if(E.int==="ahorro"){const P=todos.filter(enP).filter(o=>invCat(o)&&o.estado==="hecha");const mes=Math.max(1,(invDias(d0,d1)+1)/30.4);
    const G={};P.forEach(o=>{const k=invSitio(o);const g=G[k]=G[k]||{s:k,n:0,min:0,c:{}};g.n++;g.min+=invMin(o);g.c[invCat(o)]=(g.c[invCat(o)]||0)+1;});
    const L2=Object.values(G).sort((x,y)=>y.min-x.min);const tipos=g=>Object.entries(g.c).sort((x,y)=>y[1]-x[1]).map(([k,n])=>invCatN(k).toLowerCase()+" "+n).join(", ");
    r.cols=["Sitio","Problemas","Tiempo "+E.per.t,"Al mes","De qué"];r.filas=L2.map(g=>[g.s,g.n,invH(g.min),invH(g.min/mes),tipos(g)]);
    const tot=P.reduce((x,o)=>x+invMin(o),0);
    r.frase=!P.length?"No ha habido problemas "+(E.sitio?"en la "+E.sitio.v+" ":"")+E.per.t+": no hay nada que ahorrar.":
      E.sitio&&L2.length===1?"Si se arregla la "+E.sitio.v+", se ahorrarían unas "+invH(tot/mes)+" al mes de limpieza: "+E.per.t+" ha tenido "+P.length+" problemas ("+tipos(L2[0])+") que han llevado "+invH(tot)+".":
      "Si se arreglan "+(L2.length===1?"estos problemas":"los problemas de estos "+L2.length+" sitios")+", se ahorrarían unas "+invH(tot/mes)+" al mes ("+invH(tot)+" "+E.per.t+"). Lo que más ahorraría: "+L2[0].s+", "+invH(L2[0].min/mes)+" al mes.";
    r.L=P;return r;}
  /* ¿ha vuelto a pasar desde una fecha? */
  if(E.int==="vuelto"){const conFecha=/desde (?:el )?\d/.test(E.t);const L2=todos.filter(enP),antes=todos.filter(o=>o.fecha<d0).sort((x,y)=>x.fecha.localeCompare(y.fecha));
    const ult=L2.slice().sort((x,y)=>y.fecha.localeCompare(x.fecha))[0];const q2=quien==="trabajos"?"":" ("+quien+")";
    r.frase=!conFecha?"Para saber si ha vuelto a pasar, dime desde cuándo: por ejemplo «¿ha vuelto a perder aceite la F19 desde el 10/11?». "+E.per.t.charAt(0).toUpperCase()+E.per.t.slice(1)+q2+": "+vez(L2.length)+(ult?", la última el "+fDMA(ult.fecha)+".":"."):
      L2.length?"Sí, ha vuelto a pasar"+q2+": "+vez(L2.length)+" "+E.per.t+". La última, el "+fDMA(ult.fecha)+" (hace "+invDias(ult.fecha,hoyISO())+" días).":
      "No ha vuelto a pasar"+q2+" "+E.per.t+"."+(antes.length?" Lo último fue el "+fDMA(antes[antes.length-1].fecha)+".":"");
    r.cols=["",E.per.t,"Antes"];r.filas=[["Veces",L2.length,antes.length],["Tiempo",invH(T(L2.filter(o=>o.estado==="hecha"))),invH(T(antes.filter(o=>o.estado==="hecha")))]];r.L=L2;return r;}
  /* trabajos sin hacer */
  if(E.int==="pend"){const hoy=hoyISO();const P=L.filter(o=>o.estado!=="hecha"&&o.fecha<=hoy&&!o.no_se_hace);const G={};
    P.forEach(o=>{const k=invClave(o)||o.titulo;const g=G[k]=G[k]||{t:o.titulo.replace(/\s*·.*$/,""),n:0,p:0,nh:0,c:0,ult:o.fecha};g.n++;if(o.estado==="no_hecha")g.nh++;else if(o.estado==="en_curso")g.c++;else g.p++;if(o.fecha>g.ult)g.ult=o.fecha;});
    const L2=Object.values(G).sort((x,y)=>y.n-x.n);const c=k=>P.filter(o=>o.estado===k).length;
    r.cols=["Trabajo","Sin hacer","Pendientes","No hechos","Empezados","Último"];r.filas=L2.map(g=>[g.t,g.n,g.p,g.nh,g.c,fCorta(g.ult)]);
    r.frase=P.length?"Sin hacer "+E.per.t+(quien==="trabajos"?"":" ("+quien+")")+": "+P.length+" trabajos ("+c("pendiente")+" pendientes, "+c("no_hecha")+" marcados como no hechos y "+c("en_curso")+" empezados sin terminar). "+
      "El que más se queda sin hacer: «"+L2[0].t+"» ("+vez(L2[0].n)+").":"Nada se ha quedado sin hacer "+E.per.t+".";
    r.L=P;return r;}
  /* qué ha empeorado (o mejorado) respecto al periodo anterior */
  if(E.int==="evo"){const mej=/(mejor|bajado)/.test(E.t);const base=X0=>X0.filter(o=>E.cat?true:invCat(o));const A=base(todos.filter(enP)),B=base(todos.filter(enA));
    const G={};const k=o=>invSitio(o)+"|"+invCat(o);A.forEach(o=>{const g=G[k(o)]=G[k(o)]||{s:invSitio(o),c:invCat(o),n:0,na:0,min:0};g.n++;g.min+=invMin(o);});
    B.forEach(o=>{const g=G[k(o)]=G[k(o)]||{s:invSitio(o),c:invCat(o),n:0,na:0,min:0};g.na++;});
    const L2=Object.values(G).filter(g=>mej?g.n<g.na:g.n>g.na).sort((x,y)=>mej?(x.n-x.na)-(y.n-y.na):(y.n-y.na)-(x.n-x.na)||y.min-x.min);
    r.cols=["Sitio","Problema","Antes","Ahora","Diferencia","Tiempo ahora"];r.filas=L2.map(g=>[g.s,invCatN(g.c),g.na,g.n,(g.n>g.na?"+":"")+(g.n-g.na),invH(g.min)]);
    r.frase=L2.length?"Lo que más ha "+(mej?"mejorado":"empeorado")+" "+E.per.t+" respecto al periodo anterior: "+L2[0].s+" ("+invCatN(L2[0].c).toLowerCase()+"), de "+L2[0].na+" a "+vez(L2[0].n)+". "+
      (L2.length>1?"En total, "+L2.length+" sitios van a "+(mej?"mejor":"peor")+".":"")+" En todos los problemas: "+A.length+" ahora y "+B.length+" antes.":
      "Nada ha "+(mej?"mejorado":"empeorado")+" "+E.per.t+" respecto al periodo anterior ("+A.length+" problemas ahora y "+B.length+" antes).";
    r.L=A.filter(o=>L2.some(g=>g.s===invSitio(o)&&g.c===invCat(o)));return r;}
  /* resumen del periodo para los jefes */
  if(E.int==="res"){const J=invJornadas(C.W,C.R,C.FE,C.SU,d0,d1);const X=invDatos(C.O,J,d0,d1,C.O.filter(enA));const t=X.tot;
    const Pa=C.O.filter(enA).filter(o=>invCat(o));const sh=X.L.filter(o=>o.estado!=="hecha"&&o.fecha<=hoyISO()&&!o.no_se_hace).length;const repMin=X.rep.reduce((x,g)=>x+g.min,0);
    const topRep=X.rep.slice().sort((x,y)=>y.min-x.min)[0];
    r.cols=["",E.per.t,"Periodo anterior"];
    r.filas=[["Trabajos hechos",t.nt,C.O.filter(enA).filter(o=>o.estado==="hecha").length],["Tiempo en trabajos",invH(t.min),"—"],["Problemas (avisos)",t.np,Pa.length],
      ["Tiempo en problemas",invH(t.prob),invH(T(Pa.filter(o=>o.estado==="hecha")))],["Problemas que se repiten (sitios)",X.rep.length,"—"],["Tiempo en problemas repetidos",invH(repMin),"—"],
      ["Saturación del equipo",t.jor?invPct(t.cont,t.jor)+" %":"—","—"],["Saturación de quien apunta",t.jorAp?invPct(t.contAp,t.jorAp)+" %":"—","—"],["Sin hacer",sh,"—"]];
    r.frase="Resumen "+E.per.t+": se han hecho "+t.nt+" trabajos ("+invH(t.min)+"). Ha habido "+t.np+" problemas (aceite, agua, taladrina…), "+(t.np>Pa.length?Math.abs(t.np-Pa.length)+" más":t.np<Pa.length?Math.abs(t.np-Pa.length)+" menos":"los mismos")+" que el periodo anterior, con "+invH(t.prob)+" de limpieza. "+
      (topRep?"En problemas que se repiten sin arreglarse se han ido "+invH(repMin)+"; donde más, "+topRep.sitio+" ("+invCatN(topRep.cat).toLowerCase()+", "+vez(topRep.n)+", "+invH(topRep.min)+"). ":"No se ha repetido ningún problema en el mismo sitio. ")+
      (t.jor?"Saturación del equipo: "+invPct(t.cont,t.jor)+" %"+(t.sinNada.length?" ("+invPct(t.contAp,t.jorAp)+" % de quien apunta sus trabajos; "+lista(t.sinNada.map(p=>p.n),3)+" no tienen nada apuntado)":"")+". ":"")+
      (sh?sh+" trabajos se han quedado sin hacer.":"No se ha quedado nada sin hacer.");
    r.L=[];return r;}
  if(E.int==="sat"){const J=invJornadas(C.W,C.R,C.FE,C.SU,d0,d1);const X=invDatos(C.O,J,d0,d1,[]);let P=X.sat;if(E.pers.length)P=P.filter(p=>E.pers.includes(p.n));
    r.cols=["Persona","Jornada","Trabajos","Despl. y prep.","Sin justificar","Saturación"];r.filas=P.map(p=>[p.n,invH(p.jor),invH(p.min),invH(p.desp),invH(p.sin),p.jor?invPct(p.cont,p.jor)+" %":"—"]);
    const jo=P.reduce((s,p)=>s+p.jor,0),co=P.reduce((s,p)=>s+p.cont,0);
    r.frase=(P.length===1?"Saturación de "+P[0].n:"Saturación"+(E.pers.length?"":" del equipo"))+" "+E.per.t+": "+(jo?invPct(co,jo)+" %":"sin horas de jornada")+" ("+invH(co)+" de "+invH(jo)+" de jornada).";
    /* «¿quién tiene menos (o más) carga?»: ordenados por saturación, y aviso si el de menos no tiene nada apuntado */
    const Q=P.filter(p=>p.jor>0);if(Q.length>1&&(E.menos||/\b(mas|mayor)\b/.test(E.t))){const sat=p=>p.cont/p.jor;Q.sort((a,b)=>E.menos?sat(a)-sat(b):sat(b)-sat(a));
      r.filas=Q.concat(P.filter(p=>!p.jor)).map(p=>[p.n,invH(p.jor),invH(p.min),invH(p.desp),invH(p.sin),p.jor?invPct(p.cont,p.jor)+" %":"—"]);const a=Q[0],b=Q[Q.length-1];
      r.frase="Quien "+(E.menos?"menos":"más")+" carga de trabajo tiene "+E.per.t+": "+a.n+", "+invPct(a.cont,a.jor)+" % ("+invH(a.cont)+" de "+invH(a.jor)+" de jornada). "+
        (E.menos?"Quien más: ":"Quien menos: ")+b.n+", "+invPct(b.cont,b.jor)+" %. Equipo: "+invPct(co,jo)+" %."+
        (E.menos&&!a.min?" Ojo: "+a.n+" no tiene ningún trabajo apuntado; puede que trabaje sin apuntarlo (sin código para entrar o apuntado a nombre de otro), así que no quiere decir que no haga nada.":"");}
    r.L=P.length===1?X.H.filter(o=>o.hecho_por_n===P[0].n):[];return r;}
  if(E.int==="rep"){const X=invDatos(C.O.filter(o=>todos.includes(o)||!invCat(o)),{},d0,d1,C.O.filter(enA));let G=X.rep;
    r.cols=["Sitio","Problema","Veces","Tiempo","Cada (días)","Última","Sigue"];r.filas=G.map(g=>[g.sitio,invCatN(g.cat),g.n,invH(g.min),g.cada!=null?String(Math.round(g.cada*10)/10).replace(".",","):"—",fCorta(g.ult),g.sigue?"Sí":"No"]);
    /* tiempo perdido: primero donde más horas se van en el mismo problema repetido */
    const perd=/(pierd|perd|solucion|arregl)/.test(E.t);if(perd){G=G.slice().sort((a,b)=>b.min-a.min||b.n-a.n);r.filas=G.map(g=>[g.sitio,invCatN(g.cat),g.n,invH(g.min),g.cada!=null?String(Math.round(g.cada*10)/10).replace(".",","):"—",fCorta(g.ult),g.sigue?"Sí":"No"]);}
    const tot=G.reduce((s,g)=>s+g.min,0),veces=G.reduce((s,g)=>s+g.n,0);
    r.frase=!G.length?"Nada se ha repetido en el mismo sitio "+E.per.t+".":perd?
      "Donde más tiempo se pierde repitiendo el mismo trabajo "+E.per.t+": "+G[0].sitio+" ("+invCatN(G[0].cat).toLowerCase()+"), "+G[0].n+" veces y "+invH(G[0].min)+
      ". En total se han ido "+invH(tot)+" en "+veces+" trabajos por "+G.length+(G.length===1?" problema que se repite":" problemas que se repiten")+" sin arreglarse. "+invFrase(G[0]):
      G.length+(G.length===1?" sitio donde se repite":" sitios donde se repite")+" "+E.per.t+". "+invFrase(G[0]);
    r.L=G.length?G[0].L:[];r.rep=G;return r;}
  if(E.int==="cal"){const G={};H.forEach(o=>{const n=o.hecho_por_n||"Sin indicar";const g=G[n]=G[n]||{n,t:0,r:0};g.t++;if(invReal(o))g.r++;});
    const P=Object.values(G).sort((a,b)=>(a.r/a.t)-(b.r/b.t));r.cols=["Persona","Trabajos","Con «Empezar»","Sin empezar","% real"];r.filas=P.map(g=>[g.n,g.t,g.r,g.t-g.r,invPct(g.r,g.t)+" %"]);
    r.frase=P.length?"Quien menos pulsa «Empezar» "+E.per.t+": "+P[0].n+" ("+invPct(P[0].t-P[0].r,P[0].t)+" % de sus trabajos sin tiempo real).":"Ningún trabajo hecho "+E.per.t+".";r.L=H.filter(o=>!invReal(o));return r;}
  /* general: contar, tiempo, media, agrupado */
  const met=E.met,lab={n:"Veces",min:"Tiempo",avg:"Media"};
  const val=(a)=>({n:a.length,min:T(a.filter(o=>o.estado==="hecha")),h:a.filter(o=>o.estado==="hecha").length});
  const fmt=v=>met==="n"?[v.n]:met==="min"?[invH(v.min)]:met==="avg"?[v.h?invH(v.min/v.h):"—"]:[v.n,invH(v.min),v.h?invH(v.min/v.h):"—"];
  const head=met==="n"?["Veces"]:met==="min"?["Tiempo"]:met==="avg"?["Media"]:["Veces","Tiempo","Media"];
  const key=met==="avg"?(v=>v.h?v.min/v.h:-1):met==="n"?(v=>v.n):(v=>v.min||v.n/1000);
  let g=E.grupo;const tot=val(L),ant=val(La);
  /* «¿cuánto tardamos de media en limpiar el horno?»: si casan varios trabajos distintos, la media de cada uno */
  if(!g&&met==="avg"&&(E.conj||E.libres.length>E.ignoradas.length)&&new Set(L.map(invClave)).size>1)g="trab";
  const cmp=(a,b)=>b>a?"más":b<a?"menos":"igual";
  if(g){const by=o=>g==="per"?(o.hecho_por_n||"Sin hacer"):g==="sit"?invSitio(o):g==="dsem"?DIAS_INV[new Date(o.fecha+"T12:00:00").getDay()]:g==="sem"?"Semana del "+fDM(lunesDe(o.fecha)):g==="mes"?INV_MESES[+o.fecha.slice(5,7)-1]+" "+o.fecha.slice(0,4):g==="tipo"?(invCat(o)?invCatN(invCat(o)):"Trabajo normal"):g==="hora"?invFranja(invHora(o)):g==="semmes"?invSemMes(o.fecha):g==="turno"?invTurno(o,C):(invClave(o)||"(sin título)");
    const M={};L.forEach(o=>{const k=by(o);(M[k]=M[k]||[]).push(o);});const Ma={};La.forEach(o=>{const k=by(o);(Ma[k]=Ma[k]||[]).push(o);});
    let ks=Object.keys(M);if(g==="sem"||g==="mes")ks.sort((a,b)=>M[a][0].fecha.localeCompare(M[b][0].fecha));else if(g==="hora"||g==="semmes")ks.sort((a,b)=>a==="Sin hora"?1:b==="Sin hora"?-1:a.localeCompare(b));else if(g==="dsem")ks.sort((a,b)=>((DIAS_INV.indexOf(a)+6)%7)-((DIAS_INV.indexOf(b)+6)%7));
    else ks.sort((a,b)=>E.menos?key(val(M[a]))-key(val(M[b])):key(val(M[b]))-key(val(M[a])));
    const nom=k=>g==="trab"?M[k][0].titulo.replace(/\s*·.*$/,""):k;
    r.cols=[{per:"Persona",sit:"Sitio",dsem:"Día",sem:"Semana",mes:"Mes",trab:"Trabajo",tipo:"Tipo",hora:"Hora",semmes:"Semana del mes",turno:"Turno"}[g]].concat(head).concat(E.comp?["Antes"]:[]);
    r.filas=ks.map(k=>[nom(k)].concat(fmt(val(M[k]))).concat(E.comp?[(Ma[k]||[]).length]:[]));
    const ord=["sem","mes","dsem","hora","semmes"].includes(g);const top=ks.filter(k=>!ord&&k!=="Sin hora")[0]||ks.filter(k=>k!=="Sin hora").sort((a,b)=>E.menos?key(val(M[a]))-key(val(M[b])):key(val(M[b]))-key(val(M[a])))[0]||ks[0];
    r.frase=ks.length?quien.charAt(0).toUpperCase()+quien.slice(1)+" "+E.per.t+" ("+tot.n+" en total, "+invH(tot.min)+"). "+(E.menos?"El que menos":"El que más")+": "+nom(top)+" ("+fmt(val(M[top])).join(" · ")+")."+
      (E.comp?" Periodo anterior: "+ant.n+" ("+cmp(ant.n,tot.n)+" ahora).":"")+(g==="hora"&&M["Sin hora"]?" ("+M["Sin hora"].length+" sin hora: trabajos fijos que no se avisan ni se empezaron con «Empezar».)":""):"No hay "+quien+" "+E.per.t+".";
    r.top=k=>M[k];return r;}
  r.cols=["",E.per.t].concat(["Periodo anterior"]);
  r.filas=[["Veces",tot.n,ant.n],["Tiempo",invH(tot.min),invH(ant.min)],["Media por vez",tot.h?invH(tot.min/tot.h):"—",ant.h?invH(ant.min/ant.h):"—"]];
  r.frase=tot.n?quien.charAt(0).toUpperCase()+quien.slice(1)+" "+E.per.t+": "+(met==="avg"?"de media "+(tot.h?invH(tot.min/tot.h):"—")+" cada vez ("+tot.n+" veces)":met==="min"?invH(tot.min)+" en "+tot.n+" veces":tot.n+(tot.n===1?" vez":" veces")+", "+invH(tot.min))+"."+
    " En el periodo anterior: "+ant.n+(ant.n===1?" vez":" veces")+(ant.n!==tot.n?" ("+(tot.n>ant.n?"ha subido":"ha bajado")+")":"")+".":"No hay "+quien+" "+E.per.t+"."+(ant.n?" En el periodo anterior hubo "+ant.n+".":"");
  return r;}

/* la tarjeta del buscador */
const INV_EJ=["¿Cuántas veces ha perdido aceite la F19 este año?","¿Qué máquinas pierden más aceite en los últimos 3 meses?","¿Quién tarda más en los derrames de taladrina?",
  "¿Dónde se pierde más tiempo?","Resumen del mes pasado","Compara la Nave 1 con la Nave 2","¿Qué ha empeorado este mes?","¿Cuánto ahorraríamos si arreglan la F19?",
  "¿A qué hora hay más derrames?","¿Qué se ha quedado sin hacer esta semana?","Saturación de cada uno el mes pasado","¿Qué días hay más derrames?","Tiempo perdido en problemas por semana","¿Dónde se repiten las fugas de agua?","¿Quién no pulsa Empezar?",
  "Derrames de aceite en la Nave 2 comparado con el mes anterior","¿En qué se va el tiempo los sábados?"];
function invPreguntaCard(F){const res=el("div",{id:"invResp"});const qi=el("input",{type:"search",id:"invQ",placeholder:"Escribe tu pregunta…",value:S.invQ||"",style:"flex:1;min-width:0",
    onkeydown:e=>{if(e.key==="Enter"){e.preventDefault();ir();}}});
  const ir=async()=>{const q=qi.value.trim();if(!q){qi.focus();return;}S.invQ=q;res.textContent="";res.appendChild(el("p",{class:"hint",text:"Buscando…"}));
    try{const per=invPerDef(sinAcento(q).toLowerCase(),F);const C=await invCarga(per.d0,per.d1);const E=invEntiende(q,C,F);invPinta(res,E,invContesta(E,C));}
    catch(e){res.textContent="";res.appendChild(el("p",{class:"hint",text:e.message||"No he podido contestar"}));}};
  const ej=el("details",{style:"margin-top:6px"},[el("summary",{class:"hint",style:"cursor:pointer",text:"Ejemplos de preguntas"}),el("div",{class:"chips",style:"margin-top:6px"},INV_EJ.map(x=>el("button",{type:"button",class:"chip",text:x,onclick:()=>{qi.value=x;ir();}})))]);
  if(S.invQ)setTimeout(ir,0);
  const fav=el("div",{class:"chips",style:"margin-top:8px"});const pf=()=>{fav.textContent="";INV_DIC.filter(d=>d.tipo==="favorita").forEach(d=>fav.appendChild(el("button",{type:"button",class:"chip",text:"☆ "+d.palabra,onclick:()=>{qi.value=d.palabra;ir();}})));};pf();
  invDicCarga().then(pf);
  return el("div",{class:"card",id:"invPreg"},[el("div",{class:"hd"},[el("h2",{text:"Pregúntale"}),el("button",{class:"btn sec peq der",type:"button",text:"Enséñale",onclick:()=>invDiccionario(()=>pinta())})]),el("div",{class:"bd"},[
    el("div",{class:"row",style:"gap:8px;align-items:center;flex-wrap:nowrap"},[qi,el("button",{class:"btn",type:"button",text:"Preguntar",onclick:ir})]),fav,ej,res])]);}
function invPinta(res,E,r){res.textContent="";
  const ent=[["Periodo",E.per.t],E.pers.length?["Persona",E.pers.join(", ")]:null,E.sitio?["Dónde",E.sitio.v]:null,E.conj?["Grupo",E.conj.n+" ("+E.conj.w.join(", ")+")"]:null,E.cat?["Problema",E.cat==="*"?"todos los problemas":invCatN(E.cat)]:null,
    E.dsem?["Día",E.dsem.map(d=>DIAS_INV[d]).join(" y ")]:null,E.turno?["Turno",E.turno]:null,
    {naves:["Compara","Nave 1 y Nave 2"],ahorro:["Quiero saber","cuánto se ahorraría"],vuelto:["Quiero saber","si ha vuelto a pasar"],pend:["Quiero saber","lo que se ha quedado sin hacer"],
      evo:["Quiero saber",/(mejor|bajado)/.test(E.t)?"qué ha mejorado":"qué ha empeorado"],res:["Quiero","un resumen"],rep:["Quiero saber","dónde se repite"],sat:["Quiero saber","la carga de trabajo"]}[E.int]||null,E.libres.length&&E.ignoradas.length<E.libres.length?["Trabajo",E.libres.filter(w=>!E.ignoradas.includes(w)).join(" ")]:null].filter(Boolean);
  res.appendChild(el("div",{class:"meta",style:"margin:10px 0 6px"},[el("small",{class:"hint",style:"margin:0",text:"He entendido:"})].concat(ent.map(([a,b])=>el("span",{class:"pill info",text:a+": "+b})))));
  if(E.ignoradas.length)res.appendChild(el("div",{class:"row",style:"margin:0 0 6px;align-items:center;gap:8px"},[el("p",{class:"hint",style:"margin:0;flex:1;min-width:0",text:"No encuentro trabajos con «"+E.ignoradas.join(" ")+"»: no lo he tenido en cuenta."}),
    el("button",{class:"btn sec peq",type:"button",text:"Enseñar «"+E.ignoradas[0]+"»",onclick:()=>invEnsena(E.ignoradas[0],"frase",()=>{const b=document.querySelector("#invPreg .btn:not(.sec)");if(b)b.click();})})]));
  res.appendChild(el("p",{style:"font-weight:600;margin:6px 0 10px",text:r.frase}));
  if(r.cols&&r.filas.length)res.appendChild(el("div",{style:"overflow:auto"},el("table",{class:"g-tab"},[el("thead",null,el("tr",null,r.cols.map(h=>el("th",{text:h})))),
    el("tbody",null,r.filas.slice(0,40).map(f=>el("tr",null,f.map(x=>el("td",{text:String(x)})))))])));
  const L=(r.L||[]).slice().sort((a,b)=>(b.fecha+(b.creado||"")).localeCompare(a.fecha+(a.creado||"")));
  if(L.length)res.appendChild(el("details",{style:"margin-top:10px"},[el("summary",{class:"hint",style:"cursor:pointer;font-weight:600",text:"Ver los "+L.length+" trabajos"}),
    el("div",{style:"overflow:auto"},el("table",{class:"g-tab"},[el("thead",null,el("tr",null,["Día","Trabajo","Dónde","Quién","Tiempo"].map(h=>el("th",{text:h})))),
      el("tbody",null,L.slice(0,200).map(o=>el("tr",null,[el("td",{text:fCorta(o.fecha)}),el("td",{text:o.titulo}),el("td",{text:invSitio(o)}),el("td",{text:o.hecho_por_n||(o.nombres||[]).join(", ")||"—"}),
        el("td",{text:o.estado==="hecha"?invH(invMin(o))+(invReal(o)?"":" (est.)"):(EST[o.estado]||[o.estado])[0]})])))]))]));
  invServido(E,r,res);
  res.appendChild(el("div",{class:"row",style:"margin-top:10px"},[el("button",{class:"btn sec peq",type:"button",text:"Excel de esta respuesta",onclick:async e=>{e.target.disabled=true;
    try{await libXLSX();const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["Pregunta",E.q],["Periodo",E.per.t+" ("+E.per.d0+" a "+E.per.d1+")"],["Respuesta",r.frase]].concat(r.cols?[[],r.cols].concat(r.filas):[])),"Respuesta");
      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(L.length?L.map(o=>({"Fecha":o.fecha,"Hora":o.creado?hora(o.creado):"","Trabajo":o.titulo,"Descripción":o.descripcion||"","Dónde":invSitio(o),"Problema":invCat(o)?invCatN(invCat(o)):"","Quién":o.hecho_por_n||"","Estado":o.estado,"Minutos":o.estado==="hecha"?Math.round(invMin(o)):null,"Tiempo real":invReal(o)?"Sí":"Estimado"})):[{"":"Ningún trabajo"}]),"Trabajos");
      bajar(new Blob([XLSX.write(wb,{type:"array",bookType:"xlsx"})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),"pregunta-limpieza.xlsx");}catch(er){toast(er.message);}e.target.disabled=false;}})]));}

/* ===== aprender: ¿te ha servido?, favoritas y diccionario ===== */
async function invGuardaPreg(p){try{return await rpc("inv_preg_guardar",{p_tok:S.tok,p});}catch(e){return null;}}
function invServido(E,r,box){let id=null;invGuardaPreg({q:E.q,entendido:{periodo:E.per,personas:E.pers,sitio:E.sitio,problema:E.cat,dia:E.dsem,palabras:E.libres,ignoradas:E.ignoradas,que:E.int,grupo:E.grupo},respuesta:r.frase,ok:null}).then(x=>{id=x;});
  const fila=el("div",{class:"row",style:"margin-top:10px;align-items:center;gap:8px"},[el("small",{class:"hint",style:"margin:0",text:"¿Te ha servido?"}),
    el("button",{class:"btn sec peq",type:"button",text:"Sí",onclick:async()=>{if(id)invGuardaPreg({id,ok:true});fila.textContent="";
      const ya=INV_DIC.some(d=>d.tipo==="favorita"&&d.palabra===E.q.toLowerCase().trim());
      fila.appendChild(el("small",{class:"hint",style:"margin:0",text:"Gracias, apuntado."}));
      if(!ya)fila.appendChild(el("button",{class:"btn sec peq",type:"button",text:"☆ Guardar como favorita",onclick:async e=>{e.target.disabled=true;try{await rpc("inv_dic_guardar",{p_tok:S.tok,p:{tipo:"favorita",palabra:E.q}});await invDicCarga();toast("Guardada en tus preguntas");pinta();}catch(er){toast(er.message);e.target.disabled=false;}}}));}}),
    el("button",{class:"btn sec peq",type:"button",text:"No es lo que quería",onclick:()=>{let txt="";
      dlg("¿Qué querías saber?",el("div",null,[el("p",{class:"hint",text:"Escríbelo con tus palabras. Lo reviso y le enseño a la app a entenderlo. Si es una palabra que no conoce (un mote, cómo llamáis a una máquina…), enséñasela ya en «Enséñale»."}),area("",x=>txt=x)]),
        [{t:"Cancelar",cls:"sec"},{t:"Enviar",fn:async()=>{if(id)await invGuardaPreg({id,ok:false,queria:txt});else await invGuardaPreg({q:E.q,respuesta:r.frase,ok:false,queria:txt});toast("Apuntado: lo revisaremos");fila.textContent="";fila.appendChild(el("small",{class:"hint",style:"margin:0",text:"Apuntado para revisarlo."}));}}]);}})]);
  box.appendChild(fila);}
const INV_TIPOS=[["persona","Una persona","Cuando escriba…","Es…"],["lugar","Un lugar como se apunta","Lugar apuntado en los avisos","Se llama…"],["problema","Un tipo de problema","Cuando escriba…","Es un problema de…"],["frase","Otras palabras","Cuando escriba…","Quiero decir…"],["grupo","Un grupo de trabajos","Nombre del grupo (cuando escriba…)","Trabajos con alguna de estas palabras (separadas por comas)"]];
function invEnsena(pal,tipo,re){const W=(TRAB||[]).filter(w=>w.activo!==false).map(w=>w.nombre).sort((a,b)=>a.localeCompare(b,"es"));const s={tipo:tipo||"frase",palabra:pal||"",valor:""};const box=el("div");
  const pinta2=()=>{box.textContent="";const T=INV_TIPOS.find(x=>x[0]===s.tipo);
    box.appendChild(fld("¿Qué le enseñas?",sel(INV_TIPOS.map(x=>[x[0],x[1]]),s.tipo,v=>{s.tipo=v;s.valor="";pinta2();})));
    box.appendChild(fld(T[2],inp(s.palabra,v=>s.palabra=v,{autocomplete:"off"})));
    box.appendChild(fld(T[3],s.tipo==="persona"?sel([["","Elige"]].concat(W.map(n=>[n,n])),s.valor,v=>s.valor=v):s.tipo==="problema"?sel([["","Elige"]].concat(INV_CAT.filter(x=>x[0]!=="otro").map(x=>[x[0],x[1]])),s.valor,v=>s.valor=v):inp(s.valor,v=>s.valor=v,{autocomplete:"off"})));
    box.appendChild(el("p",{class:"hint",text:s.tipo==="lugar"?"Escribe el lugar tal como aparece en los avisos y cómo quieres que salga (por ejemplo «punto de consumo junto a m3» → «Punto de consumo M3»).":s.tipo==="grupo"?"Por ejemplo «hornos» → «horno, escoria, bolon, desgasificadora». Basta con el principio de la palabra: «bolon» vale para bolones. Las de 4 letras o menos valen enteras o en plural: «saca» sirve para sacas, pero no para sacar.":s.tipo==="frase"?"Sirve para motes y formas de hablar: por ejemplo «finde» → «sábados y domingos».":"Desde ahora lo entenderá siempre."}));};
  pinta2();dlg("Enséñale",box,[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{try{await rpc("inv_dic_guardar",{p_tok:S.tok,p:s});await invDicCarga();toast("Aprendido");if(re)re();}catch(e){toast(e.message==="FALTA_VALOR"?"Falta lo que quiere decir":e.message);return false;}}}]);}
async function invDiccionario(re){await invDicCarga();let P=[];try{P=(await rpc("inv_preg_listar",{p_tok:S.tok,p_solo_mal:true}))||[];}catch(e){}
  const nom={persona:"Personas",lugar:"Lugares",problema:"Problemas",frase:"Otras palabras",grupo:"Grupos de trabajos",favorita:"Preguntas favoritas"};
  const lista=el("div",null,Object.keys(nom).map(k=>{const L=INV_DIC.filter(d=>d.tipo===k);if(!L.length)return null;
    return el("div",{style:"margin:0 0 10px"},[el("b",{text:nom[k]}),...L.map(d=>el("div",{class:"linea",style:"display:flex;gap:8px;align-items:center;border-top:1px solid var(--line);padding:6px 0"},[
      el("span",{style:"flex:1;min-width:0",text:k==="favorita"?"«"+d.palabra+"»":"«"+d.palabra+"» → "+(k==="problema"?invCatN(d.valor):d.valor)}),
      el("button",{class:"btn sec peq",type:"button",text:"Borrar",onclick:async e=>{e.target.disabled=true;try{await rpc("inv_dic_borrar",{p_tok:S.tok,p_id:d.id});await invDicCarga();e.target.closest(".linea").remove();if(re)re();}catch(er){toast(er.message);e.target.disabled=false;}}})]))]);}).filter(Boolean));
  dlg("Lo que sabe la app",el("div",null,[INV_DIC.length?lista:el("p",{class:"hint",text:"Todavía no le has enseñado nada."}),
    P.length?el("details",null,[el("summary",{class:"hint",style:"cursor:pointer;font-weight:600",text:"Preguntas que no ha entendido ("+P.length+")"}),...P.slice(0,40).map(p=>el("div",{class:"linea",style:"border-top:1px solid var(--line);padding:6px 0"},[el("b",{text:p.q}),p.queria?el("div",{class:"hint",style:"margin:2px 0 0",text:"Querías: "+p.queria}):null]))]):null,
    el("p",{class:"hint",text:"Para que aprenda las que no ha entendido, dile a Claude: «revisa las preguntas que no ha entendido la app»."})]),
    [{t:"Cerrar",cls:"sec"},{t:"＋ Enseñarle algo",fn:()=>{setTimeout(()=>invEnsena("","frase",re),0);}}]);}
