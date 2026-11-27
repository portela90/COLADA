
(function(){
"use strict";
const TABS=[["res","Hoy"],["rap","Apuntar"],["consu","Consumo"],["stock","Stock"],["repo","Reponer"],["mas","Más"]];
/* Más: por pieza (cada una con todo lo suyo), máquinas y gestión */
const SUB=[["pist","Pistones"],["ejes","Ejes"],["cont","Contenedores"],["btb","Barras expulsoras"],["btt","Tornillos tope"],["bth","Horno"],["quim","Aceites, taladrinas y jabones"],
  ["iny","Inyectoras"],["mol","Moldes"],["aver","Averías"],["bd","Consultas"],["desv","Desviaciones"],["abc","Recuentos y ABC"],["mov","Movimientos"],["cat","Catálogo"],["aprob","Por aprobar"],["reglas","Reglas automáticas"],["reg","Registro de cambios"],["gest","Gestores y relevos"],["ronda","Ronda de consumos"]];
/* menú lateral: los grupos de «Más» van recogidos; se abren al pulsarlos (y el del apartado en el que estás) */
function subAbs(){try{return JSON.parse(localStorage.getItem("almacen.subAb")||"[]");}catch(e){return[];}}
function subGuarda(g,ab){try{const L=subAbs().filter(x=>x!==g);if(ab)L.push(g);localStorage.setItem("almacen.subAb",JSON.stringify(L));}catch(e){}}
const subAbierto=(g,ks)=>ks.includes(tab)||subAbs().includes(g);
const SUB_G=[["Piezas",["pist","ejes","cont","btb","btt","bth","quim"]],["Máquinas",["iny","mol","aver"]],["Gestión",["bd","desv","abc","mov","cat","gest","aprob","reglas","reg"]]];
const PADRE={ronda:"res",gest:"mas",aprob:"mas",reglas:"mas",reg:"mas",abc:"mas",aver:"mas",bd:"mas",desv:"mas",consultas:"mas",pist:"mas",ejes:"mas",mov:"mas",bt:"mas",btb:"mas",btt:"mas",bth:"mas",quim:"mas",cat:"mas",iny:"mas",cons:"mas",mol:"mas",cont:"mas"};
/* lo que era la app Inyectoras: cuatro pantallas dentro de Más › Inyectoras */
const INY_SUB=[["iny","Plano"],["cons","Consumo por máquina"],["mol","Moldes"]];
const esTab=t=>TABS.some(x=>x[0]===t)||SUB.some(x=>x[0]===t)||INY_SUB.some(x=>x[0]===t)||t==="bt"||t==="mat";
const FAM={consumible:"Consumible",piston:"Pistón",barra:"Barra expulsora",tornillo:"Tornillo tope",horno:"Recambio de horno",eje:"Eje",repuesto:"Repuesto",otro:"Otro"};
const TEC=f=>f==="barra"||f==="tornillo";
const UDS=["ud","kg","l","m","caja","rollo"];
const DIAM=["Ø 50","Ø 60","Ø 70","Ø 70 esp","Ø 80","Ø 90","Ø 90 esp","Ø 100","Ø 100 esp"];
const MOTIVOS=["DESGASTE","ROTURA","FUGA DE AGUA","PISTÓN AGARROTADO","CAMBIO REF","CAMBIO PREVENTIVO","PRUEBAS","TRABAJANDO SIN PISTONWAX"];
const DESTINOS=["ZONA DE PISTONES USADOS","QUEDA PUESTO EN EL EJE (AGARROTADO)","DESECHADO","NO ESTÁ EN LA ZONA PISTONES USADO NI EN EJE"];
const EST_E={planta:["En planta","ok"],preparado:["Preparado para enviar","info"],reparacion:["En reparación","warn"],devuelto:["Devuelto a reparar","bad"],revisar:["Llegado, por revisar","info"]};
const AMBAR=30,ROJO=60;
const TIPOS={entrada:"Entrada",salida:"Consumo",traslado:"Traslado",ajuste:"Conteo"};

let db=null,assets=null,downloads=null,ready=false,catOk=false,tab="res",pending=false;
let cat={articulos:[],almacenes:[],maquinas:[],proveedores:[],operarios:[],modelos:[]};
let meses={},pistAnos={},ejes=[],reps={};
const hoy=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const draft={m:{tipo:"entrada",f:hoy(),art:"",alm:"",dest:"",cant:"",maq:"",prov:"",alb:"",nota:""},mFile:null,
  p:{f:hoy(),maq:"",diam:"",cant:"1",motivo:"",dest:"",resp:"",nota:"",desc:true,alm:""},eb:"",
  fs:{fam:"",alm:"",txt:""},hm:{mes:"",tipo:""},fe:""};

const $=id=>document.getElementById(id);
function el(t,a,k){const n=document.createElement(t);
  if(k)(Array.isArray(k)?k:[k]).forEach(c=>{if(c==null||c===false)return;n.appendChild(typeof c==="object"?c:document.createTextNode(String(c)));});
  if(a)for(const p in a){const v=a[p];if(v==null||v===false)continue;
    if(p==="class")n.className=v;else if(p==="text")n.textContent=v;else if(p.startsWith("on")&&typeof v==="function")n.addEventListener(p.slice(2),v);
    else if(p==="value")n.value=v;else if(p==="checked")n.checked=!!v;else n.setAttribute(p,v===true?"":v);}
  return n;}
const qv=x=>'"'+String(x).replace(/["\\]/g,"")+'"';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const mesDe=f=>String(f).slice(0,7);
const fmtF=f=>{if(!f)return"—";const[y,m,d]=f.split("-");return d+"/"+m+"/"+y.slice(2);};
const fmtN=n=>(Math.round(n*100)/100).toLocaleString("es-ES",{maximumFractionDigits:2});
const parseN=s=>{const n=parseFloat(String(s).trim().replace(",","."));return isFinite(n)?n:NaN;};
const MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const fmtMes=m=>{const[y,mm]=m.split("-");return MESES[+mm-1]+" "+y;};
function toast(t){if(window.SOLO_CONSULTA&&/^No se pudo guardar|^No se ha podido guardar/.test(String(t)))t="Tu usuario es de solo consulta: puedes ver todo, pero no cambiar nada.";const o=$("toast");if(o)o.remove();const n=el("div",{id:"toast",role:"status",text:t});document.body.appendChild(n);setTimeout(()=>n.remove(),2600);}
function fld(l,inp,hid){return el("label",{hidden:hid},[l,inp]);}
function sel(id,opts,val,onch,ph){const s=el("select",{id},(ph!=null?[el("option",{value:"",text:ph})]:[]).concat(opts.map(o=>Array.isArray(o)?el("option",{value:o[0],text:o[1]}):o)));s.value=val||"";if(onch)s.addEventListener("change",()=>onch(s.value));return s;}
function inp(id,val,onin,extra){const i=el("input",Object.assign({id,value:val==null?"":val},extra||{}));if(onin)i.addEventListener("input",()=>onin(i.value));return i;}
function dias(a,b){return Math.round((Date.parse(b)-Date.parse(a))/864e5);}
function laborables(a,b){let n=0;const d=new Date(a+"T12:00:00"),e=new Date(b+"T12:00:00");while(d<e){const w=d.getDay();if(w>0&&w<6)n++;d.setDate(d.getDate()+1);}return n;}

/* ---------- lookups ---------- */
const art=id=>cat.articulos.find(a=>a.id===id);
const almN=id=>{const a=cat.almacenes.find(x=>x.id===id);return a?a.nom:"—";};
const maqN=id=>{const m=cat.maquinas.find(x=>x.id===id);return m?m.cod:"—";};
/* destino de un consumo: una inyectora o una nave entera */
const NAVES_C=["Nave 1A","Nave 1B","Nave 2"];
/* relevo de un apunte (para cruzarlo en Coladas con quién estaba): el de ahora si es de hoy */
const RELEVOS_A=["Mañana","Tarde","Noche"];
const relevoAhoraA=()=>{const h=new Date().getHours();return h>=6&&h<14?"Mañana":h>=14&&h<22?"Tarde":"Noche";};
/* elegir uno con botones (más rápido que un desplegable en el móvil). Se toca otra vez para quitarlo (salvo quitar:false).
   El grupo lleva el id y cada botón su valor en data-v */
function chipsSel(id,opts,val,onch,o){o=o||{};const g=el("div",{class:"chips chips-sel",id,role:"group","aria-label":o.label||null});g._v=val||"";
  opts.forEach(([v,t])=>g.appendChild(el("button",{type:"button",class:"chip","data-v":v,"aria-pressed":String(g._v===v),text:t,onclick:()=>{const nv=g._v===v&&o.quitar!==false?"":v;g._v=nv;
    g.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v===nv)));onch(nv);}})));return g;}
function campoChips(lbl,g,nota){if(!g)return null;if(!g.getAttribute("aria-label"))g.setAttribute("aria-label",lbl);return el("div",{class:"campo-chips"},[el("div",{class:"lbl"},[lbl,nota?el("small",{text:" · "+nota}):null]),g]);}
/* nº de operario, con «No se sabe» (si nadie sabe quién lo ha cogido) */
function campoOper(id,d,dl){const i=inp(id,d.resp||"",x=>{d.resp=x;d.rOk=false;if(String(x).trim()&&d.respNS){d.respNS=false;b.setAttribute("aria-pressed","false");}},{autocomplete:"off",list:dl,placeholder:"Nº o nombre"});
  const b=el("button",{type:"button",class:"chip oper-ns","aria-pressed":String(!!d.respNS),text:"No se sabe",onclick:()=>{d.respNS=!d.respNS;b.setAttribute("aria-pressed",String(d.respNS));if(d.respNS){d.resp="";i.value="";d.rOk=true;}else d.rOk=false;}});
  return el("label",{},["Nº de operario",el("span",{class:"oper-fila"},[i,b])]);}
function selRelevo(id,d){if(d.u==null)d.u=d.f===hoy()||!d.f?relevoAhoraA():"";return sel(id,RELEVOS_A.map(r=>[r,r]),d.u,x=>{d.u=x;},"—");}
/* «Para»: una nave, una inyectora o varias máquinas a la vez (p. ej. la granalladora que da servicio a la F27 y la F32,
   20/11/2026). Las combinaciones se guardan en el catálogo (cat.multiDest: [["F27","F32"],…]); en el apunte van como
   maqs:["F27","F32"] y la nave de la primera. Cada máquina cuenta su parte (la mitad si son dos). */
const multiTxt=L=>L.map(maqN).join("/");
function paraOpts(nuevo){return[el("optgroup",{label:"Nave"},NAVES_C.map(n=>el("option",{value:"nave:"+n,text:n}))),el("optgroup",{label:"Inyectora"},maqOpts().map(([v,t])=>el("option",{value:v,text:t}))),
  el("optgroup",{label:"Varias máquinas"},((cat&&cat.multiDest)||[]).map(L=>el("option",{value:"maqs:"+L.join(","),text:multiTxt(L)})).concat(nuevo?[el("option",{value:"maqs:nuevo",text:"＋ Varias máquinas…"})]:[]))];}
function ponPara(rec,v){if(!v||v==="maqs:nuevo")return;if(v.startsWith("nave:"))rec.nave=v.slice(5);
  else if(v.startsWith("maqs:")){rec.maqs=v.slice(5).split(",").filter(Boolean);const m=cat.maquinas.find(x=>x.id===rec.maqs[0]);if(m&&m.nave)rec.nave=m.nave;}else rec.maq=v;}
const paraTxt=m=>m.maq?maqN(m.maq):Array.isArray(m.maqs)&&m.maqs.length?multiTxt(m.maqs):(m.nave||"");
const paraVal=m=>m.maq||(Array.isArray(m.maqs)&&m.maqs.length?"maqs:"+m.maqs.join(","):m.nave?"nave:"+m.nave:"");
/* ¿este apunte es de la máquina id? y qué parte le toca (1 si es solo suya; 1/2 si es de dos) */
const deMaq=(x,id)=>x.maq===id||(Array.isArray(x.maqs)&&x.maqs.includes(id));
const parteMaq=(x,id)=>x.maq===id?1:Array.isArray(x.maqs)&&x.maqs.includes(id)?1/x.maqs.length:0;
/* desplegable «Para» que, con «＋ Varias máquinas…», deja elegir las máquinas y guarda la combinación */
function selPara(id,val,on,re){const s=sel(id,paraOpts(true),val,x=>{if(x!=="maqs:nuevo"){on(x);return;}s.value=val||"";elegirMaqs(v=>{on(v);if(re)re();});},"—");return s;}
function elegirMaqs(listo){const elegidas=new Set();const box=el("div",{style:"display:grid;gap:6px;max-height:50vh;overflow:auto"},maqOpts().map(([v,t])=>el("label",{class:"chk"},[el("input",{type:"checkbox",value:v,onchange:e=>{if(e.target.checked)elegidas.add(v);else elegidas.delete(v);}}),el("span",{text:" "+t})])));
  dlg("Varias máquinas",[el("p",{class:"hint",style:"margin-top:0",text:"Marca las máquinas a las que va (por ejemplo la F27 y la F32 si comparten la granalladora). Cada una cuenta su parte."}),box],
    [{t:"Cancelar",cls:"sec"},{t:"Usar estas",fn:async()=>{const L=maqOpts().map(([v])=>v).filter(v=>elegidas.has(v));if(L.length<2){toast("Marca al menos dos máquinas");return false;}
      const k=L.join(",");cat.multiDest=(cat.multiDest||[]).filter(x=>x.join(",")!==k).concat([L]);try{await saveCat();}catch(e){}listo("maqs:"+k);}}]);}
const provN=id=>{const p=cat.proveedores.find(x=>x.id===id);return p?p.nom:"";};
const artsActivos=()=>cat.articulos.filter(a=>a.activo!==false);
function artOpts(fil){const g={};artsActivos().filter(fil||(()=>true)).forEach(a=>{(g[a.fam]=g[a.fam]||[]).push(a);});
  return Object.keys(FAM).filter(f=>g[f]).map(f=>el("optgroup",{label:FAM[f]},g[f].sort((x,y)=>x.desc.localeCompare(y.desc)).map(a=>el("option",{value:a.id,text:a.desc+(a.cod&&!a.desc.includes(a.cod)?" · "+a.cod:"")}))));}
/* elegir artículo sin pelearse con la lista (20/11/2026): un buscador que filtra la lista mientras escribes (por trozos de
   palabra, sin tildes: «gran 110», «toner 44») y los artículos que más se sacan, a un toque. Si solo queda uno, se elige solo. */
const artTxt=a=>String(a.desc+" "+(a.cod||"")+" "+(FAM[a.fam]||"")).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function artBusca(q,fil){const T=String(q||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().split(/[^a-z0-9ñ]+/).filter(Boolean);
  return a=>(!fil||fil(a))&&T.every(t=>artTxt(a).includes(t));}
function artMasUsados(n,fil){const c={},d90=sumaDias(hoy(),-90);todosMov().forEach(m=>{if(m.tipo==="salida"&&m.f>=d90&&m.art)c[m.art]=(c[m.art]||0)+1;});
  return Object.keys(c).map(art).filter(a=>a&&a.activo!==false&&(!fil||fil(a))).sort((a,b)=>c[b.id]-c[a.id]).slice(0,n||6);}
function selArtBusca(id,d,on,fil){const q=d._artQ||"";const s=sel(id,artOpts(artBusca(q,fil)),d.art,on,q?"Elige entre los que coinciden…":"Elige artículo…");
  const n=artsActivos().filter(artBusca(q,fil)).length;
  const bus=el("input",{id:id+"Q",type:"search",value:q,placeholder:"Buscar: escribe parte del nombre o código",autocomplete:"off","aria-label":"Buscar artículo"});
  const info=el("div",{class:"sub",style:"min-height:16px",text:q?(n?n+(n===1?" artículo":" artículos"):"Ninguno con «"+q+"»"):""});
  bus.addEventListener("input",()=>{d._artQ=bus.value;const L=artsActivos().filter(artBusca(bus.value,fil));
    s.textContent="";s.appendChild(el("option",{value:"",text:bus.value?"Elige entre los que coinciden…":"Elige artículo…"}));artOpts(artBusca(bus.value,fil)).forEach(o=>s.appendChild(o));
    info.textContent=bus.value?(L.length?L.length+(L.length===1?" artículo":" artículos"):"Ninguno con «"+bus.value+"»"):"";
    if(L.length===1&&L[0].id!==d.art){s.value=L[0].id;on(L[0].id);}else s.value=L.some(a=>a.id===d.art)?d.art:"";});
  const usa=artMasUsados(6,fil);
  return el("div",{style:"display:grid;gap:6px"},[bus,info,s,usa.length&&!d.art?el("div",{class:"chips"},[el("span",{class:"sub",text:"Los que más se sacan:"})].concat(usa.map(a=>el("button",{type:"button",class:"chip",text:a.desc,onclick:()=>on(a.id)})))):null]);}
const almOpts=()=>cat.almacenes.map(a=>[a.id,a.nom]);
const maqOpts=()=>cat.maquinas.slice().sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true})).map(m=>[m.id,m.cod+(m.nave?" · "+m.nave:"")]);
const provOpts=()=>cat.proveedores.slice().sort((a,b)=>a.nom.localeCompare(b.nom)).map(p=>[p.id,p.nom]);

/* ---------- stock ---------- */
function todosMov(){const out=[];Object.keys(meses).forEach(k=>meses[k].forEach(m=>out.push(m)));return out;}
function stockMap(){const s={};const add=(a,l,c)=>{if(!a||!l)return;(s[a]=s[a]||{})[l]=((s[a]||{})[l]||0)+c;};
  todosMov().forEach(m=>{const c=+m.cant||0;
    if(m.tipo==="entrada")add(m.art,m.alm,c);else if(m.tipo==="salida")add(m.art,m.alm,-c);
    else if(m.tipo==="ajuste")add(m.art,m.alm,c);else if(m.tipo==="traslado"){add(m.art,m.alm,-c);add(m.art,m.dest,c);}});
  return s;}
let SM={};
/* stock de un artículo en un almacén al final de una fecha (para recuentos con fecha pasada) */
function stockA(a,l,f){if(!f||f>=hoy())return stockDe(a,l);let s=0;todosMov().forEach(m=>{if(m.art!==a||!(m.f<=f))return;const c=+m.cant||0;if(m.tipo==="entrada"&&m.alm===l)s+=c;else if(m.tipo==="salida"&&m.alm===l)s-=c;else if(m.tipo==="ajuste"&&m.alm===l)s+=c;else if(m.tipo==="traslado"){if(m.alm===l)s-=c;if(m.dest===l)s+=c;}});return s;}
const stockDe=(a,l)=>{const x=SM[a]||{};if(l)return x[l]||0;return Object.values(x).reduce((p,c)=>p+c,0);};
let CONS={};
function consMap(){const hy=hoy(),desde=sumaDias(hy,-60),first={},sal={};
  todosMov().forEach(m=>{if(!first[m.art]||m.f<first[m.art])first[m.art]=m.f;if(m.tipo==="salida"&&!m.inc&&m.f>=desde)sal[m.art]=(sal[m.art]||0)+(+m.cant||0);});
  const o={};Object.keys(sal).forEach(k=>{const ini=first[k]>desde?first[k]:desde;o[k]=sal[k]/Math.max(1,dias(ini,hy)+1);});return o;}
const consDia=a=>CONS[a.id]||0;
function plazoArt(a){if(+a.plazo>0)return +a.plazo;const pv=cat.proveedores.find(x=>x.id===a.prov);if(pv&&+pv.plazo>0)return +pv.plazo;
  const L=typeof plazoAprendido==="function"?plazoAprendido(a):null;return L?L.dias:0;}
const consPlazo=a=>consDia(a)*plazoArt(a);
const puntoPedido=a=>Math.max(+a.pp||0,(+a.min||0)+consPlazo(a));
/* lo que ya está puesto en el punto de consumo y aún no se ha gastado (hoy: el aceite de los GRG de la instalación,
   que sale de los contadores, 13g). Cuenta para saber si hay que pedir, no como stock del almacén (26/11/2026) */
const puestoDe=a=>{try{const P=PREV_AC[a.id];return P&&P.instKg>0?P.instKg:0;}catch(e){return 0;}};
const dispDe=a=>stockDe(a.id)+puestoDe(a);
/* se pide por envases completos (GRG, bidón…) cuando la ficha dice cuánto trae cada uno */
const envDe=a=>a&&a.envase&&+a.peso>0?+a.peso:0;
const redEnv=(a,q)=>{const e=envDe(a);return e&&q>0?Math.ceil(q/e-1e-9)*e:q;};
const envPl=(t,n)=>{t=String(t||"envase").toLowerCase();return n===1||t==="grg"?t.replace("grg","GRG"):t.replace(/ó/g,"o").replace(/n$/,"nes").replace(/([aeiou])$/,"$1s").replace(/([^s])$/,"$1s").replace("grg","GRG");};
const pedTxt=(a,q)=>{const e=envDe(a),n=e?Math.round(q/e):0;return fmtN(q)+" "+(a.ud||"ud")+(n?" ("+n+" "+envPl(a.envase,n)+")":"");};
/* artículos no críticos (p. ej. espumaderas): no avisan en Hoy ni en la campana; siguen en la lista de pedido */
const avisaDe=a=>a.sinAviso!==true;
function nivel(a){const st=dispDe(a),mn=+a.min||0;const pp=puntoPedido(a);if(!(pp>0)&&!(mn>0))return"na";if(st<mn)return"bad";if(st<=pp)return"warn";return"ok";}
const NIV={bad:"Crítico",warn:"Pedir",ok:"OK",na:"Sin mínimo"};

/* ---------- writes ---------- */
/* el catálogo es un solo documento: antes de guardarlo se mezcla con lo que haya guardado otra persona mientras tanto
   (lo que yo no he tocado se queda como lo dejó el otro; en listas con id, artículo a artículo), así no se pisan */
let catBase=null;
const jsEq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function merge3(b,l,s){if(jsEq(l,b))return s===undefined?l:s;if(s===undefined||jsEq(s,b))return l;if(jsEq(l,s))return l;
  const conId=x=>Array.isArray(x)&&x.every(o=>o&&typeof o==="object"&&!Array.isArray(o)&&o.id!=null);
  if(conId(b||[])&&conId(l)&&conId(s)){const B=new Map((b||[]).map(o=>[o.id,o])),L=new Map(l.map(o=>[o.id,o])),out=[],vis=new Set();
    s.forEach(o=>{vis.add(o.id);const lb=B.get(o.id),lo=L.get(o.id);if(!lo){if(lb)return;out.push(o);return;}out.push(lb?merge3(lb,lo,o):lo);});
    l.forEach(o=>{if(!vis.has(o.id)&&!B.has(o.id))out.push(o);});return out;}
  if(l&&s&&typeof l==="object"&&typeof s==="object"&&!Array.isArray(l)&&!Array.isArray(s)){const o={},bb=b&&typeof b==="object"?b:{};new Set([...Object.keys(l),...Object.keys(s)]).forEach(k=>{const v=merge3(bb[k],l[k],s[k]);if(v!==undefined)o[k]=v;});return o;}
  return l;}
async function saveCat(){if(!catOk){toast("El catálogo no se ha cargado bien: cierra y vuelve a abrir la app antes de guardar.");throw new Error("CAT_NO_CARGADO");}
  /* historial de precios: si cambia el precio de un artículo se guarda el anterior (para «qué ha subido de precio») */
  try{if(catBase&&catBase.articulos){const B=new Map(catBase.articulos.map(a=>[a.id,a]));const por=(window.yoNombre&&window.yoNombre())||"";(cat.articulos||[]).forEach(a=>{const o=B.get(a.id);if(!o)return;const de=parseN(o.precio),nu=parseN(a.precio);if(de>0&&nu>0&&Math.abs(de-nu)>1e-9&&JSON.stringify(o.ph||[])===JSON.stringify(a.ph||[]))a.ph=(a.ph||[]).concat([{f:hoy(),de,a:nu,por}]).slice(-20);});}}catch(e){}
  try{if(catBase&&db.doc("cat/app").get){try{const sn=await db.doc("cat/app").get();const srv=sn.exists?sn.data():null;if(srv&&!jsEq(srv,catBase)){const M=merge3(catBase,JSON.parse(JSON.stringify(cat)),srv);Object.keys(cat).forEach(k=>{if(!(k in M))delete cat[k];});Object.assign(cat,M);}}catch(e){}}
    await db.doc("cat/app").set(cat);catBase=JSON.parse(JSON.stringify(cat));}catch(e){toast("No se pudo guardar: "+(e&&e.message||"error"));throw e;}}
/* listas en un documento (averías, acciones, barras, tolvas, causas): se guardan solo los cambios con operaciones atómicas,
   así dos personas a la vez no se pisan (antes se reescribía la lista entera) */
async function listaGuarda(path,fn){const ref=db.doc(path),sn=await ref.get();const V=(sn.exists&&sn.data().items)||[];const N=fn(JSON.parse(JSON.stringify(V)));const [col,id]=path.split("/");
  if(db.itemsAdd&&db.itemsPatchId&&db.itemsDelId){const VM=new Map(V.map(x=>[x.id,x])),NM=new Map(N.map(x=>[x.id,x]));const add=N.filter(x=>!VM.has(x.id)),del=V.filter(x=>!NM.has(x.id)).map(x=>x.id),ch=N.filter(x=>VM.has(x.id)&&JSON.stringify(VM.get(x.id))!==JSON.stringify(x));
    if(add.length)await db.itemsAdd(col,id,add);if(ch.length)await db.itemsPatchId(col,id,ch);if(del.length)await db.itemsDelId(col,id,del);}
  else await ref.set({items:N});return N;}
async function addMov(rec){rec.id=rec.id||uid();rec.ts=Date.now();if(db.itemsAdd){await db.itemsAdd("mov",mesDe(rec.f),[rec]);return rec;}const ref=db.doc("mov/"+mesDe(rec.f)),sn=await ref.get();
  const items=sn.exists?(sn.data().items||[]).slice():[];items.push(rec);await ref.set({items});return rec;}
async function delMov(id,f){if(db.itemsDelId){await db.itemsDelId("mov",mesDe(f),[id]);return;}const ref=db.doc("mov/"+mesDe(f)),sn=await ref.get();if(!sn.exists)return;
  await ref.set({items:(sn.data().items||[]).filter(x=>x.id!==id)});}
async function addPists(list){const g={};list.forEach(r=>{r.id=r.id||uid();r.ts=Date.now();(g[r.f.slice(0,4)]=g[r.f.slice(0,4)]||[]).push(r);});for(const k of Object.keys(g)){if(db.itemsAdd)await db.itemsAdd("pist",k,g[k]);else{const ref=db.doc("pist/"+k),sn=await ref.get();await ref.set({items:(sn.exists?(sn.data().items||[]):[]).concat(g[k])});}}}
async function addPist(rec){rec.id=uid();rec.ts=Date.now();if(db.itemsAdd){await db.itemsAdd("pist",rec.f.slice(0,4),[rec]);return;}const ref=db.doc("pist/"+rec.f.slice(0,4)),sn=await ref.get();
  const items=sn.exists?(sn.data().items||[]).slice():[];items.push(rec);await ref.set({items});}
/* borrar un movimiento: si es la salida de un cambio de pistón, se borra también el cambio (si no, seguiría saliendo en el informe para Beatriz) */
const pistDeMov=id=>todosPist().find(p=>p.movId===id);
const txtBorraMov=m=>{const p=pistDeMov(m.id);return p?" También se borra el cambio de pistón ("+p.diam+" en "+maqN(p.maq)+"), así no sale en el informe para "+destPist().nom.split(" ")[0]+"."+(typeof avisoSAPBorrar==="function"?avisoSAPBorrar(p):""):"";};
async function borraMov(m){const p=pistDeMov(m.id);if(p)await delPist(p);else await delMov(m.id,m.f);}
async function delPist(p){if(db.itemsDelId)await db.itemsDelId("pist",p.f.slice(0,4),[p.id]);else{const ref=db.doc("pist/"+p.f.slice(0,4)),sn=await ref.get();if(!sn.exists)return;
  await ref.set({items:(sn.data().items||[]).filter(x=>x.id!==p.id)});}if(p.movId)await delMov(p.movId,p.f);try{await quitarPendPist(p.id);}catch(e){}}

/* ---------- dialogs ---------- */
/* ===== Botón «atrás» del móvil y del navegador (26/11/2026) =====
   Cada ficha o ventana que se abre deja un paso en el historial: «atrás» la cierra en vez de salir de la app.
   Sin nada abierto, «atrás» vuelve a la pantalla anterior: cada pantalla tiene su dirección (almacen.html#stock). */
let _ignPop=0,_ovN=0;
const _ovArriba=()=>{try{return history.state&&history.state.ov;}catch(e){return null;}};
function pilaAbre(ov){try{ov._id=++_ovN;history.pushState({ov:ov._id},"");ov._hist=true;}catch(e){}}
/* al cerrar con un botón, se quita su paso del historial, pero solo si es el de arriba (nunca se sale de la app) */
function pilaCierra(ov){if(!ov||!ov._hist)return;ov._hist=false;if(_ovArriba()===ov._id){_ignPop++;try{history.back();}catch(e){_ignPop--;}}}
/* quitar varias de golpe */
function quitaOvs(L){const arriba=_ovArriba();let suya=false;L.forEach(o=>{if(o._hist&&o._id===arriba)suya=true;o._hist=false;o.remove();});if(suya){_ignPop++;try{history.back();}catch(e){_ignPop--;}}}
window.addEventListener("popstate",()=>{if(_ignPop>0){_ignPop--;return;}
  const top=[...document.querySelectorAll(".dlg-ov,.bus-ov")].filter(o=>o._hist).pop();
  if(top){top._hist=false;if(top._cerrar)top._cerrar();else top.remove();return;}
  const h=location.hash.slice(1);if(h&&h!==tab&&esTab(h))irA(h,true);});
function dlg(title,body,actions){const ov=el("div",{class:"dlg-ov",role:"dialog","aria-modal":"true","aria-label":title});
  const close=()=>{ov.remove();document.removeEventListener("keydown",esc);pilaCierra(ov);};ov._cerrar=close;const esc=e=>{if(e.key==="Escape")close();};
  const box=el("div",{class:"dlg"},[el("h3",{text:title})].concat(Array.isArray(body)?body:[body]).concat([el("div",{class:"dlg-b"},actions.map(a=>{
    const b=el("button",{type:"button",class:"btn "+(a.cls||""),text:a.t});b.onclick=async()=>{if(a.fn){b.disabled=true;let r;try{r=await a.fn();}catch(e){r=false;}b.disabled=false;if(r===false)return;}close();};return b;}))]));
  ov.appendChild(box);ov.addEventListener("click",e=>{if(e.target===ov)close();});document.addEventListener("keydown",esc);document.body.appendChild(ov);pilaAbre(ov);
  const f=box.querySelector("input:not([type=checkbox]),select,textarea");if(f)setTimeout(()=>f.focus(),30);return close;}
/* «⋯ Más» : las acciones que no son las principales, en una lista al tocarlo */
function menuAcc(titulo,L,txt){return el("button",{type:"button",class:"btn sec acc-mas","aria-label":titulo,text:txt||"⋯ Más",onclick:()=>{
  dlg(titulo,[el("div",{class:"acc-menu"},L.map(([t,fn,id])=>el("button",Object.assign({type:"button",class:"btn sec",text:t,onclick:()=>{cerrarDlgs();setTimeout(fn,0);}},id?{id}:{}))))],[{t:"Cerrar",cls:"sec"}]);}});}
/* lo que se consulta de vez en cuando, plegado (se recuerda si lo dejas abierto) */
function masDatos(k,nodos,txt){const L=(nodos||[]).filter(Boolean);if(!L.length)return el("div");
  const d=el("details",{class:"mas-datos"},[el("summary",{text:txt||"Más datos"}),el("div",{class:"mas-datos-c"},L)]);
  try{if(localStorage.getItem("alm.md."+k)==="1")d.open=true;}catch(e){}
  d.addEventListener("toggle",()=>{try{localStorage.setItem("alm.md."+k,d.open?"1":"0");}catch(e){}});return d;}
function confirmar(t,msg,btn,fn){dlg(t,el("p",{text:msg}),[{t:"Cancelar",cls:"sec"},{t:btn,cls:"peligro",fn}]);}
function lightbox(src){const o=el("div",{class:"lightbox",role:"dialog","aria-label":"Foto del albarán",onclick:()=>o.remove()},el("img",{src,alt:"Foto del albarán"}));document.body.appendChild(o);}
function fotoUrl(id){return window.fotoUrlWeb?window.fotoUrlWeb(id):"/_blob/"+id;}

/* ---------- render ---------- */
let _pintando=false,_otraVez=false;
/* ===== Cada apartado se abre en su pantalla (27/11/2026) =====
   Los apartados que antes se desplegaban dentro de la página (las «etiquetas» con ▸ que ocupaban media pantalla)
   pasan a ser una fila con su título y «›»: al tocarla se abre ese apartado en una pantalla entera, con «‹» para volver.
   Se hace aquí, después de pintar, para que valga para todas las pantallas sin tocar cada una. No se tocan los filtros
   (se despliegan en el sitio a propósito) ni lo que va dentro de formularios o ventanas. */
/* partes de un apartado plegado: título, subtítulo y lo de dentro (si hay varias tarjetas, una pestaña por tarjeta) */
function partesDet(d){const sm=d.querySelector(":scope>summary");if(!sm)return null;
  const h=sm.querySelector("h2,h3,b"),tit=((h||sm).textContent||"").replace(/\s+/g," ").trim();if(!tit)return null;
  const so=sm.querySelector(".der,.sub");const sub=so&&so!==h?(so.textContent||"").trim():"";
  const kids=[...d.childNodes].filter(n=>n!==sm),cont=kids.filter(n=>n.nodeType===1);
  const grupo=cont.length===1&&cont[0].children.length>1&&[...cont[0].children].every(c=>c.matches("section,.card,details"))?[...cont[0].children]:null;
  const nomDe=c=>{const x=c.querySelector("h2,h3,summary");return x?(x.textContent||"").replace(/\s*\(\d+\)\s*$/,"").replace(/\s+/g," ").trim().slice(0,40):"";};
  return{tit,sub,partes:grupo?grupo.map((c,i)=>[nomDe(c)||("Parte "+(i+1)),[c]]):[["Todo",kids]]};}
function convDetalles(){const v=$("view");if(!v)return;
  v.querySelectorAll("details").forEach(d=>{if(!d.isConnected||d.matches(".filtro-pl,.ejs,.pz-nota,.cgrp")||d.closest("form,.filtro-pl,.ejs,.dlg,.op-ov,.dlg-ov"))return;
    const P=partesDet(d);if(!P)return;const {tit,sub}=P,clave=tab+"|"+tit;
    /* si su pantalla ya está abierta (y se ha vuelto a pintar por un cambio), se pone lo nuevo dentro */
    const ab=[...document.querySelectorAll(".op-ov")].find(o=>o._conv===clave);
    const abreDet=x=>x.querySelectorAll("details").forEach(z=>{if(!z.matches(".filtro-pl"))z.open=true;});
    if(ab&&ab._boxes&&ab._boxes.length===P.partes.length)P.partes.forEach(([,ns],i)=>{const bx=ab._boxes[i];bx.textContent="";ns.forEach(n=>bx.appendChild(n));abreDet(bx);});
    const b=el("button",{type:"button",class:"abre-pant"+(d.classList.contains("card")||d.classList.contains("mas-datos")||d.classList.contains("hoy-masdatos")?" card":""),"aria-haspopup":"dialog",
      onclick:()=>{const boxes=P.partes.map(([,ns])=>{const bx=el("div",{class:"abre-cont"});ns.forEach(n=>bx.appendChild(n));abreDet(bx);return bx;});
        const md=/^más datos\s*:\s*/i.test(tit);
        objPage({titulo:md?"Más datos de "+nomTab(tab).toLowerCase():tit,sub:md?cap(tit.replace(/^más datos\s*:\s*/i,"")):sub&&sub!==tit?sub:null,ruta:["Almacén",nomTab(tab)],volver:nomTab(tab),
          tabs:P.partes.map(([n],i)=>[n,[boxes[i]]]),alCerrar:()=>render(true)});
        const ov=[...document.querySelectorAll(".op-ov")].pop();if(ov){ov._conv=clave;ov._boxes=boxes;}}},
      [el("span",{class:"abre-tx"},[el("b",{text:tit}),sub&&sub!==tit?el("span",{class:"sub",text:sub}):null]),el("span",{class:"abre-fl","aria-hidden":"true",text:"›"})]);
    if(d.id)b.id=d.id;[...d.classList].filter(c=>!["card","plg"].includes(c)).forEach(c=>b.classList.add(c));
    d.replaceWith(b);});}
function render(force){if(_pintando){_otraVez=true;return;}_pintando=true;try{render0(force);}finally{_pintando=false;}if(_otraVez){_otraVez=false;render(true);return;}
  convDetalles();
  /* las pantallas abiertas encima (gasto, taller…) se vuelven a pintar con los datos nuevos */
  document.querySelectorAll(".op-ov").forEach(o=>{if(o._repinta)try{o._repinta();}catch(e){}});}
/* color y frase de cada pantalla (cabecera) */
const SEC_ALM={ronda:["marron","Contadores, pistones, granalla, aluminio y agua, en el orden de la vuelta"],gest:["gris","Qué gestores están en cada relevo"],aprob:["gris","Lo que necesita el visto bueno de Beatriz"],res:["azul","Lo que hay que hacer hoy y cómo va el mes"],rap:["rosa","Escribe o dicta lo que ha pasado y la app lo apunta"],consu:["rosa","Lo que sale del almacén hacia las máquinas"],
  stock:["gris","Lo que hay en cada almacén y punto de consumo"],repo:["morado","Lo que hay que bajar a planta para que no falte"],mas:["gris","Piezas, máquinas y gestión"],
  pist:["naranja","Cambios de pistón, usados y recuperados"],ejes:["indigo","Dónde está cada eje y sus reparaciones"],cont:["marron","Contenedores de cada tipo y dónde están"],
  btb:["azul","Barras expulsoras: stock, uso y recuperación"],btt:["azul","Tornillos tope: stock y uso"],bth:["granate","Recambios de horno y tolvas"],quim:["turquesa","Aceites, taladrinas y jabones, y sus contadores"],
  iny:["acero","Plano de inyectoras, material y moldes"],cons:["acero","Lo que gasta cada máquina"],mol:["acero","Moldes y en qué máquina están"],aver:["acero","Averías y sus causas"],
  bd:["gris","Pregúntale a la app lo que quieras saber"],desv:["gris","Consumos que se salen de lo normal"],abc:["gris","Qué artículos contar y cuándo"],mov:["gris","Todas las entradas, salidas y traslados"],reg:["gris","Quién cambió o borró qué y cuándo"],reglas:["gris","Tú pones la condición y la app avisa sola"],cat:["gris","Artículos, proveedores, máquinas y ajustes"]};
const secAlm=t=>SEC_ALM[t]||["gris",""];
function render0(force){const a=document.activeElement;
  if(!force&&a&&a.closest&&a.closest("#view")&&/^(INPUT|TEXTAREA)$/.test(a.tagName)&&a.type!=="file"&&a.type!=="checkbox"){pending=true;return;}
  pending=false;SM=stockMap();CONS=consMap();if(typeof ajustaAceites==="function")ajustaAceites();
  const al=artsActivos().filter(x=>{const n=nivel(x);return !x.pedido&&avisaDe(x)&&(n==="bad"||n==="warn");}).length;
  pintaCab(al);
  const v=$("view");const sc=document.querySelector("main").scrollTop;v.textContent="";
  if(!db){v.appendChild(el("div",{class:"banner",text:"No se pueden cargar los datos. Comprueba la conexión y vuelve a abrir la app."}));}
  if(!ready){v.appendChild(el("div",{class:"empty",text:"Cargando…"}));return;}
  if(!catOk){v.appendChild(el("div",{class:"banner b",text:"No se ha podido cargar el catálogo (¿sin cobertura?). Cierra y vuelve a abrir la app. Mientras tanto no se guarda nada en el catálogo para no borrarlo."}));}
  {const C=secAlm(tab);const grupo=(MENU_PC.find(([g,ks])=>g&&ks.includes(INY_SUB.some(x=>x[0]===tab)?"iny":tab))||[])[0];
    v.appendChild(cabeceraPg({ruta:["Almacén",PADRE[tab]==="res"?{t:"Hoy",fn:()=>irA("res")}:PADRE[tab]?(grupo||{t:"Más",fn:()=>irA("mas")}):null],titulo:nomTab(tab),sub:C[1],color:C[0],icono:svgPg(ICO[tab]||ICO_AR[tab==="btt"?"btb":tab]||ICO[PADRE[tab]]||ICO.mas),vista:v}));}
  if(PADRE[tab])v.appendChild(el("button",{type:"button",class:"volver",text:PADRE[tab]==="res"?"‹ Hoy":"‹ Más",onclick:()=>irA(PADRE[tab])}));
  if(INY_SUB.some(x=>x[0]===tab))v.appendChild(el("div",{class:"seg",role:"tablist","aria-label":"Inyectoras",style:"display:grid;grid-template-columns:repeat(auto-fit,minmax(84px,1fr));gap:6px"},INY_SUB.map(([k,t])=>el("button",{type:"button","aria-pressed":String(tab===k),text:t,onclick:()=>irA(k)}))));
  (VC[tab]||{ronda:v=>vRonda(v),gest:vGest,aprob:vAprob,reglas:vReglas,reg:vRegAlm,abc:vABC,aver:vAver,res:vRes,rap:vRap,consu:v=>{draft.m.tipo="salida";vMov(v,true);},stock:vStock,repo:vRepo,iny:vIny,mol:vMol,bd:vBD,cont:v=>vSecc("cont",v),cons:vCons,mat:v=>{draft.rv="mat";vRepo(v);},btb:v=>vSecc("btb",v),btt:v=>vSecc("btt",v),bth:v=>vSecc("bth",v),quim:v=>vSecc("quim",v),mov:vMov,pist:v=>vSecc("pist",v),ejes:v=>vSecc("ejes",v),bt:v=>vBT(v,"barra"),cat:vCat,mas:vMas,consultas:vBD,desv:vDesv}[tab])(v);
  if(typeof barraRonda==="function")try{barraRonda(v);}catch(e){console.warn(e);}
  if(typeof panelizar==="function")try{panelizar(v);}catch(e){console.warn(e);}
  document.querySelector("main").scrollTop=sc;kpiInicio();campanaAlm();}
/* campana de avisos: lo mismo que «Qué hacer hoy» (se recalcula como mucho cada 2 s) */
let _cmpT=null;function campanaAlm(){if(!window.campana||!ready)return;clearTimeout(_cmpT);_cmpT=setTimeout(()=>{try{const H=tareasHoy();
  campana.pon("almacen",H.tareas.map(t=>({niv:t.niv,t:t.txt,d:t.det&&t.det.length>90?t.det.slice(0,88)+"…":t.det,fn:t.fn})));
  try{escuchaMenc();campana.pon("menc",itemsMenc());}catch(e){}
  try{campana.pon("aprob",APR().campana(()=>irA("aprob")));APR().avisaNuevos();}catch(e){}
  if(PEND_FICHA&&catOk){const c=PEND_FICHA;PEND_FICHA=null;try{history.replaceState(null,"",location.pathname);}catch(e){}setTimeout(()=>abrirFichaClave(c),200);}}catch(e){try{campana.repinta();}catch(e2){}}},2000);}
document.addEventListener("focusout",()=>setTimeout(()=>{if(pending)render();},0));
function irA(t,desdeAtras){if(!esTab(t)){try{localStorage.setItem("almacen.tab",t);}catch(e){}location.href="almacen.html";return;}if(t!==tab&&draft.st)delete draft.st[t];tab=t;
  /* cambiar de pantalla cierra lo que hubiera abierto encima y deja la dirección de la pantalla para «atrás» */
  if(!desdeAtras){document.querySelectorAll(".dlg-ov,.bus-ov").forEach(o=>{o._hist=false;o.remove();});try{if(location.hash!=="#"+t)history.pushState({t},"","#"+t);}catch(e){}}try{localStorage.setItem((window.APP_ID||"almacen")+(VC[t]?".tabC":".tab"),t);}catch(e){}tabsUI();render(true);document.querySelector("main").scrollTop=0;}
const ICO={res:'<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',rap:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',consu:'<path d="M12 20V8M7 13l5-5 5 5"/><path d="M5 4h14"/>',stock:'<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',repo:'<path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/>',mas:'<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>'};
const nomTab=t=>{const x=TABS.concat(SUB).find(z=>z[0]===t)||INY_SUB.find(z=>z[0]===t);return x?x[1]:"Almacén";};
function pintaCab(al){const h=$("hTit");if(!h)return;h.firstChild.textContent="Almacén";const sb=$("hSub");
  sb.textContent=cap(new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}));
  /* las cifras (para pedir, a planta) ya salen en Hoy: arriba solo el nombre y la fecha */
  const c=$("hChips");c.textContent="";}
/* menú del ordenador y del iPad: todo a la vista, por grupos (en el móvil, la barra de abajo y «Más») */
const MENU_PC=[[null,["res","rap","ronda"]],["Almacén",["stock","repo","mov","abc"]],["Piezas",["pist","ejes","quim","btb","btt","bth","cont"]],["Máquinas",["iny","mol","aver"]],["Análisis",["bd","desv"]],["Gestión",["cat","gest","aprob","reglas","reg"]]];
const ICO_M={ronda:'<path d="M3 12h4l3-6 4 12 3-6h4"/>',mov:'<path d="M4 7h16M4 12h16M4 17h10"/>',abc:'<path d="M9 5h11M9 12h11M9 19h11"/><path d="M4 5l1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2"/>',btt:'<path d="M5 19 19 5"/><path d="M14 5h5v5"/>',
  iny:'<rect x="3" y="7" width="14" height="10" rx="1.5"/><path d="M17 10h4v4h-4M7 7V4h6v3"/>',mol:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4v16M4 12h5"/>',bd:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',desv:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  cat:'<path d="M5 3h14v18H5z"/><path d="M9 8h6M9 12h6M9 16h4"/>',gest:'<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .8 3 2.8 3 6"/>',aprob:'<path d="M5 12l4 4 10-10"/>',reglas:'<path d="M4 6h10M4 12h16M4 18h7"/><circle cx="18" cy="6" r="2"/><circle cx="15" cy="18" r="2"/>',reg:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>'};
const icoMenu=k=>(typeof ICO!=="undefined"&&ICO[k])||(typeof ICO_AR!=="undefined"&&ICO_AR[k==="btt"?"btb":k])||ICO_M[k]||ICO.mas;
function menuPC(){const sel=k=>tab===k||(k==="iny"&&INY_SUB.some(x=>x[0]===tab))||(k==="rap"&&tab==="consu");
  return el("div",{class:"menu-pc"},MENU_PC.map(([g,ks])=>el("div",{class:"menu-g"},[g?el("span",{class:"menu-gt",text:g}):null].concat(ks.filter(k=>esTab(k)).map(k=>{
    const b=el("button",{type:"button","data-t":k,"aria-current":sel(k)?"page":null,onclick:()=>irA(k)});b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icoMenu(k)+"</svg>";
    b.appendChild(el("span",{text:k==="rap"?"Apuntar":nomTab(k)}));return b;})))));}
function tabsUI(){const n=$("tabs");n.textContent="";n.classList.toggle("muchas",TABS.length>7);TABS.filter(([id])=>id!=="consu"||TABS.length<6).forEach(([id,t])=>{const b=el("button",{type:"button","data-t":id,"aria-selected":String(tab===id||PADRE[tab]===id||(id==="rap"&&tab==="consu"&&TABS.length>=6)),onclick:()=>irA(id)});b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICO[id]||"")+"</svg>";b.appendChild(el("span",{text:t}));n.appendChild(b);
    /* en el menú lateral (ordenador e iPad), lo de «Más» sale desplegado debajo: piezas, máquinas y gestión */
    if(false&&id==="mas")n.appendChild(el("div",{class:"sub-mas"},SUB_G.map(([g,ks])=>{const ab=subAbierto(g,ks);
      const lst=el("div",{class:"sub-it",hidden:!ab},ks.map(k=>{const x=SUB.find(z=>z[0]===k);if(!x)return null;
        return el("button",{type:"button","data-t":k,"aria-selected":String(tab===k),onclick:()=>irA(k)},[el("span",{text:x[1]})]);}).filter(Boolean));
      const bt=el("button",{type:"button",class:"sub-gt","aria-expanded":String(ab),onclick:()=>{const a=lst.hidden;lst.hidden=!a;bt.setAttribute("aria-expanded",String(a));subGuarda(g,a);}},[el("span",{text:g})]);
      return el("div",{class:"sub-g"},[bt,lst]);})));});
  if(TABS[0]&&TABS[0][0]==="res")n.appendChild(menuPC());
  const sb=n.querySelector("[aria-selected=true]");if(sb&&n.scrollWidth>n.clientWidth)setTimeout(()=>{try{sb.scrollIntoView({inline:"center",block:"nearest"});}catch(e){}},0);}

/* ===== CONSULTAS: preguntas con filtros sobre pistones, ejes y material ===== */
const Q_QUE=[["pist","Cambios de pistón"],["rep","Reparaciones de ejes"],["mat","Consumo de material"],["gasto","Todo el gasto"]];
const Q_PER=[["mes","Este mes"],["mesant","Mes pasado"],["3m","3 meses"],["ano","Este año"],["12m","12 meses"],["todo","Todo"],["rango","Fechas…"]];
const Q_GRP={maq:"Máquina",zona:"Zona",mes:"Mes",motivo:"Motivo",modelo:"Modelo de eje",eje:"Eje",diam:"Diámetro de pistón",art:"Artículo",resp:"Responsable",tipo:"Tipo",det:"Sin agrupar (cada registro)"};
const Q_ORD={n:"Más veces",cant:"Más cantidad",eur:"Más gasto",clave:"Por nombre / fecha"};
const Q_PRE=[
  {nom:"Pistones por máquina",q:{que:"pist",per:"12m",grp:"maq",ord:"cant"}},
  {nom:"Reparaciones más caras",q:{que:"rep",per:"todo",grp:"det",ord:"eur"}},
  {nom:"Ejes que más se reparan",q:{que:"rep",per:"todo",grp:"eje",ord:"n"}},
  {nom:"Cambios por CAMBIO REF",q:{que:"pist",per:"12m",grp:"maq",ord:"cant",motivo:"Cambio ref"}},
  {nom:"Gasto en ejes por máquina",q:{que:"rep",per:"ano",grp:"maq",ord:"eur"}},
  {nom:"Pistones por motivo",q:{que:"pist",per:"12m",grp:"motivo",ord:"cant"}},
  {nom:"Gasto por mes",q:{que:"gasto",per:"12m",grp:"mes",ord:"clave"}}];
const Q0=()=>({que:"pist",per:"12m",d:"",h:"",maq:"",zona:"",motivo:"",txt:"",grp:"maq",ord:"cant"});
function qPer(q){const hy=hoy(),y=hy.slice(0,4),m=hy.slice(0,7);
  if(q.per==="mes")return{d:m+"-01",h:hy};
  if(q.per==="mesant"){const p=sumaDias(m+"-01",-1);return{d:p.slice(0,7)+"-01",h:p};}
  if(q.per==="3m")return{d:sumaDias(hy,-91),h:hy};
  if(q.per==="ano")return{d:y+"-01-01",h:hy};
  if(q.per==="12m")return{d:sumaDias(hy,-365),h:hy};
  if(q.per==="rango")return{d:q.d||"2000-01-01",h:q.h||hy};
  return{d:"2000-01-01",h:"2999-12-31"};}
function qPerTxt(q){const P=qPer(q);if(q.per==="todo")return"todo el histórico";return fmtF(P.d)+" a "+fmtF(P.h);}
const maqCod=id=>{const m=cat.maquinas.find(x=>x.id===id||x.cod===id);return m?m.cod:(id||"");};
const zonaCod=cod=>{const m=cat.maquinas.find(x=>x.cod===cod);return m?zonaDe(m):"";};
/* todos los registros convertidos a una misma forma */
function qHechos(que){const out=[];
  if(que==="pist"||que==="gasto")todosPist().forEach(p=>{const c=+p.cant||1,pa=pistArt(p.diam),pr=precioDe(pa),mc=maqCod(p.maq);
    out.push({tipo:"Cambio de pistón",f:p.f,maq:mc,zona:zonaCod(mc),motivo:cap(p.motivo||"")||"—",diam:p.diam||"",art:"Pistón "+(p.diam||"?"),modelo:"",eje:"",resp:p.resp?respTxt(p.resp):"",cant:c,ud:"ud",eur:c*pr,sinP:!pr,nota:p.nota||""});});
  if(que==="rep"||que==="gasto")todasRep().filter(r=>r.res!=="anulada"&&!r.recuento).forEach(r=>{const mod=modeloDeEje(r.eje),md=modelo(mod);let mc=r.maq?maqCod(r.maq):"",varias=false;
    if(!mc&&md){const ii=inyDe(md);if(ii.length===1)mc=ii[0];else if(ii.length>1){mc=ii.join("/");varias=true;}}
    const c=costeRep(r);const est=r.res==="ok"?"Reparado":r.res?cap(r.res):r.env?"En el taller":"Preparado para enviar";
    out.push({tipo:"Reparación de eje",f:r.env||r.alta||"",maq:mc,varias,zona:varias?"":zonaCod(mc),motivo:cap(String(r.desp||"").trim())||"—",diam:md&&md.diamP?"Ø "+md.diamP:"",art:md?md.ref:mod,modelo:md?md.ref+" ("+mod+")":mod,eje:r.eje,resp:"",cant:1,ud:"eje",eur:c.v,sinP:!c.v,estado:est,origen:c.o,nota:r.obs||""});});
  if(que==="mat"||que==="gasto")todosMov().filter(x=>x.tipo==="salida"&&!/^Cambio de pistón/.test(x.nota||"")).forEach(x=>{const a=art(x.art),c=+x.cant||0,pr=precioDe(a),mc=x.maq?maqCod(x.maq):"";
    out.push({tipo:"Consumo de material",f:x.f,maq:mc,zona:mc?zonaCod(mc):(x.nave||""),motivo:cap(x.motivo||"")||"—",diam:a&&a.diam||"",art:a?(TEC(a.fam)?nomBT(a):a.desc):"(artículo borrado)",modelo:"",eje:"",resp:x.resp?respTxt(x.resp):"",cant:c,ud:a?a.ud:"",eur:c*pr,sinP:!pr,fam:a?FAM[a.fam]:"",nota:x.nota||""});});
  return out;}
function qFiltra(q){const P=qPer(q),t=norm(q.txt||"");
  return qHechos(q.que).filter(h=>h.f>=P.d&&h.f<=P.h&&(!q.maq||h.maq===q.maq||(h.varias&&h.maq.split("/").includes(q.maq)))&&(!q.zona||h.zona===q.zona)&&(!q.motivo||h.motivo===q.motivo)
    &&(!t||norm([h.art,h.modelo,h.eje,h.motivo,h.resp,h.nota,h.maq].join(" ")).includes(t)));}
function qClave(h,g){if(g==="mes")return h.f.slice(0,7);if(g==="det")return null;return h[g]||"(sin dato)";}
function qAgrupa(L,q){const G={};L.forEach(h=>{const k=qClave(h,q.grp);const x=G[k]=G[k]||{k,n:0,cant:0,eur:0,sinP:0,varias:0,L:[]};x.n++;x.cant+=h.cant;x.eur+=h.eur;if(h.sinP)x.sinP++;if(h.varias)x.varias++;x.L.push(h);});
  const R=Object.values(G);const o=q.ord;R.sort((a,b)=>o==="clave"?String(a.k).localeCompare(String(b.k),"es",{numeric:true}):(b[o]-a[o])||(b.n-a.n));return R;}
function qOrdDet(L,q){const o=q.ord;return L.slice().sort((a,b)=>o==="clave"?a.f.localeCompare(b.f):o==="n"?b.f.localeCompare(a.f):(b[o]-a[o])||b.f.localeCompare(a.f));}
const qEur=v=>v?eur(v):"—";
function qNomGrupo(k,g){return g==="mes"?cap(fmtMes(k)):k;}
function vConsultas(v){const q=draft.q=draft.q||Q0();const re=()=>{draft.qPre=null;render(true);};
  /* consulta rápida: rellena el formulario, la marca y baja hasta el resultado */
  const usa=(p,id)=>{draft.q=Object.assign(Q0(),p.q);draft.qPre=id;render(true);
    setTimeout(()=>{const k=document.querySelector("#view .kpis");if(k)try{k.scrollIntoView({behavior:"smooth",block:"start"});}catch(e){k.scrollIntoView();}},60);};
  const guard=cat.consultas||[];
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Consultas rápidas"})),el("div",{class:"bd"},[
    el("div",{style:"display:flex;flex-wrap:wrap;gap:6px"},Q_PRE.map(p=>el("button",{type:"button",class:"chip","aria-pressed":String(draft.qPre==="pre:"+p.nom),text:p.nom,onclick:()=>usa(p,"pre:"+p.nom)}))
      .concat(guard.map(p=>el("span",{style:"display:inline-flex;gap:2px"},[el("button",{type:"button",class:"chip","aria-pressed":"true",text:"★ "+p.nom,onclick:()=>usa(p,"g:"+p.id)}),
        el("button",{type:"button",class:"chip","aria-label":"Borrar «"+p.nom+"»",text:"×",onclick:()=>confirmar("¿Borrar la consulta?","«"+p.nom+"» deja de salir en Consultas rápidas.","Borrar",async()=>{cat.consultas=(cat.consultas||[]).filter(x=>x.id!==p.id);await saveCat();re();})})]))))])]));
  /* formulario */
  const todos=qHechos(q.que);const motivos=[...new Set(todos.map(h=>h.motivo))].filter(x=>x&&x!=="—").sort((a,b)=>a.localeCompare(b,"es"));
  const zonas=[...new Set(cat.maquinas.map(m=>zonaDe(m)))].sort();
  const grps=Object.keys(Q_GRP).filter(g=>q.que==="gasto"||!({pist:["modelo","eje"],rep:["resp","diam"],mat:["modelo","eje"]}[q.que]||[]).includes(g));
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Consulta"})),el("div",{class:"bd frm",style:"gap:12px"},[
    el("div",{class:"seg seg-q",role:"group","aria-label":"Qué consultar"},Q_QUE.map(([k,t])=>el("button",{type:"button","aria-pressed":String(q.que===k),text:t,onclick:()=>{q.que=k;q.motivo="";if(!grps.includes(q.grp))q.grp="maq";re();}}))),
    el("div",{class:"chips chips-per",role:"group","aria-label":"Periodo"},Q_PER.map(([k,t])=>el("button",{type:"button",class:"chip","aria-pressed":String(q.per===k),text:t,onclick:()=>{q.per=k;re();}}))),
    q.per==="rango"?el("div",{class:"row"},[fld("Desde",inp("qD",q.d,x=>{q.d=x;render();},{type:"date"})),fld("Hasta",inp("qH",q.h,x=>{q.h=x;render();},{type:"date"}))]):null,
    el("div",{class:"row"},[fld("Máquina",sel("qM",cat.maquinas.slice().sort((a,b)=>a.cod.localeCompare(b.cod,"es",{numeric:true})).map(m=>[m.cod,m.cod]),q.maq,x=>{q.maq=x;re();},"Todas")),
      fld("Zona",sel("qZ",zonas.map(z=>[z,z]),q.zona,x=>{q.zona=x;re();},"Todas")),
      fld("Motivo",sel("qMo",motivos.map(z=>[z,z]),q.motivo,x=>{q.motivo=x;re();},"Todos"))]),
    fld("Buscar (artículo, eje, responsable…)",inp("qT",q.txt,x=>{q.txt=x;render();},{type:"search",autocomplete:"off",placeholder:"p. ej. 90 esp, 2.8.J, Josu"})),
    el("div",{class:"row"},[fld("Agrupar por",sel("qG",grps.map(g=>[g,Q_GRP[g]]),q.grp,x=>{q.grp=x;re();})),fld("Ordenar",sel("qO",Object.entries(Q_ORD),q.ord,x=>{q.ord=x;re();}))])])]));
  /* resultado */
  const L=qFiltra(q);const tot={n:L.length,cant:L.reduce((t,h)=>t+h.cant,0),eur:L.reduce((t,h)=>t+h.eur,0),sinP:L.filter(h=>h.sinP).length,varias:L.filter(h=>h.varias).length};
  const titulo=(Q_QUE.find(x=>x[0]===q.que)||[])[1]+(q.maq?" · "+q.maq:"")+(q.zona?" · "+q.zona:"")+(q.motivo?" · "+q.motivo:"")+(q.txt?" · «"+q.txt+"»":"");
  v.appendChild(el("dl",{class:"kpis num"},[["Registros",fmtN(tot.n)],[q.que==="rep"?"Ejes":"Cantidad",fmtN(tot.cant)],["Gasto",qEur(tot.eur)],["Media",tot.n&&tot.eur?eur(tot.eur/tot.n):"—"]].map(([a,b])=>el("div",{},[el("dt",{text:a}),el("dd",{text:b})]))));
  if(tot.sinP)v.appendChild(el("div",{class:"banner",style:"display:grid;gap:6px"},[el("span",{text:tot.sinP+" de "+tot.n+" registros no tienen precio y no suman en el gasto."+(L.some(h=>h.sinP&&h.tipo==="Cambio de pistón")?" Los pistones no tienen precio puesto.":"")}),
    L.some(h=>h.sinP&&h.tipo==="Cambio de pistón")?el("div",{},el("button",{type:"button",class:"btn sec peq",text:"Poner precios de pistones",onclick:preciosPist})):null]));
  if(tot.varias)v.appendChild(el("p",{class:"hint",text:tot.varias+" reparaciones son de un modelo de eje que llevan varias máquinas (salen como «F27/F56»). Desde ahora cada reparación guarda de qué máquina sale el eje."}));
  const acc=el("div",{class:"acciones"},[el("button",{type:"button",class:"btn sec",text:"Descargar Excel",onclick:e=>qExcel(q,L,titulo,e.currentTarget)}),
    el("button",{type:"button",class:"btn sec",text:"Guardar consulta",onclick:()=>{const i=el("input",{type:"text",value:titulo,"aria-label":"Nombre"});dlg("Guardar consulta",[el("p",{class:"hint",text:"Saldrá en Consultas rápidas, siempre con los datos del día."}),i],[{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{const nom=i.value.trim();if(!nom){toast("Ponle un nombre");return false;}const qq=Object.assign({},q);cat.consultas=(cat.consultas||[]).concat([{id:uid(),nom,q:qq}]);await saveCat();toast("Consulta guardada");re();}}]);}})]);
  v.appendChild(acc);
  if(!L.length){v.appendChild(el("p",{class:"empty",text:"No hay nada con estos filtros en "+qPerTxt(q)+"."}));return;}
  qGraficos(v,q,L,titulo);
  const sub=el("p",{class:"sub",text:titulo+" · "+qPerTxt(q)});
  if(q.grp==="det"){const D=qOrdDet(L,q).slice(0,300);
    v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Detalle ("+L.length+")"})),el("div",{style:"padding:0 14px"},sub),qTablaDet(D),L.length>300?el("p",{class:"hint",style:"padding:8px 14px",text:"Se ven los 300 primeros; el Excel lleva todos."}):null]));return;}
  const R=qAgrupa(L,q);const mx=Math.max(...R.map(r=>q.ord==="eur"?r.eur:q.ord==="n"?r.n:r.cant),1);
  v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Por "+Q_GRP[q.grp].toLowerCase()+" ("+R.length+")"})]),el("div",{style:"padding:0 14px"},sub),
    el("div",{class:"lst"},R.slice(0,100).map(r=>{const val=q.ord==="eur"?r.eur:q.ord==="n"?r.n:r.cant;
      return el("button",{type:"button",class:"it",onclick:()=>qDetDlg(qNomGrupo(r.k,q.grp)+" · "+titulo,r.L,q)},[
        el("div",{class:"ppal"},[el("div",{class:"t1",text:qNomGrupo(r.k,q.grp)}),
          el("div",{style:"height:6px;border-radius:3px;background:var(--acc,#2F5D46);opacity:.75;margin:4px 0;width:"+Math.max(2,Math.round(val/mx*100))+"%"}),
          el("div",{class:"t2",text:[r.n+(r.n===1?" vez":" veces"),q.que!=="rep"?fmtN(r.cant)+" "+(r.L[0].ud||"ud"):null,r.sinP?r.sinP+" sin precio":null].filter(Boolean).join(" · ")})]),
        el("div",{class:"cant num"},[el("b",{text:q.ord==="eur"||q.que==="rep"?qEur(r.eur):fmtN(r.cant)}),el("small",{text:q.ord==="eur"||q.que==="rep"?(r.n+" reg."):qEur(r.eur)})])]);}))]));}
/* gráficos de la consulta: evolución por mes y reparto por el grupo elegido */
function qGraficos(v,q,L,titulo){if(!window.GRAF)return;
  const conEur=L.some(h=>h.eur>0),fmt=conEur?"eur":"n",val=h=>conEur?h.eur:(q.que==="mat"?h.cant:1);
  const nomVal=conEur?"Gasto":q.que==="mat"?"Cantidad":"Veces";
  const meses=[...new Set(L.map(h=>h.f.slice(0,7)))].sort();
  /* meses seguidos aunque alguno no tenga datos */
  const M=[];if(meses.length){let [y,m]=meses[0].split("-").map(Number);const fin=meses[meses.length-1];for(let k=0;k<36;k++){const t=y+"-"+String(m).padStart(2,"0");M.push(t);if(t>=fin)break;m++;if(m>12){m=1;y++;}}}
  const porGrupo=q.grp!=="mes"&&q.grp!=="det";
  let pilas;if(porGrupo){const R=qAgrupa(L,Object.assign({},q,{ord:conEur?"eur":"cant"}));const top=R.slice(0,5).map(r=>r.k);pilas=top.map(k=>[qNomGrupo(k,q.grp),h=>qClave(h,q.grp)===k]);if(R.length>5)pilas.push(["Resto",h=>!top.includes(qClave(h,q.grp))]);}
  else if(q.que==="gasto")pilas=[...new Set(L.map(h=>h.tipo))].map(t=>[t,h=>h.tipo===t]);
  else pilas=[[nomVal,()=>true]];
  const secs=[];
  if(M.length>=2){const g=el("div");secs.push(el("div",{},[el("h3",{class:"g-tit",text:nomVal+" por mes"}),g]));
    setTimeout(()=>GRAF.barras(g,{x:M.map(m=>{const[y,mm]=m.split("-");return MESES[+mm-1].slice(0,3)+" "+y.slice(2);}),apilado:true,fmt,series:pilas.map(([n,f])=>({name:n,data:M.map(m=>Math.round(L.filter(h=>h.f.slice(0,7)===m&&f(h)).reduce((t,h)=>t+val(h),0)*100)/100)}))}),0);}
  if(porGrupo){const R=qAgrupa(L,Object.assign({},q,{ord:conEur?"eur":"cant"})).slice(0,12);if(R.length>1){const g=el("div");
    secs.push(el("div",{},[el("h3",{class:"g-tit",text:nomVal+" por "+Q_GRP[q.grp].toLowerCase()+(R.length===12?" (los 12 primeros)":"")}),g,el("p",{class:"hint",text:"Toca una barra para ver el detalle."})]));
    setTimeout(()=>GRAF.barras(g,{x:R.map(r=>qNomGrupo(r.k,q.grp)),horizontal:true,fmt,series:[{name:nomVal,data:R.map(r=>Math.round((conEur?r.eur:q.que==="mat"?r.cant:r.n)*100)/100)}],
      alClick:i=>qDetDlg(qNomGrupo(R[i].k,q.grp)+" · "+titulo,R[i].L,q)}),0);}}
  if(secs.length)v.appendChild(el("section",{class:"card"},[el("div",{class:"hd"},el("h2",{text:"Gráficos"})),el("div",{class:"bd",style:"display:grid;gap:14px"},secs)]));}
function qTablaDet(D){return el("div",{class:"tw"},el("table",{},[el("thead",{},el("tr",{},[el("th",{text:"Fecha"}),el("th",{text:"Máquina"}),el("th",{text:"Qué"}),el("th",{text:"Motivo"}),el("th",{class:"r",text:"Cant."}),el("th",{class:"r",text:"€"})])),
  el("tbody",{},D.map(h=>el("tr",{},[el("td",{class:"num",text:fmtF(h.f)}),el("td",{text:h.maq||(h.zona||"—")}),el("td",{text:h.tipo==="Reparación de eje"?h.eje+" · "+h.art+(h.estado&&h.estado!=="Reparado"?" ("+h.estado.toLowerCase()+")":""):h.art}),el("td",{text:h.motivo}),el("td",{class:"r num",text:fmtN(h.cant)}),el("td",{class:"r num",text:qEur(h.eur)})])))]));}
function qDetDlg(t,L,q){dlg(t,[el("p",{class:"sub",text:L.length+" registros · "+fmtN(L.reduce((s,h)=>s+h.cant,0))+" · "+qEur(L.reduce((s,h)=>s+h.eur,0))}),qTablaDet(qOrdDet(L,q).slice(0,300))],[{t:"Cerrar",cls:"sec"}]);
  const bx=document.querySelectorAll(".dlg");if(bx.length)bx[bx.length-1].style.maxWidth="760px";}
async function qExcel(q,L,titulo,btn){if(!downloads){toast("Esta vista no permite descargar archivos");return;}btn.disabled=true;
  try{await cargarXLSX();const X=window.XLSX,wb=X.utils.book_new();const r2=v=>Math.round(v*100)/100;
    const cab=[["Consulta",titulo],["Periodo",qPerTxt(q)],["Agrupado por",Q_GRP[q.grp]],["Registros",L.length],["Gasto (€)",r2(L.reduce((t,h)=>t+h.eur,0))],["Sin precio (no suman)",L.filter(h=>h.sinP).length]];
    const w0=X.utils.aoa_to_sheet(cab);w0["!cols"]=[{wch:24},{wch:60}];X.utils.book_append_sheet(wb,w0,"Consulta");
    if(q.grp!=="det")X.utils.book_append_sheet(wb,X.utils.json_to_sheet(qAgrupa(L,q).map(r=>({[Q_GRP[q.grp]]:qNomGrupo(r.k,q.grp),"Veces":r.n,"Cantidad":r2(r.cant),"Gasto (€)":r2(r.eur),"Sin precio":r.sinP}))),"Resumen");
    X.utils.book_append_sheet(wb,X.utils.json_to_sheet(qOrdDet(L,q).map(h=>({"Fecha":h.f,"Tipo":h.tipo,"Máquina":h.maq,"Zona":h.zona,"Artículo / modelo":h.art,"Eje":h.eje,"Ø":h.diam,"Motivo":h.motivo,"Responsable":h.resp,"Cantidad":h.cant,"Unidad":h.ud,"Gasto (€)":r2(h.eur),"Estado":h.estado||"","Notas":h.nota}))),"Detalle");
    await downloads.save({filename:"Consulta "+titulo.replace(/[\\/:*?"<>|«»]/g,"").slice(0,60)+".xlsx",data:new Blob([X.write(wb,{bookType:"xlsx",type:"array"})])});toast("Excel descargado");}
  catch(e){toast("No se pudo crear el Excel");}btn.disabled=false;}
/* poner precio a varios artículos de golpe (los que se han usado sin precio) */
function preciosArts(L,despues){const val={};L.forEach(a=>{val[a.id]=a.precio||"";});
  dlg("Precios (€ por "+(L.every(a=>(a.ud||"ud")==="ud")?"unidad":"unidad de cada uno")+")",[el("p",{class:"hint",text:"Con el precio puesto, la ficha de la máquina, las consultas y los informes calculan el gasto en euros."}),
    el("div",{style:"display:grid;gap:8px"},L.map(a=>fld(nomArt(a)+" (€/"+(a.ud||"ud")+")",inp("pa"+a.id,val[a.id],v=>val[a.id]=v,{inputmode:"decimal",class:"num",placeholder:"€"}))))],
   [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{let n=0;for(const a0 of L){const s=String(val[a0.id]||"").trim();const p=s?parseN(s):NaN;if(s&&!(p>=0)){toast("Precio no válido en "+nomArt(a0));return false;}const a=art(a0.id);const nue=s?String(p):null;if(a&&(a.precio||null)!==nue){a.precio=nue;n++;}}
     if(n)await saveCat();toast(n?"Precios guardados":"Sin cambios");render(true);if(despues)despues();}}]);}
function preciosPist(){const P=DIAM.map(d=>({d,a:pistArt(d)})).filter(x=>x.a);const val={};P.forEach(x=>{val[x.a.id]=x.a.precio||"";});
  dlg("Precios de pistones (€ por unidad)",[el("p",{class:"hint",text:"Con el precio puesto, las consultas y los informes calculan el gasto en euros."}),
    el("div",{style:"display:grid;grid-template-columns:1fr 1fr;gap:8px"},P.map(x=>fld(x.d,inp("pp"+x.a.id,val[x.a.id],v=>val[x.a.id]=v,{inputmode:"decimal",class:"num",placeholder:"€"}))))],
   [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{let n=0;for(const x of P){const s=String(val[x.a.id]||"").trim();const p=s?parseN(s):NaN;if(s&&!(p>=0)){toast("Precio no válido en "+x.d);return false;}const a=art(x.a.id);const nue=s?String(p):null;if((a.precio||null)!==nue){a.precio=nue;n++;}}
     if(n)await saveCat();toast(n?"Precios guardados":"Sin cambios");render(true);}}]);}

