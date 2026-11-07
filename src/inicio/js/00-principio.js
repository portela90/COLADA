
(function(){
const $=id=>document.getElementById(id);
function el(t,a,k){const e=document.createElement(t);if(a)for(const x in a){const v=a[x];if(v==null||v===false)continue;if(x==="text")e.textContent=v;else if(x==="class")e.className=v;else if(x.startsWith("on"))e[x]=v;else e.setAttribute(x,v);}
  (Array.isArray(k)?k:k!=null?[k]:[]).forEach(c=>{if(c!=null)e.appendChild(typeof c==="string"?document.createTextNode(c):c);});return e;}
const fN=n=>n==null||isNaN(n)?"–":Math.round(n).toLocaleString("es-ES");
const fKg=n=>n==null?"–":n>=1000?(n/1000).toLocaleString("es-ES",{maximumFractionDigits:1}):fN(n);
const uKg=n=>n!=null&&n>=1000?"t":"kg";
function hace(ts){if(!ts)return"sin datos todavía";const m=Math.round((Date.now()-ts)/60000);if(m<1)return"actualizado ahora";if(m<60)return"actualizado hace "+m+" min";const h=Math.round(m/60);if(h<24)return"actualizado hace "+h+" h";const d=Math.round(h/24);return"actualizado hace "+d+(d===1?" día":" días");}
let A=null,C=null,db=null,ERRS=null;
async function cargaErrores(){try{const r=await window.sbColada.rpc("errores_listar",{p_dias:30});if(!r.error){ERRS=r.data||[];pinta();}}catch(e){}}
function verErrores(){const L=ERRS||[],nv=L.filter(e=>!e.visto).length;
  const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)ov.remove();}});
  const fila=e=>el("details",{class:"err-it"+(e.visto?" visto":"")},[el("summary",null,[el("b",{text:e.msg}),el("small",{text:[e.app,e.n>1?e.n+" veces":"1 vez",new Date(e.ultimo).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}),e.usuario].filter(Boolean).join(" · ")+(e.visto?"":" · nuevo")})]),
    el("pre",{text:[e.url,e.ua,"versión "+(e.build||"?"),e.stack].filter(Boolean).join("\n")})]);
  const box=el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"Errores de la app"},[el("h3",{text:"Errores de la app"}),
    el("p",{class:"hint",text:L.length?(nv?nv+" sin revisar. ":"")+"Almacén, Coladas e Inicio, últimos 30 días (los de Limpieza están en su app, en Más). Toca uno para ver el detalle.":"Ningún error en los últimos 30 días."}),
    el("div",{class:"err-lst"},L.map(fila)),
    el("div",{class:"dlg-b"},[el("button",{class:"btn sec",type:"button",text:"Cerrar",onclick:()=>ov.remove()}),
      nv?el("button",{class:"btn",type:"button",text:"Marcar todo como visto",onclick:async()=>{try{await window.sbColada.rpc("errores_visto",{p_firma:"*"});}catch(e){}ov.remove();cargaErrores();}}):null])]);
  ov.appendChild(box);document.body.appendChild(ov);}
/* mosaico: [título, subtítulo, número, unidad, nivel, enlace, pie, barra] */
function tile(o){const t=el("a",{class:"ini-t "+(o.niv||""),href:o.u,"data-k":o.t},[el("span",{class:"tt",text:o.t}),o.s?el("span",{class:"ts",text:o.s}):null,
  el("span",{class:"tv"},[el("span",{class:"tn",text:o.n}),o.un?el("span",{class:"tu",text:o.un}):null]),
  o.bar?el("span",{class:"tbar"},o.bar.map(([v,c])=>el("i",{style:"width:"+v+"%;background:"+c}))):null,
  o.cmp?cmpEl(o.cmp):null,o.cmp&&o.cmp.y!=null?anioEl(o.cmp):null,o.spark?spark(o.spark):null,
  el("span",{class:"tf",text:o.f||"\u00a0"})]);return t;}
/* flecha frente al mes pasado (hasta el mismo día): {a: ahora, b: antes, malo: "sube" si subir es malo} */
const MESC=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
function cmpEl(c){if(c.a==null||c.b==null)return null;const ma=MESC[(new Date().getMonth()+11)%12],dd=new Date().getDate();
  if(!c.b)return el("span",{class:"tcmp",text:c.a?"el mes pasado a día "+dd+" no había nada":"igual que el mes pasado"});
  const p=Math.round((c.a-c.b)/c.b*100),sube=p>0,niv=!p||!c.malo?"":(sube===(c.malo==="sube")?"mal":"bien");
  return el("span",{class:"tcmp "+niv,title:"Comparado con el mes pasado hasta el mismo día (1–"+dd+" de "+ma+")"},[el("b",{text:(p>0?"▲ ":p<0?"▼ ":"= ")+(p?Math.abs(p)+" %":"igual")}),
    " vs. mes pasado"]);}
/* el mismo mes del año pasado: {a, y: valor del año pasado, ym:"2025-11", malo} (solo sale cuando hay datos de entonces) */
function anioEl(c){if(c.a==null||c.y==null)return null;const et=MESC[+String(c.ym).slice(5,7)-1]+" "+String(c.ym).slice(0,4),dd=new Date().getDate();
  if(!c.y)return el("span",{class:"tcmp tcmp-y",text:"en "+et+" a día "+dd+" no había nada"});
  const p=Math.round((c.a-c.y)/c.y*100),sube=p>0,niv=!p||!c.malo?"":(sube===(c.malo==="sube")?"mal":"bien");
  return el("span",{class:"tcmp tcmp-y "+niv,title:"Comparado con el mismo mes del año pasado hasta el mismo día (1–"+dd+" de "+et+")"},[el("b",{text:(p>0?"▲ ":p<0?"▼ ":"= ")+(p?Math.abs(p)+" %":"igual")}),
    " vs. "+et]);}
/* gráfica pequeña de los últimos 6 meses (el último, el mes en curso, va más claro) */
function spark(v){if(!v||v.length<2||!v.some(x=>x>0))return null;const W=120,H=28,mx=Math.max(...v)||1,bw=W/v.length;
  const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");svg.setAttribute("viewBox","0 0 "+W+" "+H);svg.setAttribute("class","tspark");svg.setAttribute("aria-hidden","true");svg.setAttribute("preserveAspectRatio","none");
  v.forEach((x,i)=>{const r=document.createElementNS(ns,"rect"),h=Math.max(2,x/mx*(H-2));r.setAttribute("x",i*bw+2);r.setAttribute("width",bw-4);r.setAttribute("y",H-h);r.setAttribute("height",h);r.setAttribute("rx",2);
    if(i===v.length-1)r.setAttribute("class","act");svg.appendChild(r);});
  const MS=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"],m0=new Date().getMonth();
  const w=el("span",{class:"tspk"},[svg,el("span",{class:"tspk-m"},v.map((_,i)=>el("i",{text:MS[(m0-(v.length-1-i)+120)%12]})))]);return w;}
const fEur=n=>n==null?"–":Math.round(n).toLocaleString("es-ES")+" €";
/* Inicio a tu gusto: cada persona elige qué mosaicos ve y en qué orden (alm_ipref/<usuario>, o en este móvil si no hay usuario) */
let PREF={oculto:[],orden:{}},GR=[];
const prefRef=()=>{const id=window.yoId&&window.yoId();return id&&db?db.doc("alm_ipref/"+id):null;};
async function cargaPref(){const r=prefRef();try{if(r){const sn=await r.get();if(sn.exists)PREF=Object.assign({oculto:[],orden:{}},sn.data());}else{const x=JSON.parse(localStorage.getItem("ini.pref")||"null");if(x)PREF=Object.assign({oculto:[],orden:{}},x);}}catch(e){}}
async function guardaPref(){const r=prefRef();try{if(r)await r.set(PREF);else localStorage.setItem("ini.pref",JSON.stringify(PREF));}catch(e){}}
function grupo(t,sub,tiles){tiles=tiles.filter(Boolean);const keys=tiles.map(x=>x.getAttribute("data-k"));GR.push({t,keys});
  const ord=PREF.orden[t]||[],pos=k=>{const i=ord.indexOf(k);return i<0?999+keys.indexOf(k):i;};
  const vis=tiles.filter(x=>!PREF.oculto.includes(t+"|"+x.getAttribute("data-k"))).sort((a,b)=>pos(a.getAttribute("data-k"))-pos(b.getAttribute("data-k")));
  if(!vis.length)return null;
  return el("section",{class:"ini-grp"},[el("h2",null,[t,sub?el("small",{text:sub}):null]),el("div",{class:"ini-tiles"},vis)]);}
function personalizar(){const ov=el("div",{class:"dlg-ov",onclick:e=>{if(e.target===ov)ov.remove();}});const P=JSON.parse(JSON.stringify(PREF));
  const cuerpo=el("div",{class:"ini-pers"});
  const pinta=()=>{cuerpo.textContent="";GR.forEach(g=>{const ord=(P.orden[g.t]||[]).filter(k=>g.keys.includes(k)).concat(g.keys.filter(k=>!(P.orden[g.t]||[]).includes(k)));P.orden[g.t]=ord;
    cuerpo.appendChild(el("h4",{text:g.t}));
    ord.forEach((k,i)=>{const id=g.t+"|"+k,on=!P.oculto.includes(id);
      cuerpo.appendChild(el("div",{class:"ini-pf"+(on?"":" off")},[el("label",null,[(()=>{const c=el("input",{type:"checkbox"});c.checked=on;c.onchange=()=>{if(c.checked)P.oculto=P.oculto.filter(x=>x!==id);else P.oculto.push(id);pinta();};return c;})(),el("span",{text:k})]),
        el("button",{class:"btn sec",type:"button","aria-label":"Subir "+k,text:"↑",disabled:i===0?"":null,onclick:()=>{ord.splice(i-1,0,ord.splice(i,1)[0]);pinta();}}),
        el("button",{class:"btn sec",type:"button","aria-label":"Bajar "+k,text:"↓",disabled:i===ord.length-1?"":null,onclick:()=>{ord.splice(i+1,0,ord.splice(i,1)[0]);pinta();}})]));});});};
  pinta();
  const box=el("div",{class:"dlg",role:"dialog","aria-modal":"true","aria-label":"Personalizar Inicio"},[el("h3",{text:"Personalizar Inicio"}),
    el("p",{class:"hint",text:"Marca los mosaicos que quieres ver y ordénalos con las flechas. Se guarda para ti."}),cuerpo,
    el("div",{class:"dlg-b"},[el("button",{class:"btn sec",type:"button",text:"Volver a como venía",onclick:async()=>{PREF={oculto:[],orden:{}};await guardaPref();ov.remove();pinta0();}}),
      el("button",{class:"btn",type:"button",text:"Guardar",onclick:async()=>{PREF=P;await guardaPref();ov.remove();pinta0();}})])]);
  ov.appendChild(box);document.body.appendChild(ov);}
function campanaIni(){if(!window.campana)return;const a=A||{},c=C||{},L=[],AL="almacen.html?t=",SC=!!(window.SOLO_CONSULTA||window.SIN_COLADAS);
  try{if(MT&&window.MisTrabajos){const V=MisTrabajos.vencidos();if(V.length)L.push({niv:"warn",t:V.length+(V.length===1?" trabajo tuyo para hoy o vencido":" trabajos tuyos para hoy o vencidos"),d:V.slice(0,2).map(x=>x.titulo).join(" · "),fn:()=>MisTrabajos.abrir()});}}catch(e){}
  if(a.bajoMin)L.push({niv:"bad",t:a.bajoMin+(a.bajoMin===1?" artículo bajo mínimo":" artículos bajo mínimo"),d:"Almacén",href:AL+"stock"});
  if(a.pedir&&a.pedir>(a.bajoMin||0))L.push({niv:"warn",t:(a.pedir-(a.bajoMin||0))+" para pedir",d:"Almacén · por debajo del punto de pedido",href:AL+"stock"});
  if(a.bajar)L.push({niv:"warn",t:"Bajar "+a.bajar+(a.bajar===1?" artículo":" artículos")+" a planta",d:"Almacén",href:AL+"repo"});
  if(a.cuarentena)L.push({niv:"bad",t:a.cuarentena+(a.cuarentena===1?" eje en cuarentena":" ejes en cuarentena"),d:"Almacén",href:AL+"ejes"});
  if(a.presuMes&&a.gastoMes>a.presuMes)L.push({niv:"bad",t:"Presupuesto del mes superado",d:"Almacén · "+fN(a.gastoMes)+" € de "+fN(a.presuMes)+" €",href:AL+"res"});
  if(!SC&&c.sinAlb)L.push({niv:"warn",t:c.sinAlb+(c.sinAlb===1?" entrada de aluminio sin albarán":" entradas de aluminio sin albarán"),d:"Coladas",href:"index.html?t=entrada"});
  const nE=ERRS?ERRS.filter(e=>!e.visto).length:0;if(nE)L.push({niv:"warn",t:nE+(nE===1?" error de la app sin revisar":" errores de la app sin revisar"),fn:verErrores});
  campana.pon("inicio",L);}
let pinta0=()=>{};const apG=(v,n)=>{if(n)v.appendChild(n);};
function pinta(){pinta0=pinta;GR=[];const v=$("view");v.textContent="";campanaIni();
  const hr=new Date().getHours();v.appendChild(el("p",{class:"ini-hola",text:(hr<14?"Buenos días":hr<21?"Buenas tardes":"Buenas noches")}));
  v.appendChild(el("div",{class:"ini-subf"},[el("p",{class:"ini-sub",text:new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})+" · pulsa un mosaico para ir directo"}),
    el("button",{type:"button",class:"btn sec ini-persb",text:"Personalizar",onclick:personalizar})]));
  /* mis trabajos: tablero privado (solo el administrador; la base de datos solo le deja ver los suyos) */
  if(window.MisTrabajos&&window.yoAdmin&&window.yoAdmin()){if(!MT)MT=MisTrabajos.resumen();v.appendChild(MT);}
  const a=A||{},c=C||{};const fa=hace(a.ts),fc=hace(c.ts);
  const SC=!!(window.SOLO_CONSULTA||window.SIN_COLADAS);
  if(!A||(!C&&!SC))v.appendChild(el("div",{class:"ini-aviso",text:"Algunos números salen cuando alguien abre "+[!A?"Almacén":null,!C?"Coladas":null].filter(Boolean).join(" y ")+" por primera vez después de este cambio."}));
  /* --- Almacén --- */
  const AL="almacen.html?t=";
  const ejP=a.ejesTot?Math.round(a.ejesPlanta/a.ejesTot*100):null;
  apG(v,grupo("Almacén","consumibles, pistones y ejes · "+fa,[
    tile({t:"Bajar a planta",s:"Reponer líneas hoy",n:fN(a.bajar),un:a.bajar===1?"artículo":"artículos",niv:a.bajar?"warn":"ok",u:AL+"repo",f:a.uds?fN(a.uds)+" unidades en total":null}),
    tile({t:"Para pedir",s:"Por debajo del punto de pedido",n:fN(a.pedir),un:a.pedir===1?"artículo":"artículos",niv:a.bajoMin?"bad":a.pedir?"warn":"ok",u:AL+"stock",f:a.bajoMin?a.bajoMin+" bajo mínimo":"ninguno bajo mínimo"}),
    tile({t:"Pedidos en curso",s:"Esperando al proveedor",n:fN(a.pedidos),un:a.pedidos===1?"artículo":"artículos",u:AL+"stock"}),
    tile({t:"Ejes en planta",s:"Disponibles de "+fN(a.ejesTot),n:ejP==null?"–":ejP+" %",niv:ejP==null?"":ejP<70?"bad":ejP<85?"warn":"ok",u:AL+"ejes",
      bar:a.ejesTot?[[a.ejesPlanta/a.ejesTot*100,"var(--ok)"],[(a.ejesTaller||0)/a.ejesTot*100,"var(--warn)"],[(a.cuarentena||0)/a.ejesTot*100,"var(--bad)"]]:null,
      f:fN(a.ejesTaller)+" en taller · "+fN(a.cuarentena)+" en cuarentena"+(a.prep?" · "+a.prep+" sin enviar":"")}),
    tile({t:"Cuarentena",s:"Ejes rotos o agarrotados",n:fN(a.cuarentena),un:a.cuarentena===1?"eje":"ejes",niv:a.cuarentena?"bad":"ok",u:AL+"ejes"}),
    tile({t:"Pistones",s:"Cambios este mes",n:fN(a.pistMes),un:"cambios",u:AL+"pist",cmp:a.pistAnt!=null?{a:a.pistMes,b:a.pistAnt,malo:"sube",y:a.pistAnio,ym:a.anioMes}:null,spark:a.pistSerie}),
    a.gastoMes!=null?tile({t:"Gasto del mes",s:"Consumibles, pistones y ejes",n:fN(a.gastoMes),un:"€",u:AL+"consultas",cmp:{a:a.gastoMes,b:a.gastoAnt,malo:"sube",y:a.gastoAnio,ym:a.anioMes},spark:a.gastoSerie,niv:a.presuMes&&a.gastoMes>a.presuMes?"bad":"",f:a.presuMes?Math.round(a.gastoMes/a.presuMes*100)+" % del presupuesto ("+fN(a.presuMes)+" €)":"sin presupuesto puesto"}):null,
    tile({t:"Pistones usados",s:"En la zona de retirada",n:fN(a.usadosZona),un:"pistones",niv:a.urgeRecup?"warn":"",u:AL+"pist",f:a.urgeRecup?a.urgeRecup+" medida"+(a.urgeRecup===1?"":"s")+" conviene recuperar":"nada urgente que recuperar"}),
    tile({t:"Inyectoras",s:"Plano, material y moldes",n:fN(a.iny),un:"máquinas",u:AL+"iny"}),
    tile({t:"Análisis",s:"Pregúntale a la app y tendencias",n:"Abrir",u:AL+"consultas",niv:"app"})]));
  /* --- Coladas --- (no lo ve el usuario de solo consulta del Almacén) */
  if(SC){actIni(v);return;}
  const N=c.naves||{};const nv=Object.keys(N).sort();
  apG(v,grupo("Coladas","aluminio · "+fc,[
    tile({t:"Stock de aluminio",s:"Total en todas las naves",n:fKg(c.kg),un:uKg(c.kg)+(c.fa!=null?" · "+fN(c.fa)+" fardos":""),u:"index.html?t=stock"})]
    .concat(nv.map(k=>{const x=N[k];const tot=x.kg||0;return tile({t:k,s:"Stock en la nave",n:fKg(tot),un:uKg(tot)+" · "+fN(x.fa)+" fardos",u:"index.html?t=stock",
      bar:tot>0?[[x.kgN/tot*100,"var(--acc)"],[x.kgE/tot*100,"var(--mut)"]]:null,f:fKg(x.kgN)+" "+uKg(x.kgN)+" en nave · "+fKg(x.kgE)+" "+uKg(x.kgE)+" fuera"});}))
    .concat(c.conMes!=null?[tile({t:"Consumo del mes",s:"Aluminio gastado",n:fKg(c.conMes),un:uKg(c.conMes),u:"index.html?t=consumo",cmp:{a:c.conMes,b:c.conAnt,y:c.conAnio,ym:c.anioMes},spark:c.conSerie}),
      tile({t:"Entradas del mes",s:"Aluminio recibido",n:fKg(c.entMes),un:uKg(c.entMes),u:"index.html?t=entrada",cmp:{a:c.entMes,b:c.entAnt,y:c.entAnio,ym:c.anioMes},spark:c.entSerie})]:[])
    .concat([tile({t:"Apuntar consumo",s:"Fardos gastados hoy",n:"Abrir",u:"index.html?t=consumo",niv:"app"}),
      tile({t:"Entrada de material",s:"Albaranes de aluminio",n:c.sinAlb?fN(c.sinAlb):"Abrir",un:c.sinAlb?"sin albarán":null,niv:c.sinAlb?"warn":"app",u:"index.html?t=entrada",f:c.sinAlb?"pendientes de completar":null})])));
  actIni(v);
  /* --- Otras apps --- */
  const nE=ERRS?ERRS.filter(e=>!e.visto).length:null;
  const tE=ERRS?tile({t:"Errores de la app",s:"Lo que ha fallado en los móviles",n:fN(nE),un:nE===1?"sin revisar":"sin revisar",niv:nE?"bad":"ok",u:"#errores",f:ERRS.length?ERRS.length+" en 30 días":"ninguno en 30 días"}):null;
  if(tE)tE.addEventListener("click",e=>{e.preventDefault();verErrores();});
  apG(v,grupo("Otras apps",null,[tile({t:"Limpieza",s:"CIE · trabajos, hornos y horas",n:"Abrir",u:"limpieza.html",niv:"app"}),tE]));
}
/* actividad reciente: la tarjeta se hace una vez y se vuelve a poner en cada repintado (se refresca sola) */
let MT=null;
let ACT=null;function actIni(v){if(!window.Actividad)return;if(!ACT)ACT=Actividad.caja({ver:10});v.appendChild(ACT);}
async function arranca(){try{db=await claude.use("db");}catch(e){db=null;}
  try{await cargaPref();}catch(e){}
  if(!db){pinta();return;}
  db.doc("alm_kpi/inicio").onSnapshot(sn=>{A=sn.exists?sn.data():null;pinta();},()=>pinta());
  db.doc("kpi/inicio").onSnapshot(sn=>{C=sn.exists?sn.data():null;pinta();},()=>pinta());
  cargaErrores();setInterval(()=>{pinta();},60000);setInterval(cargaErrores,300000);}
arranca();
})();
