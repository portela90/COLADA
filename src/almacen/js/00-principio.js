
(function(){
"use strict";
const TABS=[["res","Hoy"],["rap","Apuntar"],["stock","Stock"],["repo","Reponer"],["mas","Más"]];
const SUB=[["pist","Pistones"],["ejes","Ejes"],["iny","Inyectoras"],["mov","Movimientos"],["consultas","Análisis"],["bt","Recambios"],["cat","Catálogo"]];
const PADRE={consultas:"mas",pist:"mas",ejes:"mas",mov:"mas",bt:"mas",cat:"mas",iny:"mas",mat:"mas",cons:"mas",mol:"mas"};
/* lo que era la app Inyectoras: cuatro pantallas dentro de Más › Inyectoras */
const INY_SUB=[["iny","Plano"],["mat","Material"],["cons","Consumos"],["mol","Moldes"]];
const esTab=t=>TABS.some(x=>x[0]===t)||SUB.some(x=>x[0]===t)||INY_SUB.some(x=>x[0]===t);
const FAM={consumible:"Consumible",piston:"Pistón",barra:"Barra expulsora",tornillo:"Tornillo tope",horno:"Recambio de horno",eje:"Eje",repuesto:"Repuesto",otro:"Otro"};
const TEC=f=>f==="barra"||f==="tornillo";
const UDS=["ud","kg","l","m","caja","rollo"];
const DIAM=["Ø 50","Ø 60","Ø 70","Ø 70 esp","Ø 80","Ø 90","Ø 90 esp","Ø 100","Ø 100 esp"];
const MOTIVOS=["DESGASTE","ROTURA","FUGA DE AGUA","PISTÓN AGARROTADO","CAMBIO REF","CAMBIO PREVENTIVO","PRUEBAS","TRABAJANDO SIN PISTONWAX"];
const DESTINOS=["ZONA DE PISTONES USADOS","QUEDA PUESTO EN EL EJE (AGARROTADO)","DESECHADO","NO ESTÁ EN LA ZONA PISTONES USADO NI EN EJE"];
const EST_E={planta:["En planta","ok"],preparado:["Preparado para enviar","info"],reparacion:["En reparación","warn"],devuelto:["Devuelto a reparar","bad"]};
const AMBAR=30,ROJO=60;
const TIPOS={entrada:"Entrada",salida:"Consumo",traslado:"Traslado",ajuste:"Conteo"};

let db=null,assets=null,downloads=null,ready=false,catOk=false,tab="res",pending=false;
let cat={articulos:[],almacenes:[],maquinas:[],proveedores:[],operarios:[],modelos:[]};
let meses={},pistAnos={},ejes=[],reps={};
const hoy=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const draft={m:{tipo:"entrada",f:hoy(),art:"",alm:"",dest:"",cant:"",maq:"",prov:"",alb:"",nota:""},mFile:null,
  p:{f:hoy(),maq:"",diam:"",cant:"1",motivo:"DESGASTE",dest:"",resp:"",nota:"",desc:true,alm:""},eb:"",
  fs:{fam:"",alm:"",txt:""},hm:{mes:"",tipo:""},fe:""};

const $=id=>document.getElementById(id);
function el(t,a,k){const n=document.createElement(t);
  if(k)(Array.isArray(k)?k:[k]).forEach(c=>{if(c==null||c===false)return;n.appendChild(typeof c==="object"?c:document.createTextNode(String(c)));});
  if(a)for(const p in a){const v=a[p];if(v==null||v===false)continue;
    if(p==="class")n.className=v;else if(p==="text")n.textContent=v;else if(p.startsWith("on")&&typeof v==="function")n.addEventListener(p.slice(2),v);
    else if(p==="value")n.value=v;else if(p==="checked")n.checked=!!v;else n.setAttribute(p,v===true?"":v);}
  return n;}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const mesDe=f=>String(f).slice(0,7);
const fmtF=f=>{if(!f)return"—";const[y,m,d]=f.split("-");return d+"/"+m+"/"+y.slice(2);};
const fmtN=n=>(Math.round(n*100)/100).toLocaleString("es-ES",{maximumFractionDigits:2});
const parseN=s=>{const n=parseFloat(String(s).trim().replace(",","."));return isFinite(n)?n:NaN;};
const MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const fmtMes=m=>{const[y,mm]=m.split("-");return MESES[+mm-1]+" "+y;};
function toast(t){const o=$("toast");if(o)o.remove();const n=el("div",{id:"toast",role:"status",text:t});document.body.appendChild(n);setTimeout(()=>n.remove(),2600);}
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
function paraOpts(){return[el("optgroup",{label:"Nave"},NAVES_C.map(n=>el("option",{value:"nave:"+n,text:n}))),el("optgroup",{label:"Inyectora"},maqOpts().map(([v,t])=>el("option",{value:v,text:t})))];}
function ponPara(rec,v){if(!v)return;if(v.startsWith("nave:"))rec.nave=v.slice(5);else rec.maq=v;}
const paraTxt=m=>m.maq?maqN(m.maq):(m.nave||"");
const provN=id=>{const p=cat.proveedores.find(x=>x.id===id);return p?p.nom:"";};
const artsActivos=()=>cat.articulos.filter(a=>a.activo!==false);
function artOpts(fil){const g={};artsActivos().filter(fil||(()=>true)).forEach(a=>{(g[a.fam]=g[a.fam]||[]).push(a);});
  return Object.keys(FAM).filter(f=>g[f]).map(f=>el("optgroup",{label:FAM[f]},g[f].sort((x,y)=>x.desc.localeCompare(y.desc)).map(a=>el("option",{value:a.id,text:a.desc+(a.cod&&!a.desc.includes(a.cod)?" · "+a.cod:"")}))));}
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
  todosMov().forEach(m=>{if(!first[m.art]||m.f<first[m.art])first[m.art]=m.f;if(m.tipo==="salida"&&m.f>=desde)sal[m.art]=(sal[m.art]||0)+(+m.cant||0);});
  const o={};Object.keys(sal).forEach(k=>{const ini=first[k]>desde?first[k]:desde;o[k]=sal[k]/Math.max(1,dias(ini,hy)+1);});return o;}
const consDia=a=>CONS[a.id]||0;
function plazoArt(a){if(+a.plazo>0)return +a.plazo;const pv=cat.proveedores.find(x=>x.id===a.prov);return pv&&+pv.plazo>0?+pv.plazo:0;}
const consPlazo=a=>consDia(a)*plazoArt(a);
const puntoPedido=a=>Math.max(+a.pp||0,(+a.min||0)+consPlazo(a));
function nivel(a){const st=stockDe(a.id),mn=+a.min||0;const pp=puntoPedido(a);if(!(pp>0)&&!(mn>0))return"na";if(st<mn)return"bad";if(st<=pp)return"warn";return"ok";}
const NIV={bad:"Crítico",warn:"Pedir",ok:"OK",na:"Sin mínimo"};

/* ---------- writes ---------- */
async function saveCat(){if(!catOk){toast("El catálogo no se ha cargado bien: cierra y vuelve a abrir la app antes de guardar.");throw new Error("CAT_NO_CARGADO");}try{await db.doc("cat/app").set(cat);}catch(e){toast("No se pudo guardar: "+(e&&e.message||"error"));throw e;}}
async function addMov(rec){rec.id=rec.id||uid();rec.ts=Date.now();if(db.itemsAdd){await db.itemsAdd("mov",mesDe(rec.f),[rec]);return rec;}const ref=db.doc("mov/"+mesDe(rec.f)),sn=await ref.get();
  const items=sn.exists?(sn.data().items||[]).slice():[];items.push(rec);await ref.set({items});return rec;}
async function delMov(id,f){if(db.itemsDelId){await db.itemsDelId("mov",mesDe(f),[id]);return;}const ref=db.doc("mov/"+mesDe(f)),sn=await ref.get();if(!sn.exists)return;
  await ref.set({items:(sn.data().items||[]).filter(x=>x.id!==id)});}
async function addPists(list){const g={};list.forEach(r=>{r.id=r.id||uid();r.ts=Date.now();(g[r.f.slice(0,4)]=g[r.f.slice(0,4)]||[]).push(r);});for(const k of Object.keys(g)){if(db.itemsAdd)await db.itemsAdd("pist",k,g[k]);else{const ref=db.doc("pist/"+k),sn=await ref.get();await ref.set({items:(sn.exists?(sn.data().items||[]):[]).concat(g[k])});}}}
async function addPist(rec){rec.id=uid();rec.ts=Date.now();if(db.itemsAdd){await db.itemsAdd("pist",rec.f.slice(0,4),[rec]);return;}const ref=db.doc("pist/"+rec.f.slice(0,4)),sn=await ref.get();
  const items=sn.exists?(sn.data().items||[]).slice():[];items.push(rec);await ref.set({items});}
async function delPist(p){if(db.itemsDelId)await db.itemsDelId("pist",p.f.slice(0,4),[p.id]);else{const ref=db.doc("pist/"+p.f.slice(0,4)),sn=await ref.get();if(!sn.exists)return;
  await ref.set({items:(sn.data().items||[]).filter(x=>x.id!==p.id)});}if(p.movId)await delMov(p.movId,p.f);try{await quitarPendPist(p.id);}catch(e){}}

/* ---------- dialogs ---------- */
function dlg(title,body,actions){const ov=el("div",{class:"dlg-ov",role:"dialog","aria-modal":"true","aria-label":title});
  const close=()=>{ov.remove();document.removeEventListener("keydown",esc);};const esc=e=>{if(e.key==="Escape")close();};
  const box=el("div",{class:"dlg"},[el("h3",{text:title})].concat(Array.isArray(body)?body:[body]).concat([el("div",{class:"dlg-b"},actions.map(a=>{
    const b=el("button",{type:"button",class:"btn "+(a.cls||""),text:a.t});b.onclick=async()=>{if(a.fn){b.disabled=true;let r;try{r=await a.fn();}catch(e){r=false;}b.disabled=false;if(r===false)return;}close();};return b;}))]));
  ov.appendChild(box);ov.addEventListener("click",e=>{if(e.target===ov)close();});document.addEventListener("keydown",esc);document.body.appendChild(ov);
  const f=box.querySelector("input:not([type=checkbox]),select,textarea");if(f)setTimeout(()=>f.focus(),30);return close;}
function confirmar(t,msg,btn,fn){dlg(t,el("p",{text:msg}),[{t:"Cancelar",cls:"sec"},{t:btn,cls:"peligro",fn}]);}
function lightbox(src){const o=el("div",{class:"lightbox",role:"dialog","aria-label":"Foto del albarán",onclick:()=>o.remove()},el("img",{src,alt:"Foto del albarán"}));document.body.appendChild(o);}
function fotoUrl(id){return window.fotoUrlWeb?window.fotoUrlWeb(id):"/_blob/"+id;}

/* ---------- render ---------- */
function render(force){const a=document.activeElement;
  if(!force&&a&&a.closest&&a.closest("#view")&&/^(INPUT|TEXTAREA)$/.test(a.tagName)&&a.type!=="file"&&a.type!=="checkbox"){pending=true;return;}
  pending=false;SM=stockMap();CONS=consMap();
  const al=artsActivos().filter(x=>{const n=nivel(x);return !x.pedido&&(n==="bad"||n==="warn");}).length;
  pintaCab(al);
  const v=$("view");const sc=document.querySelector("main").scrollTop;v.textContent="";
  if(!db){v.appendChild(el("div",{class:"banner",text:"No se pueden cargar los datos. Comprueba la conexión y vuelve a abrir la app."}));}
  if(!ready){v.appendChild(el("div",{class:"empty",text:"Cargando…"}));return;}
  if(!catOk){v.appendChild(el("div",{class:"banner b",text:"No se ha podido cargar el catálogo (¿sin cobertura?). Cierra y vuelve a abrir la app. Mientras tanto no se guarda nada en el catálogo para no borrarlo."}));}
  if(PADRE[tab])v.appendChild(el("button",{type:"button",class:"volver",text:"‹ Más",onclick:()=>irA("mas")}));
  if(INY_SUB.some(x=>x[0]===tab))v.appendChild(el("div",{class:"seg",role:"tablist","aria-label":"Inyectoras",style:"display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px"},INY_SUB.map(([k,t])=>el("button",{type:"button","aria-pressed":String(tab===k),text:t,onclick:()=>irA(k)}))));
  ({res:vRes,rap:vRap,stock:vStock,repo:vRepo,iny:vIny,mol:vMol,cons:vCons,mat:vMat,mov:vMov,pist:vPist,ejes:vEjes,bt:vBT,cat:vCat,mas:vMas,consultas:vAnalisis})[tab](v);
  document.querySelector("main").scrollTop=sc;kpiInicio();}
document.addEventListener("focusout",()=>setTimeout(()=>{if(pending)render();},0));
function irA(t){if(!esTab(t)){try{localStorage.setItem("almacen.tab",t);}catch(e){}location.href="almacen.html";return;}tab=t;try{localStorage.setItem((window.APP_ID||"almacen")+".tab",t);}catch(e){}tabsUI();render(true);document.querySelector("main").scrollTop=0;}
const ICO={res:'<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',rap:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',stock:'<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',repo:'<path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/>',mas:'<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>'};
const nomTab=t=>{const x=TABS.concat(SUB).find(z=>z[0]===t)||INY_SUB.find(z=>z[0]===t);return x?x[1]:"Almacén";};
function pintaCab(al){const h=$("hTit");if(!h)return;h.firstChild.textContent=nomTab(tab);const sb=$("hSub");
  sb.textContent=tab==="res"?cap(new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})):"";
  const c=$("hChips");c.textContent="";if(!ready||tab!=="res")return;
  let nb=0;try{lineas().forEach(l=>{nb+=faltas(l.id).filter(f=>f.falta>0&&f.org).length;});}catch(e){}
  if(nb)c.appendChild(el("button",{type:"button",class:"chip2 warn",onclick:()=>irA("repo")},[el("b",{text:String(nb)}),"para bajar a planta"]));
  if(al)c.appendChild(el("button",{type:"button",class:"chip2 bad",onclick:()=>irA("stock")},[el("b",{text:String(al)}),"para pedir"]));}
function tabsUI(){const n=$("tabs");n.textContent="";n.classList.toggle("muchas",TABS.length>6);TABS.forEach(([id,t])=>{const b=el("button",{type:"button","aria-selected":String(tab===id||PADRE[tab]===id),onclick:()=>irA(id)});b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICO[id]||"")+"</svg>";b.appendChild(el("span",{text:t}));n.appendChild(b);});const sb=n.querySelector("[aria-selected=true]");if(sb&&n.scrollWidth>n.clientWidth)setTimeout(()=>{try{sb.scrollIntoView({inline:"center",block:"nearest"});}catch(e){}},0);}

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
function preciosPist(){const P=DIAM.map(d=>({d,a:pistArt(d)})).filter(x=>x.a);const val={};P.forEach(x=>{val[x.a.id]=x.a.precio||"";});
  dlg("Precios de pistones (€ por unidad)",[el("p",{class:"hint",text:"Con el precio puesto, las consultas y los informes calculan el gasto en euros."}),
    el("div",{style:"display:grid;grid-template-columns:1fr 1fr;gap:8px"},P.map(x=>fld(x.d,inp("pp"+x.a.id,val[x.a.id],v=>val[x.a.id]=v,{inputmode:"decimal",class:"num",placeholder:"€"}))))],
   [{t:"Cancelar",cls:"sec"},{t:"Guardar",fn:async()=>{let n=0;for(const x of P){const s=String(val[x.a.id]||"").trim();const p=s?parseN(s):NaN;if(s&&!(p>=0)){toast("Precio no válido en "+x.d);return false;}const a=art(x.a.id);const nue=s?String(p):null;if((a.precio||null)!==nue){a.precio=nue;n++;}}
     if(n)await saveCat();toast(n?"Precios guardados":"Sin cambios");render(true);}}]);}

