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
  const P=periodoC(q);if(P&&P.re)rest=rest.replace(P.re," ");
  out.ultimo=/\b(ultim[oa]|ultima vez|mas reciente|cuando)\b/.test(q)&&!/\bultim[oa]s? \d+/.test(q)&&!/\bultimo mes\b/.test(q);out.primero=/\b(primer[oa]?|primera vez)\b/.test(q);
  /* tipo de apunte */
  const tipos=[];[["C",/\b(consum\w*|gast\w*|usad\w*|salidas?|fundid\w*)\b/],["E",/\b(entrad\w*|entrado|camion(es)?|llegad\w*|recibid\w*|albaran(es)?|compras?|comprad\w*)\b/],["A",/\b(ajustes?|recuentos?)\b/],["G",/\b(granalla|cobre)\b/],["T",/\b(traslad\w*)\b/]]
    .forEach(([k,re])=>{if(re.test(rest)){tipos.push(k);rest=rest.replace(new RegExp(re.source,"g")," ");}});
  out.precio=/\bprecios?\b|\bcuesta\b|\bvale\b|\beuros?\b/.test(q);rest=rest.replace(/\bprecios?\b|\bcuesta\b|\bvale\b|\beuros?\b/g," ");
  const mov=tipos.length||P||out.ultimo||out.primero||/\b(apuntes?|movimientos?|historial|relevos?|turnos?)\b/.test(q);
  out.modo=out.precio?"precio":mov?"mov":"col";out.tipos=tipos;
  out.per=P||(out.modo==="mov"?(out.ultimo||out.primero?{d:"0000-00-00",h:hoy(),t:"todo el historial"}:{d:ymd(new Date(Date.now()-29*864e5)),h:hoy(),t:"últimos 30 días",def:true}):null);
  /* agrupar */
  const G=[["mes",/\bpor mes(es)?\b|\bcada mes\b|\bmensual\w*\b/,"mes"],["dia",/\bpor dias?\b|\bcada dia\b|\bdiari\w*\b/,"dia"],["relevo",/\bpor (relevos?|turnos?)\b|\brelevos?\b|\bturnos?\b/,"relevo"],["nave",/\bpor naves?\b/,"nave"],
    ["aleacion",/\bpor aleacion(es)?\b|\baleaciones\b|\bpor material\b/,"aleacion"],["prov",/\bpor proveedor(es)?\b|\bproveedores\b/,"prov"],["colada",/\bpor coladas?\b/,"colada"],["donde",/\bpor (donde|sitio|almacen)\b/,"donde"]];
  const g=G.find(x=>x[1].test(q));out.grupo=g?g[2]:null;G.forEach(x=>{rest=rest.replace(new RegExp(x[1].source,"g")," ");});
  /* frases con su valor */
  const F=[[/\bnave\s*(1|2|uno|dos)\b/,m=>"nave "+(m[1]==="uno"?"1":m[1]==="dos"?"2":m[1])],[/\b(alsi\s*9|l-?2630|blanc[oa]s?)\b/,()=>"alsi9"],[/\b(alsi\s*12|l-?2521(-b)?|azul(es)?)\b/,()=>"alsi12"],
    [/\b(externo|fuera)\b/,()=>"almacen externo"],[/\bmanana\b/,()=>"manana"],[/\btarde\b/,()=>"tarde"],[/\bnoche\b/,()=>"noche"],[/\b(gastadas?|agotadas?|vacias?)\b/,()=>"gastada"]];
  F.forEach(([re,v])=>{const m=rest.match(re);if(m){out.filtros.push({t:v(m)});rest=rest.replace(re," ");}});
  rest.split(" ").filter(w=>w&&!STOP_C.has(w)&&w.length>1&&!/^(apuntes?|movimientos?|historial|relevos?|turnos?|tipos?|cuanta|cuanto)$/.test(w)).forEach(w=>out.filtros.push({t:w,alt:raizC(w)}));
  out.filtros.forEach(f=>{if(!f.alt)f.alt=f.t;});
  out.todas=/\b(todas|gastadas?|agotadas?)\b/.test(q);return out;}

function vBuscaCol(resto){
  const caja=el("div",{class:"bq-caja"});const res=el("div",{class:"bq-res"});
  const q=el("input",{type:"search",id:"bqQ",placeholder:"¿Qué quieres saber?",autocomplete:"off",enterkeyhint:"search","aria-label":"Pregunta"});q.value=bq.q;
  q.addEventListener("input",()=>{bq.q=q.value;bq.ef=[];bq.g=null;pinta();});
  const sug=el("div",{class:"chips bq-sug"});
  caja.appendChild(el("div",{class:"bq-q"},[q]));caja.appendChild(sug);
  const pon=(t,mant)=>{if(!mant){bq.ef=[];bq.g=null;}bq.q=t;q.value=t;pinta();};
  function pinta(){res.textContent="";sug.textContent="";if(resto)resto.hidden=!!nqC(bq.q);
    if(!nqC(bq.q)){sug.classList.add("bq-ej");sug.appendChild(el("span",{class:"sub",text:"Prueba con:"}));
      ["cuánto se ha consumido este mes en nave 1","consumo de ayer por relevo","coladas en externo","stock de AlSi12","entradas de este mes por proveedor","último camión de Idalsa","precio de Befesa este mes","consumo de AlSi9 por mes este año"]
        .forEach(t=>sug.appendChild(el("button",{type:"button",class:"chip",text:t,onclick:()=>pon(t)})));return;}
    sug.classList.remove("bq-ej");
    const E=entenderC(bq.q),S=saldos();
    if(E.modo==="precio")return pintaPrecio(E,res);
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
        x.l?el("button",{type:"button",class:"btn sec",style:"justify-self:start;margin-top:6px",text:"Ver la colada",onclick:()=>abrirFicha(x.l.id)}):null]));}
    res.appendChild(el("p",{class:"bq-resp",text:(mov?Mayus(E.per.t)+": ":"Hay ")+fmt(sKg)+" kg · "+fmt(sFa)+" fardos"+(mov?" en "+L.length+(L.length===1?" apunte":" apuntes"):" en "+L.length+(L.length===1?" colada":" coladas"))+"."}));
    /* reparto que se toca */
    const Gr={};L.forEach(x=>{const k=String(x[gk]||"—");const g=Gr[k]=Gr[k]||{kg:0,fa:0,n:0,ult:""};g.kg+=x.kg;g.fa+=x.fa;g.n++;const f=x.f||x.entrada||"";if(f>g.ult)g.ult=f;});
    const GL=Object.entries(Gr).sort((a,b)=>gk==="mes"||gk==="dia"?b[1].ult.localeCompare(a[1].ult):gk==="relevo"?TURNOS.indexOf(a[0])-TURNOS.indexOf(b[0]):b[1].kg-a[1].kg);const mx=Math.max(1,...GL.map(g=>g[1].kg));
    const otros=(mov?["nave","relevo","aleacion","prov","mes","dia","colada","tipo"]:["aleacion","nave","donde","prov","colada"]).filter(k=>k!==gk&&!ef.some(f=>f.g===k));
    res.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Por "+nomG[gk]})]),
      el("div",{class:"chips",style:"padding:0 14px 8px"},otros.map(k=>el("button",{type:"button",class:"chip",text:"Por "+nomG[k],onclick:()=>{bq.g=k;pon(bq.q,true);}}))),
      el("div",{class:"bq-lst"},GL.map(([k,g])=>el("button",{type:"button",class:"bq-it",onclick:()=>{bq.ef=ef.concat([{g:gk,v:k}]);bq.g=gk==="colada"?"tipo":gk==="nave"||gk==="aleacion"?"relevo":"colada";pon(bq.q,true);}},[
        el("div",{class:"bq-p"},[el("b",{text:k}),el("span",{class:"sub",text:g.n+(mov?(g.n===1?" apunte":" apuntes"):(g.n===1?" colada":" coladas"))+" · toca para ver solo estos"}),el("i",{class:"bq-bar"},el("i",{style:"width:"+Math.round(g.kg/mx*100)+"%"}))]),
        el("div",{class:"bq-c num"},[el("b",{text:fmt(g.kg)+" kg"}),el("span",{class:"sub",text:fmt(g.fa)+(g.fa===1?" fardo":" fardos")})])])))]));
    /* la lista */
    const R=(mov?L.slice().sort((a,b)=>b.f.localeCompare(a.f)):L.slice().sort((a,b)=>b.kg-a.kg)).slice(0,300);
    const cs=cols.filter(c=>R.some(x=>x[c[1]]!==""&&x[c[1]]!=null));
    res.appendChild(el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:L.length+(mov?(L.length===1?" apunte":" apuntes"):(L.length===1?" colada":" coladas"))})]),
      el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},cs.map(c=>el("th",{class:c[1]==="kg"||c[1]==="fa"?"r":"",text:c[0]})))]),
        el("tbody",{},R.map(x=>el("tr",{},cs.map(c=>el("td",{class:c[1]==="kg"||c[1]==="fa"?"r num":"","data-l":c[0]},c[1]==="colada"&&x.l?[el("button",{type:"button",class:"linkcol",text:x.colada,onclick:()=>abrirFicha(x.l.id)})]:[document.createTextNode(c[1]==="kg"||c[1]==="fa"?fmt(x[c[1]]):String(x[c[1]]||""))])))))])]),
      L.length>300?el("p",{class:"hint",style:"padding:8px 14px",text:"Salen los 300 primeros. Acota con más palabras o un periodo."}):null]));}
  function pintaPrecio(E,res){const mes=E.per?E.per.d.slice(0,7):mesDe(hoy());const ok=E.filtros.filter(f=>f.t!=="alsi9"&&f.t!=="alsi12");const mats=Object.keys(MAT).filter(m=>!E.filtros.some(f=>f.t==="alsi9"||f.t==="alsi12")||E.filtros.some(f=>nqC(MAT[m].nom)===f.t));
    const provs=(cfg.proveedores||[]).filter(p=>!ok.length||ok.some(f=>reC(f.alt).test(" "+nqC(p)+" ")));
    res.appendChild(el("div",{class:"bq-ent"},[el("span",{class:"sub",text:"Precio del aluminio · "}),el("b",{text:Mayus(nomMes(mes))})]));
    if(!provs.length){res.appendChild(el("div",{class:"card"},[el("div",{class:"empty",text:"No encuentro ese proveedor. Los que hay: "+(cfg.proveedores||[]).join(", ")+"."})]));return;}
    res.appendChild(el("div",{class:"card"},[el("div",{class:"tw"},[el("table",{},[el("thead",{},[el("tr",{},[el("th",{text:"Proveedor"})].concat(mats.map(m=>el("th",{class:"r",text:MAT[m].nom+" €/kg"}))))]),
      el("tbody",{},provs.map(p=>el("tr",{},[el("td",{text:p})].concat(mats.map(m=>{const pr=precioDe(mes,p,m);return el("td",{class:"r num",text:pr.v?eurKg(pr.v)+(pr.m!==mes?" ("+nomMes(pr.m).split(" ")[0]+")":""):"—"});})))))])]),
      el("p",{class:"hint",style:"padding:8px 14px",text:"Entre paréntesis, si ese mes no tiene precio propio y se usa el del mes anterior. Se cambian en la pestaña Precios."})]));}
  pinta();return el("div",{class:"card bq"},[el("div",{class:"hd"},[el("h2",{text:"Pregunta lo que necesites"})]),caja,res]);}
