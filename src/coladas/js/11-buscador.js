/* ---------- Buscador de Consultas: preguntas con las palabras de siempre ----------
   «cuánto se ha consumido este mes en nave 1», «coladas en externo», «stock de AlSi12»,
   «entradas de Befesa en octubre», «último camión de Idalsa», «consumo por relevo», «precio de Befesa».
   Responde con el total, un reparto que se puede tocar para afinar y la lista. Todo con los datos que ya hay en el móvil. */
const bq={q:"",ef:[],g:null};
const nqC=t=>String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9ñ\s.-]/g," ").replace(/\s+/g," ").trim();
const raizC=w=>w.length>4&&/es$/.test(w)&&!/(ces|ses)$/.test(w)?w.slice(0,-2):w.length>3&&/s$/.test(w)?w.slice(0,-1):w;
const reC=a=>new RegExp("(^|[\\s/,.(])"+a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+(/\d$/.test(a)?"(?![0-9])":""));
const STOP_C=new Set("han ha hemos he sido llevamos lleva llevan que qu cual cuales cuantos cuantas cuanto hay tenemos tiene tienen de del la el los las lo con en y a al por para son es esta estan dame dime ver lista todos todas todo un una unos unas se sus su me fabrica kg kilos fardos fardo aluminio coladas colada lotes lote stock queda quedan total mas menos vez fue ultimo ultima primer primera cuando quien".split(" "));
const MES_C=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const TIPO_C={C:"Consumo",E:"Entrada",A:"Ajuste",G:"Granalla de cobre",T:"Traslado"};
/* lo que tiene que venir: «mañana», «esta semana», «este mes»… contando desde hoy */
function periodoFut(q){const h=hoy(),y=+h.slice(0,4),mo=+h.slice(5,7),mas=n=>{const d=new Date();d.setDate(d.getDate()+n);return ymd(d);},fin=(a,b)=>a+"-"+String(b).padStart(2,"0")+"-"+String(new Date(a,b,0).getDate()).padStart(2,"0");
  if(/\bpasado manana\b/.test(q))return{d:mas(2),h:mas(2),t:"pasado mañana"};
  if(/\bmanana\b/.test(q))return{d:mas(1),h:mas(1),t:"mañana"};
  if(/\bhoy\b/.test(q))return{d:h,h,t:"hoy"};
  if(/\b(la )?(proxima|siguiente) semana\b|\bsemana que viene\b/.test(q)){const a=7-((new Date().getDay()+6)%7);return{d:mas(a),h:mas(a+6),t:"la semana que viene"};}
  if(/\besta semana\b/.test(q))return{d:h,h:mas(6-((new Date().getDay()+6)%7)),t:"esta semana"};
  if(/\b(el )?(proximo|siguiente) mes\b|\bmes que viene\b/.test(q)){const a=mo===12?y+1:y,b=mo===12?1:mo+1;return{d:a+"-"+String(b).padStart(2,"0")+"-01",h:fin(a,b),t:"el mes que viene"};}
  const mi=MES_C.findIndex(x=>new RegExp("\\b"+x+"\\b").test(q));
  if(mi>=0){const a=mi+1<mo?y+1:y,d0=a+"-"+String(mi+1).padStart(2,"0")+"-01";return{d:d0<h?h:d0,h:fin(a,mi+1),t:"en "+MES_C[mi]};}
  if(/\beste mes\b/.test(q))return{d:h,h:fin(y,mo),t:"lo que queda de mes"};
  return{d:h,h:"9999-12-31",t:"de aquí en adelante",todo:true};}
const RE_FUT=/\b(tiene|tienen|tenemos) que (entrar|llegar|venir|traer)|\bvan? a (entrar|llegar|venir)|\bprevist\w*|\bplanificad\w*|\bpendientes? de (entrar|llegar)|\bfalta(n)? por (entrar|llegar|venir)|\bquedan? por (entrar|llegar|venir)|\b(entrara|entraran|llegara|llegaran|vendra|vendran)\b|\bpasado manana\b|\bsemana que viene\b|\bmes que viene\b|\bproxim[oa]s? (camion|camiones|entradas?)\b/;
function periodoC(q){const h=hoy(),y=+h.slice(0,4),mo=+h.slice(5,7),ini=(a,b)=>a+"-"+String(b).padStart(2,"0")+"-01",fin=(a,b)=>a+"-"+String(b).padStart(2,"0")+"-"+String(new Date(a,b,0).getDate()).padStart(2,"0");
  const menos=n=>{const d=new Date();d.setDate(d.getDate()-n);return ymd(d);};let m;
  if(/\bhoy\b/.test(q))return{d:h,h,t:"hoy",re:/\bhoy\b/};
  if(/\bayer\b/.test(q))return{d:menos(1),h:menos(1),t:"ayer",re:/\bayer\b/};
  if(/\besta semana\b/.test(q))return{d:menos((new Date().getDay()+6)%7),h,t:"esta semana",re:/\besta semana\b/};
  if(/\beste mes\b/.test(q))return{d:ini(y,mo),h,t:"este mes",re:/\beste mes\b/};
  if(/\b(el )?(mes pasado|ultimo mes|mes anterior)\b/.test(q)){const a=mo===1?y-1:y,b=mo===1?12:mo-1;return{d:ini(a,b),h:fin(a,b),t:Mayus(MES_C[b-1])+" "+a,re:/\b(el )?(mes pasado|ultimo mes|mes anterior)\b/};}
  if(/\b(el )?ano pasado\b/.test(q))return{d:(y-1)+"-01-01",h:(y-1)+"-12-31",t:"el año "+(y-1),re:/\b(el )?ano pasado\b/};
  if(/\b(este|el) ano\b|\ben lo que va de ano\b/.test(q))return{d:y+"-01-01",h,t:"este año",re:/\b(en lo que va de|este|el) ano\b/};
  if((m=q.match(/\bultim[oa]s? (\d+) (dias?|semanas?|meses|mes)\b/))){const n=+m[1],u=m[2][0];return{d:menos(u==="d"?n:u==="s"?n*7:n*30),h,t:"últimos "+n+" "+(u==="d"?"días":u==="s"?"semanas":"meses"),re:/\bultim[oa]s? \d+ (dias?|semanas?|meses|mes)\b/};}
  const mi=MES_C.findIndex(x=>new RegExp("\\b"+x+"\\b").test(q));
  if(mi>=0){const ya=q.match(/\b(20\d\d)\b/);const a=ya?+ya[1]:(mi+1>mo?y-1:y);return{d:ini(a,mi+1),h:fin(a,mi+1),t:Mayus(MES_C[mi])+" "+a,re:new RegExp("\\b(en |de )?"+MES_C[mi]+"( de)?( 20\\d\\d)?\\b")};}
  if((m=q.match(/\b(20\d\d)\b/)))return{d:m[1]+"-01-01",h:m[1]+"-12-31",t:"el año "+m[1],re:/\b(en |el )?20\d\d\b/};
  return null;}
/* los datos: coladas (lo que hay) y apuntes (lo que ha pasado) */
function filasColadas(S){return lotes.map(l=>{const b=S[l.id]||{kg:0,fa:0};return{id:l.id,l,colada:l.nombre,aleacion:MAT[l.material]?MAT[l.material].nom:l.material,nave:l.nave,donde:l.donde==="externo"?"Almacén externo":"En nave",
  prov:l.proveedor||"Sin proveedor",alb:l.albaran||"",entrada:l.entrada||"",mesE:l.entrada?Mayus(nomMes(l.entrada.slice(0,7))):"",kg:Math.round(b.kg),fa:b.fa,estado:b.fa>0||b.kg>0?"Con stock":"Gastada"};});}
function filasApuntes(S){return movs().filter(r=>r.f).map(r=>{const l=lotes.find(x=>x.id===(r.o||r.d));const kg=Math.abs(kgAp(r,S)),fa=Math.abs(typeof r.fa==="number"?r.fa:0);
  const t=r.t==="G"&&r.aj?"Ajuste granalla":TIPO_C[r.t]||r.t;
  return{r,l,f:r.f,tipo:t,colada:l?l.nombre:(r.t==="G"?"Granalla de cobre":""),aleacion:l&&MAT[l.material]?MAT[l.material].nom:(r.ml&&MAT[r.ml]?MAT[r.ml].nom:r.t==="G"?"Cobre":""),nave:l?l.nave:(r.nv||""),
    prov:(l&&l.proveedor)||r.p||"",alb:r.a||(l&&l.albaran)||"",relevo:r.u||"",kg,fa,nota:r.n||"",mes:Mayus(nomMes(r.f.slice(0,7))),dia:dmyA(r.f),hist:!!r.h};});}
const COLS_L=[["Colada","colada"],["Aleación","aleacion"],["Nave","nave"],["Dónde","donde"],["Proveedor","prov"],["Albarán","alb"],["Entrada","entrada"],["Kg","kg"],["Fardos","fa"],["Estado","estado"]];
const COLS_M=[["Fecha","dia"],["Tipo","tipo"],["Colada","colada"],["Aleación","aleacion"],["Nave","nave"],["Relevo","relevo"],["Proveedor","prov"],["Albarán","alb"],["Kg","kg"],["Fardos","fa"],["Nota","nota"]];
const txtFila=(x,cols)=>" "+nqC(cols.map(c=>x[c[1]]).join(" "))+" ";
function entenderC(q0){const q=nqC(q0),out={q,filtros:[],ignoradas:[]};let rest=" "+q+" ";
  const I2=intencionC2(q);if(I2)return I2;
  const I=intencionC(q);if(I)return I;
  /* «para cuántos días tengo aluminio en nave 1»: lo que hay entre lo que se gasta */
  if(/\b(para )?cuantos dias\b|\bdias de (material|aluminio|stock|cobre|granalla)\b|\bcuanto (me |nos )?(dura|duran|aguanta|aguantan)\b|\bhasta cuando\b|\bautonomia\b|\bcobertura\b/.test(q)){out.modo="dias";
    const F=[[/\bnave\s*(1|2|uno|dos)\b/,m=>"Nave "+(m[1]==="uno"?"1":m[1]==="dos"?"2":m[1])],[/\b(alsi\s*9|l-?2630|blanc[oa]s?)\b/,()=>"L-2630"],[/\b(alsi\s*12|l-?2521(-b)?|azul(es)?)\b/,()=>"L-2521-B"]];
    out.nave=(q.match(F[0][0])||[])[0]?F[0][1](q.match(F[0][0])):null;out.mat=F[1][0].test(q)?"L-2630":F[2][0].test(q)?"L-2521-B":null;out.cobre=/\b(cobre|granalla)\b/.test(q);out.soloCobre=out.cobre&&!/\baluminio\b|\bnave\b|\balsi/.test(q);return out;}
  /* «qué camiones tienen que entrar mañana»: lo planificado, no lo apuntado */
  const camW=/\b(camion(es)?|entradas?|entrar|llegar|venir|bp|aluminio)\b/;
  if(RE_FUT.test(q)||(/\bmanana\b/.test(q)&&camW.test(q)&&!/\b(relevo|turno|por la)\b/.test(q))){out.modo="fut";out.per=periodoFut(q);
    const F=[[/\bnave\s*(1|2|uno|dos)\b/,m=>"nave "+(m[1]==="uno"?"1":m[1]==="dos"?"2":m[1])],[/\b(alsi\s*9|l-?2630|blanc[oa]s?)\b/,()=>"alsi9"],[/\b(alsi\s*12|l-?2521(-b)?|azul(es)?)\b/,()=>"alsi12"],[/\b(externo|bp)\b/,()=>"externo"]];
    F.forEach(([re,v])=>{const m=q.match(re);if(m)out.filtros.push({t:v(m)});});return out;}
  /* «qué relevo consume más», «qué nave gasta menos», «qué proveedor ha traído más» */
  const sup=q.match(/\b(mas|menos)\b/);const supG=[["relevo",/\b(relevos?|turnos?)\b/],["nave",/\bnaves?\b(?!\s*(1|2|uno|dos)\b)/],["prov",/\bproveedor(es)?\b/],["colada",/\bcoladas?\b/],["dia",/\bdias?\b/],["mes",/\bmes(es)?\b(?! (pasado|anterior|que viene))/],["aleacion",/\b(aleacion(es)?|material)\b/]];
  if(sup&&/\b(que|cual|cuales|quien)\b/.test(q)){const g=supG.find(x=>x[1].test(q.replace(/\b(este|esta|el|ultimo|ultimos|cada) (mes|dia|dias)\b/g," ")));if(g){out.sup=sup[1];out.supG=g[0];}}
  const P=periodoC(q);if(P&&P.re)rest=rest.replace(P.re," ");
  out.ultimo=/\b(ultim[oa]|ultima vez|mas reciente|cuando)\b/.test(q)&&!/\bultim[oa]s? \d+/.test(q)&&!/\bultimo mes\b/.test(q);out.primero=/\b(primer[oa]?|primera vez)\b/.test(q);
  /* tipo de apunte */
  const tipos=[];[["C",/\b(consum\w*|gast\w*|usad\w*|salidas?|fundid\w*)\b/],["E",/\b(entrad\w*|entrado|entrar|entra|entran|camion(es)?|llegad\w*|llego|llegaron|recibid\w*|albaran(es)?|compras?|comprad\w*|traid\w*)\b/],["A",/\b(ajustes?|recuentos?)\b/],["G",/\b(granalla|cobre)\b/],["T",/\b(traslad\w*)\b/]]
    .forEach(([k,re])=>{if(re.test(rest)){tipos.push(k);rest=rest.replace(new RegExp(re.source,"g")," ");}});
  out.precio=/\bprecios?\b|\bcuesta\b|\bvale\b|\beuros?\b/.test(q);rest=rest.replace(/\bprecios?\b|\bcuesta\b|\bvale\b|\beuros?\b/g," ");
  if(out.sup&&!tipos.length){tipos.push("C");}
  const mov=tipos.length||P||out.ultimo||out.primero||/\b(apuntes?|movimientos?|historial|relevos?|turnos?)\b/.test(q);
  out.modo=out.precio?"precio":mov?"mov":"col";out.tipos=tipos;
  out.per=P||(out.modo==="mov"?(out.ultimo||out.primero?{d:"0000-00-00",h:hoy(),t:"todo el historial"}:{d:ymd(new Date(Date.now()-29*864e5)),h:hoy(),t:"últimos 30 días",def:true}):null);
  /* agrupar */
  const G=[["mes",/\bpor mes(es)?\b|\bcada mes\b|\bmensual\w*\b/,"mes"],["dia",/\bpor dias?\b|\bcada dia\b|\bdiari\w*\b/,"dia"],["relevo",/\bpor (relevos?|turnos?)\b|\brelevos?\b|\bturnos?\b/,"relevo"],["nave",/\bpor naves?\b/,"nave"],
    ["aleacion",/\bpor aleacion(es)?\b|\baleaciones\b|\bpor material\b/,"aleacion"],["prov",/\bpor proveedor(es)?\b|\bproveedores\b/,"prov"],["colada",/\bpor coladas?\b/,"colada"],["donde",/\bpor (donde|sitio|almacen)\b/,"donde"]];
  const g=G.find(x=>x[1].test(q));out.grupo=out.supG||(g?g[2]:null);if(out.supG)supG.forEach(x=>{if(x[0]===out.supG)rest=rest.replace(new RegExp(x[1].source,"g")," ");});G.forEach(x=>{rest=rest.replace(new RegExp(x[1].source,"g")," ");});
  /* frases con su valor */
  const F=[[/\bnave\s*(1|2|uno|dos)\b/,m=>"nave "+(m[1]==="uno"?"1":m[1]==="dos"?"2":m[1])],[/\b(alsi\s*9|l-?2630|blanc[oa]s?)\b/,()=>"alsi9"],[/\b(alsi\s*12|l-?2521(-b)?|azul(es)?)\b/,()=>"alsi12"],
    [/\b(externo|fuera)\b/,()=>"almacen externo"],[/\bmanana\b/,()=>"manana"],[/\btarde\b/,()=>"tarde"],[/\bnoche\b/,()=>"noche"],[/\b(gastadas?|agotadas?|vacias?)\b/,()=>"gastada"]];
  F.forEach(([re,v])=>{const m=rest.match(re);if(m){out.filtros.push({t:v(m)});rest=rest.replace(re," ");}});
  rest.split(" ").filter(w=>w&&!STOP_C.has(w)&&w.length>1&&!/^(apuntes?|movimientos?|historial|relevos?|turnos?|tipos?|cuanta|cuanto)$/.test(w)).forEach(w=>out.filtros.push({t:w,alt:raizC(w)}));
  out.filtros.forEach(f=>{if(!f.alt)f.alt=f.t;});
  out.todas=/\b(todas|gastadas?|agotadas?)\b/.test(q);return out;}

/* «hoy», «en octubre de 2026», «en los últimos 30 días»: para escribir la respuesta como una frase */
function perTxt(P){const t=P.t;if(/^(hoy|ayer|esta |este )/.test(t))return t;if(/^últimos/.test(t))return"en los "+t;if(/^el año/.test(t))return"en "+t.slice(7);if(t==="todo el historial")return"en total";if(/^[A-Z]/.test(t)){const[m,a]=t.split(" ");return"en "+m.toLowerCase()+(a&&a!==hoy().slice(0,4)?" de "+a:"");}return t;}
function donde(ok){const p=ok.map(f=>{const t=f.t;if(/^nave \d/.test(t))return"en "+Mayus(t);if(t==="alsi9")return"de AlSi9";if(t==="alsi12")return"de AlSi12";if(/^(manana|tarde|noche)$/.test(t))return"en el relevo de "+(t==="manana"?"mañana":t);if(t==="almacen externo")return"en el externo";return"de "+(/\d/.test(t)?t.toUpperCase():Mayus(t));});return p.length?" "+p.join(" "):"";}
/* ejemplos: recogidos en un desplegable, por temas, para no llenar la pantalla */
const EJ_COL=[["Stock y coladas",["para cuántos días tengo aluminio","qué colada toca gastar en nave 1","coladas más antiguas del externo","todo sobre la colada C25073"]],
  ["Consumo",["qué relevo consume más este mes","consumo de este mes comparado con el pasado","qué día se consumió más este mes","cuánto aluminio se gasta por máquina en marcha"]],
  ["Camiones",["cuántos camiones han entrado este mes en cada nave, del proveedor y del externo","qué camiones tienen que entrar mañana","cuándo tengo que pedir camión","con cuánto stock acabo el mes","cuántos camiones quedan por traer este mes"]],
  ["Dinero",["cuánto ha costado el aluminio este mes","cuánto me va a costar el aluminio este mes","qué proveedor sale más barato","cuánto vale lo que tengo en stock"]],
  ["Revisar",["lo que tengo, lo que ha entrado y lo que ha consumido cada nave este mes","qué hay que revisar","qué relevos no se han apuntado esta semana","qué máquinas están paradas","resumen del mes"]]];
function ejemplos(G,pon,st){const d=el("details",{class:"ejs"});if(st.ejAb)d.open=true;d.addEventListener("toggle",()=>{st.ejAb=d.open;});
  d.appendChild(el("summary",{text:"Ver ejemplos de preguntas"}));
  G.forEach(([t,L])=>d.appendChild(el("div",{class:"ejs-g"},[el("div",{class:"ejs-t",text:t})].concat(L.map(q=>el("button",{type:"button",class:"ejs-q",text:q,onclick:()=>pon(q)}))))));return d;}
function vBuscaCol(resto){
  const caja=el("div",{class:"bq-caja"});const res=el("div",{class:"bq-res"});
  const q=el("input",{type:"search",id:"bqQ",placeholder:"¿Qué quieres saber?",autocomplete:"off",enterkeyhint:"search","aria-label":"Pregunta"});q.value=bq.q;
  q.addEventListener("input",()=>{bq.q=q.value;bq.ef=[];bq.g=null;pinta();});
  const sug=el("div",{class:"chips bq-sug"});
  caja.appendChild(el("div",{class:"bq-q"},[q]));caja.appendChild(sug);
  const pon=(t,mant)=>{if(!mant){bq.ef=[];bq.g=null;}bq.q=t;q.value=t;pinta();};
  function pinta(){pinta0();if(window.BuscaAprende&&nqC(bq.q))BuscaAprende.tras("coladas",res,bq.q,["AlSi9","AlSi12","Nave 1","Nave 2","externo","consumo","entradas"].concat(cfg.proveedores||[]),()=>pinta());}
  function pinta0(){res.textContent="";sug.textContent="";if(resto)resto.hidden=!!nqC(bq.q);
    if(!nqC(bq.q)){sug.classList.add("bq-ej");const tp=window.BuscaAprende&&BuscaAprende.topUI(pon);if(tp)sug.appendChild(tp);sug.appendChild(ejemplos(EJ_COL,pon,bq));return;}
    sug.classList.remove("bq-ej");
    const E=entenderC(window.BuscaAprende?BuscaAprende.aplicar("coladas",bq.q):bq.q),S=saldos();
    {const qa=" "+nqC(bq.q).replace(/\s+/g," ")+" ",AL=albaranes(),hit=Object.values(AL).filter(a=>{const k=albKey(a.alb);return k.length>=4&&(qa.replace(/\s/g,"").includes(k));}).slice(0,3);
      if(hit.length)res.appendChild(el("div",{class:"bq-ult"},[el("div",{class:"sub",text:hit.length===1?"Albarán encontrado":"Albaranes encontrados"})].concat(hit.map(a=>el("button",{type:"button",class:"btn",style:"justify-self:start",text:"Abrir el albarán "+a.alb+(a.prov?" · "+a.prov:"")+(a.f?" · "+dmyA(a.f):""),onclick:()=>abrirAlbaran(a.alb)})))));}
    if(E.modo==="precio")return pintaPrecio(E,res);
    if(E.modo==="fut")return pintaFut(E,res);
    if(E.modo==="dias")return pintaDias(E,res);
    if(E.modo2)return pintaIntC2(E,res,pon);
    if(!["col","mov","precio","fut","dias"].includes(E.modo))return pintaIntencion(E,res,pon);
    const mov=E.modo==="mov";const cols=mov?COLS_M:COLS_L;
    let L=mov?filasApuntes(S).filter(x=>x.f>=E.per.d&&x.f<=E.per.h&&(!E.tipos.length||E.tipos.some(t=>x.r.t===t))):filasColadas(S).filter(x=>E.todas||x.estado==="Con stock");
    /* palabras que no casan: se avisa y no cuentan */
    const ok=[],ign=[];E.filtros.forEach(f=>{const a=[f.alt];if(L.some(x=>a.some(z=>reC(z).test(txtFila(x,cols)))))ok.push(f);else ign.push(f.t);});
    L=L.filter(x=>ok.every(f=>reC(f.alt).test(txtFila(x,cols))));
    const gk=bq.g||E.grupo||(mov?(E.tipos.length===1&&E.tipos[0]==="E"?"prov":E.per&&E.per.d===E.per.h?"relevo":"nave"):"aleacion");
    const nomG={mes:"mes",dia:"día",relevo:"relevo",nave:"nave",aleacion:"aleación",prov:"proveedor",colada:"colada",donde:"dónde está",tipo:"tipo"};
    const ef=bq.ef.filter(f=>nomG[f.g]);L=L.filter(x=>ef.every(f=>String(x[f.g]||"—")===f.v));
    res.appendChild(el("div",{class:"bq-ent"},[el("span",{class:"sub",text:"Buscando en "}),el("b",{text:mov?(E.tipos.length?E.tipos.map(t=>TIPO_C[t].toLowerCase()).join(" y "):"todos los apuntes"):"coladas"+(E.todas?"":" con stock")}),
      mov?el("span",{class:"chip-sel on",text:E.per.t}):null,...ok.map(f=>el("span",{class:"chip-sel on",text:/\d/.test(f.t)&&!/\s/.test(f.t)?f.t.toUpperCase():f.t})),el("span",{class:"sub",text:" · por "+nomG[gk]})]));
    if(ign.length)res.appendChild(el("p",{class:"hint",text:"No he encontrado «"+ign.join("», «")+"», así que no lo he tenido en cuenta."}));
    if(mov&&E.per.def)res.appendChild(el("div",{class:"chips",style:"margin:0 0 8px"},[el("span",{class:"sub",text:"Periodo:"})].concat(["hoy","ayer","este mes","el mes pasado","este año"].map(t=>el("button",{type:"button",class:"chip",text:t,onclick:()=>pon(bq.q+" "+t)})))));
    if(ef.length)res.appendChild(el("div",{class:"chips",style:"margin:0 0 8px"},[el("span",{class:"sub",text:"Solo:"})].concat(ef.map((f,i)=>el("button",{type:"button",class:"chip-sel on",text:f.v+"  ✕","aria-label":"Quitar "+f.v,onclick:()=>{bq.ef=ef.filter((_,j)=>j!==i);pon(bq.q,true);}})))));
    if(!L.length){res.appendChild(el("div",{class:"card"},[el("div",{class:"empty",text:"No hay nada que cumpla todo eso. Prueba con menos palabras."})]));return;}
    const sKg=L.reduce((a,x)=>a+x.kg,0),sFa=L.reduce((a,x)=>a+x.fa,0);
    /* «el último…» */
    if(mov&&(E.ultimo||E.primero)){const x=E.primero?L.slice().sort((a,b)=>a.f.localeCompare(b.f))[0]:L.slice().sort((a,b)=>b.f.localeCompare(a.f))[0];
      res.appendChild(el("div",{class:"bq-ult"},[el("div",{class:"sub",text:(E.primero?"La primera":"La última")+" "+(x.tipo==="Entrada"?"entrada":x.tipo.toLowerCase())+(ok.length?" ("+ok.map(f=>f.t).join(", ")+")":"")}),
        el("b",{class:"bq-ult-f",text:dmyA(x.f)}),el("div",{text:[x.colada,x.aleacion,x.nave,x.relevo,fmt(x.kg)+" kg",x.fa?fmt(x.fa)+" fardos":null,x.prov,x.alb?"albarán "+x.alb:null].filter(Boolean).join(" · ")}),
        el("div",{style:"display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"},[x.l?el("button",{type:"button",class:"btn sec",text:"Ver la colada",onclick:()=>abrirFicha(x.l.id)}):null,x.alb?el("button",{type:"button",class:"btn sec",text:"Ver el albarán",onclick:()=>abrirAlbaran(x.alb)}):null])]));}
    const dond=donde(ok),fa_=n=>fmt(n)+(n===1?" fardo":" fardos"),soloE=E.tipos.length===1&&E.tipos[0]==="E",soloC=E.tipos.length===1&&E.tipos[0]==="C";
    const nAlb=mov?new Set(L.map(x=>x.r.a||x.r.i)).size:0;
    const frase=!mov?"Hay "+fmt(sKg)+" kg ("+fa_(sFa)+")"+dond+" en "+L.length+(L.length===1?" colada.":" coladas.")
      :soloE?Mayus(perTxt(E.per))+" "+(L.length===1?"ha entrado ":"han entrado ")+fmt(sKg)+" kg ("+fa_(sFa)+")"+dond+", en "+nAlb+(nAlb===1?" entrada.":" entradas.")
      :soloC?Mayus(perTxt(E.per))+" se "+(sKg===1?"ha":"han")+" consumido "+fmt(sKg)+" kg ("+fa_(sFa)+")"+dond+"."
      :Mayus(perTxt(E.per))+": "+fmt(sKg)+" kg ("+fa_(sFa)+")"+dond+" en "+L.length+(L.length===1?" apunte.":" apuntes.");
    if(!E.sup)res.appendChild(el("p",{class:"bq-resp",text:frase}));
    /* reparto que se toca */
    const Gr={};L.forEach(x=>{const k=String(x[gk]||"—");const g=Gr[k]=Gr[k]||{kg:0,fa:0,n:0,ult:"",rel:new Set()};g.kg+=x.kg;g.fa+=x.fa;g.n++;if(x.relevo)g.rel.add(x.f+"|"+x.relevo);const f=x.f||x.entrada||"";if(f>g.ult)g.ult=f;});
    const GL=Object.entries(Gr).sort((a,b)=>E.sup?(E.sup==="menos"?a[1].kg-b[1].kg:b[1].kg-a[1].kg):gk==="mes"||gk==="dia"?b[1].ult.localeCompare(a[1].ult):gk==="relevo"?TURNOS.indexOf(a[0])-TURNOS.indexOf(b[0]):b[1].kg-a[1].kg);const mx=Math.max(1,...GL.map(g=>g[1].kg));
    const media=g=>gk==="relevo"&&g.rel.size?" · "+fmt(g.kg/g.rel.size)+" kg de media en "+g.rel.size+(g.rel.size===1?" relevo":" relevos"):"";
    if(E.sup&&GL.length){const[k,g]=GL[0],pc=sKg?Math.round(g.kg/sKg*100):0,sig=GL[1];
      const verbo=soloE?(E.sup==="mas"?"más ha traído":"menos ha traído"):(E.sup==="mas"?"más consume":"menos consume");
      res.appendChild(el("div",{class:"bq-ult"},[el("div",{class:"sub",text:"El "+nomG[gk]+" que "+verbo+" · "+perTxt(E.per)+dond}),el("b",{class:"bq-ult-f",text:k}),
        el("div",{text:fmt(g.kg)+" kg ("+fa_(g.fa)+"), el "+pc+" % del total"+media(g)+"."}),
        sig?el("div",{class:"sub",text:"Le sigue "+sig[0]+" con "+fmt(sig[1].kg)+" kg"+(sKg?" ("+Math.round(sig[1].kg/sKg*100)+" %)":"")+"."}):null,
        gk==="relevo"&&GL.some(([,x])=>x.rel.size)?el("div",{class:"sub",text:(()=>{const o=GL.filter(([,x])=>x.rel.size).slice().sort((a,b)=>(E.sup==="menos"?-1:1)*(b[1].kg/b[1].rel.size-a[1].kg/a[1].rel.size))[0];
          return o[0]===k?"Y también es el que "+(E.sup==="menos"?"menos":"más")+" gasta de media en cada relevo trabajado.":"Ojo: suma más porque ha trabajado más relevos. De media por relevo trabajado, el que "+(E.sup==="menos"?"menos":"más")+" gasta es "+o[0]+" ("+fmt(o[1].kg/o[1].rel.size)+" kg por relevo).";})()}):null]));}
    const otros=(mov?["nave","relevo","aleacion","prov","mes","dia","colada","tipo"]:["aleacion","nave","donde","prov","colada"]).filter(k=>k!==gk&&!ef.some(f=>f.g===k));
    res.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Por "+nomG[gk]})]),
      el("div",{class:"chips",style:"padding:0 14px 8px"},otros.map(k=>el("button",{type:"button",class:"chip",text:"Por "+nomG[k],onclick:()=>{bq.g=k;pon(bq.q,true);}}))),
      el("div",{class:"bq-lst"},GL.map(([k,g])=>el("button",{type:"button",class:"bq-it",onclick:()=>{bq.ef=ef.concat([{g:gk,v:k}]);bq.g=gk==="colada"?"tipo":gk==="nave"||gk==="aleacion"?"relevo":"colada";pon(bq.q,true);}},[
        el("div",{class:"bq-p"},[el("b",{text:k}),el("span",{class:"sub",text:g.n+(mov?(g.n===1?" apunte":" apuntes"):(g.n===1?" colada":" coladas"))+media(g)+(sKg?" · "+Math.round(g.kg/sKg*100)+" %":"")}),el("i",{class:"bq-bar"},el("i",{style:"width:"+Math.round(g.kg/mx*100)+"%"}))]),
        el("div",{class:"bq-c num"},[el("b",{text:fmt(g.kg)+" kg"}),el("span",{class:"sub",text:fmt(g.fa)+(g.fa===1?" fardo":" fardos")})])])))]));
    /* la lista */
    const R=(mov?L.slice().sort((a,b)=>b.f.localeCompare(a.f)):L.slice().sort((a,b)=>b.kg-a.kg)).slice(0,300);
    const cs=cols.filter(c=>R.some(x=>x[c[1]]!==""&&x[c[1]]!=null));
    res.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:L.length+(mov?(L.length===1?" apunte":" apuntes"):(L.length===1?" colada":" coladas"))})]),
      el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},cs.map(c=>el("th",{class:c[1]==="kg"||c[1]==="fa"?"r":"",text:c[0]})))]),
        el("tbody",{},R.map(x=>el("tr",x.l?{class:"fila-link",title:"Abrir la colada "+x.colada,onclick:()=>abrirFicha(x.l.id)}:{},cs.map(c=>el("td",{class:c[1]==="kg"||c[1]==="fa"?"r num":"","data-l":c[0]},c[1]==="colada"&&x.l?[el("button",{type:"button",class:"linkcol",text:x.colada,onclick:ev=>{ev.stopPropagation();abrirFicha(x.l.id);}})]:c[1]==="alb"&&x.alb?[el("button",{type:"button",class:"linkcol",text:x.alb,onclick:ev=>{ev.stopPropagation();abrirAlbaran(x.alb);}})]:[document.createTextNode(c[1]==="kg"||c[1]==="fa"?fmt(x[c[1]]):String(x[c[1]]||""))])))))])]),
      L.length>300?el("p",{class:"hint",style:"padding:8px 14px",text:"Salen los 300 primeros. Acota con más palabras o un periodo."}):null]));}
  function pintaFut(E,res){const h=hoy(),P=E.per;const nv=E.filtros.find(f=>/^nave/.test(f.t)),mt=E.filtros.find(f=>/^alsi/.test(f.t)),ex=E.filtros.some(f=>f.t==="externo");
    const todas=[];Object.keys(cfg.plan||{}).forEach(mm=>((cfg.plan[mm]||{}).entradas||[]).forEach(x=>{if(!x.rec&&x.f)todas.push(x);}));
    const pasa=x=>{const[n,m]=(x.k||"").split("|");return(!nv||!n||nqC(n)===nv.t)&&(!mt||!m||nqC(MAT[m].nom)===mt.t)&&(!ex||x.o==="B");};
    const T=todas.filter(pasa).sort((a,b)=>a.f.localeCompare(b.f));const L=T.filter(x=>x.f>=P.d&&x.f<=P.h);const atras=T.filter(x=>x.f<h);
    const diaTxt=f=>{const d=new Date(f+"T12:00:00");return d.toLocaleDateString("es-ES",{weekday:"long"})+" "+dmyA(f);};
    const kgF=x=>{const[,m]=(x.k||"|L-2630").split("|");const M=mediaCamion(m||"L-2630");return M&&M.fa?Math.round(x.fa*M.kg/M.fa):0;};
    const lin=x=>el("div",{class:"bq-it",style:"cursor:default"},[el("div",{class:"bq-p"},[el("b",{text:x.k?etiqLinea(x.k):"Destino por decidir"}),el("span",{class:"sub",text:Mayus(diaTxt(x.f))+" · "+(x.o==="B"?"del almacén externo (BP)":"camión del proveedor")})]),
      el("div",{class:"bq-c num"},[el("b",{text:fmt(x.fa)+" fardos"}),kgF(x)?el("span",{class:"sub",text:"≈ "+fmt(kgF(x))+" kg"}):null])]);
    const filt=[nv?Mayus(nv.t):null,mt?(mt.t==="alsi9"?"AlSi9":"AlSi12"):null,ex?"del externo":null].filter(Boolean).join(", ");
    res.appendChild(el("div",{class:"bq-ent"},[el("span",{class:"sub",text:"Buscando en "}),el("b",{text:"entradas planificadas"}),el("span",{class:"chip-sel on",text:P.t}),filt?el("span",{class:"chip-sel on",text:filt}):null]));
    const fa=L.reduce((a,x)=>a+x.fa,0),camT=n=>n+(n===1?" entrada":" entradas");
    const nC=L.filter(x=>x.o!=="B").length,nB=L.length-nC,queT=[nC?nC+(nC===1?" camión del proveedor":" camiones del proveedor"):null,nB?nB+(nB===1?" traída del externo":" traídas del externo"):null].filter(Boolean).join(" y ");
    const cuando=P.t==="mañana"||P.t==="pasado mañana"||P.t==="hoy"?Mayus(P.t)+", "+diaTxt(P.d)+",":Mayus(P.t);
    res.appendChild(el("p",{class:"bq-resp",text:L.length?cuando+" "+(L.length===1?"tiene que entrar ":"tienen que entrar ")+queT+" ("+fmt(fa)+" fardos)"+(filt?" · "+filt:"")+".":cuando+" no hay ninguna entrada planificada"+(filt?" ("+filt+")":"")+"."}));
    if(L.length)res.appendChild(el("div",{class:"card"},[el("div",{class:"bq-lst"},L.map(lin))]));
    else{const sig=T.find(x=>x.f>P.h);if(sig)res.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"La siguiente"})]),el("div",{class:"bq-lst"},[lin(sig)])]));}
    if(atras.length)res.appendChild(el("div",{class:"banner w",text:"Hay "+camT(atras.length)+(atras.length===1?" planificada":" planificadas")+" para días que ya han pasado y no se han apuntado como recibidas ("+atras.map(x=>dmy(x.f)).join(", ")+"). Revísalas en Plan."}));
    res.appendChild(el("p",{class:"hint",text:"Sale lo que hay colocado en el calendario de la pestaña Plan."}));
    res.appendChild(el("button",{type:"button",class:"btn sec",text:"Abrir el Plan",onclick:()=>{tab="plan";try{localStorage.setItem("colada.tab","plan");}catch(e){}tabsUI();render();}}));}
  /* Días = fardos ÷ gasto diario. El gasto diario sale de los últimos 30 días (fardos gastados ÷ días con consumo),
     que es el ritmo de ahora; la media de siempre (la de Stock) se enseña al lado. */
  function pintaDias(E,res){const {B}=bloques(),h=hoy(),d30=ymd(new Date(Date.now()-30*864e5));
    const C=movs().filter(r=>r.t==="C"&&r.f&&r.f>=d30&&r.f<=h),dd=new Set(C.map(r=>r.f)).size||1,c30={};
    C.forEach(r=>{const l=lotes.find(x=>x.id===r.o);if(!l)return;const k=key(l.nave,l.material);c30[k]=(c30[k]||0)+(typeof r.fa==="number"?r.fa:0);});
    const pend={};Object.keys(cfg.plan||{}).forEach(mm=>((cfg.plan[mm]||{}).entradas||[]).forEach(x=>{if(!x.rec&&x.k&&x.f&&x.o!=="B")pend[x.k]=(pend[x.k]||0)+x.fa;}));
    const lin=Object.keys(B).filter(k=>{const b=B[k];return(!E.nave||b.nave===E.nave)&&(!E.mat||b.mat===E.mat)&&(b.fa>0||c30[k]||pend[k]);});
    const dTx=n=>n==null?"—":n<1?"menos de 1 día":"≈ "+fmt(n)+(Math.round(n)===1?" día":" días");
    res.appendChild(el("div",{class:"bq-ent"},[el("span",{class:"sub",text:"Para cuántos días hay · "}),el("b",{text:[E.nave,E.mat?MAT[E.mat].nom:null].filter(Boolean).join(" · ")||(E.soloCobre?"granalla de cobre":"todas las líneas")})]));
    if(!E.soloCobre){
      if(!lin.length){res.appendChild(el("div",{class:"card"},[el("div",{class:"empty",text:"No hay material ni consumo en esa línea."})]));}
      const filas=lin.map(k=>{const b=B[k],dia=c30[k]?c30[k]/dd:0,dN=dia?b.faN/dia:null,dT=dia?b.fa/dia:null,dP=dia&&pend[k]?(b.fa+pend[k])/dia:null;return{k,b,dia,dN,dT,dP};})
        .sort((a,b)=>(a.dN==null?1e9:a.dN)-(b.dN==null?1e9:b.dN));
      if(filas.length){const f0=filas[0];if(f0.dN!=null)res.appendChild(el("p",{class:"bq-resp",text:(filas.length>1?"La que menos aguanta es "+etiqLinea(f0.k)+": ":etiqLinea(f0.k)+": ")+dTx(f0.dN)+" con lo que hay en la nave"+(f0.b.faE>0?" y "+dTx(f0.dT).replace("≈ ","")+" contando el externo":"")+"."}));}
      res.appendChild(el("div",{class:"card"},[el("div",{class:"bq-lst"},filas.map(x=>el("div",{class:"bq-it",style:"cursor:default;align-items:flex-start"},[
        el("div",{class:"bq-p"},[el("b",{text:etiqLinea(x.k)}),
          el("span",{class:"sub",text:fmt(x.b.faN)+" fardos en la nave"+(x.b.faE>0?" · "+fmt(x.b.faE)+" en el externo":"")+" · gasta "+(x.dia?(Math.round(x.dia*10)/10).toLocaleString("es-ES")+" fardos al día":"nada en 30 días")}),
          x.dT!=null&&x.b.faE>0?el("span",{class:"sub",text:"Contando el externo: "+dTx(x.dT)}):null,
          x.dP!=null?el("span",{class:"sub",text:"Con los camiones planificados (+"+fmt(pend[x.k])+" fardos): "+dTx(x.dP)}):null,
          x.b.medio>0?el("span",{class:"sub",text:"Con la media de siempre (Stock): "+dTx(x.b.faN/x.b.medio)+" en nave"}):null]),
        el("div",{class:"bq-c num"},[el("b",{text:x.dN==null?"—":x.dN<1?"<1":fmt(x.dN)}),el("span",{class:"sub",text:"días en nave"})])])))]));}
    if(E.cobre){const gk=granallaKg(),G=movs().filter(r=>r.t==="G"&&!r.aj&&r.f&&r.f>=d30&&r.f<=h&&typeof r.kg==="number"&&r.kg<0),gd=new Set(G.map(r=>r.f)).size,gg=G.reduce((a,r)=>a-r.kg,0);
      const dia=gd?gg/dd:0;res.appendChild(el("p",{class:"bq-resp",text:"Granalla de cobre: "+fmt(gk)+" kg"+(dia?", para "+dTx(gk/dia).replace("≈ ","unos ")+" (gasta unos "+fmt(dia)+" kg al día).":". No hay consumo apuntado en los últimos 30 días.")}));}
    res.appendChild(el("p",{class:"hint",text:"Días de trabajo, al ritmo de los últimos 30 días: fardos gastados entre los "+dd+" días con consumo. Los camiones planificados son los del calendario de Plan que aún no se han recibido; las traídas del externo no suman porque ese material ya está contado."}));}
  function pintaPrecio(E,res){const mes=E.per?E.per.d.slice(0,7):mesDe(hoy());const ok=E.filtros.filter(f=>f.t!=="alsi9"&&f.t!=="alsi12");const mats=Object.keys(MAT).filter(m=>!E.filtros.some(f=>f.t==="alsi9"||f.t==="alsi12")||E.filtros.some(f=>nqC(MAT[m].nom)===f.t));
    const provs=(cfg.proveedores||[]).filter(p=>!ok.length||ok.some(f=>reC(f.alt).test(" "+nqC(p)+" ")));
    res.appendChild(el("div",{class:"bq-ent"},[el("span",{class:"sub",text:"Precio del aluminio · "}),el("b",{text:Mayus(nomMes(mes))})]));
    if(!provs.length){res.appendChild(el("div",{class:"card"},[el("div",{class:"empty",text:"No encuentro ese proveedor. Los que hay: "+(cfg.proveedores||[]).join(", ")+"."})]));return;}
    res.appendChild(el("div",{class:"card"},[el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},[el("th",{text:"Proveedor"})].concat(mats.map(m=>el("th",{class:"r",text:MAT[m].nom+" €/kg"}))))]),
      el("tbody",{},provs.map(p=>el("tr",{},[el("td",{text:p})].concat(mats.map(m=>{const pr=precioDe(mes,p,m);return el("td",{class:"r num",text:pr.v?eurKg(pr.v)+(pr.m!==mes?" ("+nomMes(pr.m).split(" ")[0]+")":""):"—"});})))))])]),
      el("p",{class:"hint",style:"padding:8px 14px",text:"Entre paréntesis, si ese mes no tiene precio propio y se usa el del mes anterior. Se cambian en la pestaña Precios."})]));}
  pinta();if(window.BuscaAprende)BuscaAprende.cargar("coladas").then(()=>{if(!nqC(bq.q))pinta();});return el("div",{class:"card bq"},[el("div",{class:"hd"},[el("h2",{text:"Pregunta lo que necesites"})]),caja,res]);}
