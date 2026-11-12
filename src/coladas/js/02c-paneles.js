/* ---------- Paneles de mosaicos para Consumo, Consultas y Plan ----------
   Igual que Stock: al entrar, un mosaico por cada parte de la pantalla con su dato clave y su color;
   al pulsarlo se abre su ventana (en el ordenador con la lista de mosaicos a la izquierda).
   autoPanel arma los mosaicos solo, a partir de las tarjetas que ya pintaba cada pantalla:
   el título de la tarjeta es el del mosaico y lo que lleva a la derecha del título, su dato. */
const PANV={consumo:"",hist:"",plan:""};
function irPanel(sec,v){PANV[sec]=v;render();try{document.querySelector("main").scrollTop=0;}catch(e){}}
const hdDe=n=>n&&n.querySelector?n.querySelector(":scope > .hd, :scope > summary.hd, :scope > summary"):null;
function datoHd(n){const hd=hdDe(n);if(!hd)return"";const t=[...hd.children].filter(c=>c.tagName!=="H2"&&!c.querySelector("select,input,button")&&c.tagName!=="SELECT").map(c=>c.textContent.trim()).filter(Boolean).join(" · ");return t.length>80?t.slice(0,78)+"…":t;}
function estadoNodo(n){if(!n||!n.querySelector)return"na";if(n.querySelector(".pill.bad,.banner.b"))return"bad";if(n.querySelector(".pill.warn,.banner.w"))return"warn";if(n.querySelector(".pill.ok"))return"ok";return"na";}
function tileGen(x,compact,activo,onclick){
  return el("button",{type:"button",class:"stk-t s-"+(x.st||"na")+(compact?" mini":"")+(activo?" on":""),onclick,"aria-label":x.t},[
    el("div",{class:"stk-t-hd"},[x.dot?el("span",{class:"dot",style:"background:"+x.dot}):null,el("span",{class:"stk-t-t",text:x.t}),x.pill&&!compact?el("span",{class:"pill "+(x.st==="na"?"na":x.st),text:x.pill}):null]),
    x.big?el("div",{class:"stk-t-big"},[el("b",{class:"num",text:x.big}),x.u?el("span",{text:" "+x.u}):null]):null,
    x.cmp&&!compact?el("div",{class:"stk-t-cmp",title:x.cmp.title||null},[el("b",{text:x.cmp.txt}),el("span",{text:" "+(x.cmp.sub||"")})]):null,
    x.spark&&!compact?x.spark:null,
    x.sub?el("div",{class:"stk-t-sub",text:x.sub}):null]);}
/* tiles: [{v,t,sub,big,u,st,pill,dot,nodes:()=>[...]}] · arriba: nodos fijos que van siempre encima */
function panelGen(sec,tiles,arriba){const cur=PANV[sec],T=tiles.find(x=>x.v===cur);arriba=(arriba||[]).filter(Boolean);
  if(!T)return arriba.concat([el("div",{class:"stk-grid"},tiles.map(x=>tileGen(x,false,false,()=>irPanel(sec,x.v))))]);
  const det=T.nodes().filter(Boolean);det.forEach(n=>{if(n.tagName==="DETAILS")n.open=true;});
  return arriba.concat([el("div",{class:"stk-pan"},[
    el("aside",{class:"stk-side","aria-label":"Ventanas"},[el("button",{type:"button",class:"stk-volver",text:"← Panel",onclick:()=>irPanel(sec,"")})].concat(tiles.map(x=>tileGen(x,true,x.v===cur,()=>irPanel(sec,x.v))))),
    el("div",{class:"stk-det"},[el("div",{class:"stk-det-hd"},[el("button",{type:"button",class:"btn sec stk-volver-m",text:"← Panel",onclick:()=>irPanel(sec,"")}),el("h2",{text:T.t})])].concat(det))])]);}
/* a partir de tarjetas ya hechas: cada una con título es una ventana; lo que no tiene título va con la anterior.
   o.juntar: {título: título de la ventana donde va} · o.nombre: {título: nombre del mosaico} */
function autoPanel(sec,nodos,o,arriba){o=o||{};const G=[];
  nodos.filter(Boolean).forEach(n=>{const hd=hdDe(n),h2=hd&&hd.querySelector("h2");const t=h2?h2.textContent.trim():"";
    const dest=t&&o.juntar&&o.juntar[t]?G.find(g=>g.titulo===o.juntar[t]):null;
    if(dest){dest.ns.push(n);return;}
    if(!t&&G.length){G[G.length-1].ns.push(n);return;}
    G.push({titulo:t||"Más",ns:[n]});});
  const tiles=G.map((g,i)=>{let st="na";g.ns.forEach(n=>{const e=estadoNodo(n);if(e==="bad"||(e==="warn"&&st!=="bad")||(e==="ok"&&st==="na"))st=e;});
    return{v:"g"+i+"-"+g.titulo,t:(o.nombre&&o.nombre[g.titulo])||g.titulo,sub:datoHd(g.ns[0])||(o.sub&&o.sub[g.titulo])||"",st,nodes:()=>g.ns};});
  return panelGen(sec,tiles,arriba);}
