/* ===== PANELES DE MOSAICOS (como en Coladas) =====
   En las pantallas con muchas tarjetas (Hoy, Reponer, Averías, Desviaciones, Catálogo) se ve primero un
   panel con un mosaico por tarjeta (su título, su dato y su color). Al pulsar uno se abre su ventana:
   en el ordenador con la lista de mosaicos a la izquierda; en el móvil a pantalla completa con «← Panel».
   No cambia lo de dentro: se recolocan las mismas tarjetas que pinta cada pantalla. */
const PANEL_TABS={repo:{},aver:{fijos:1},cat:{}};/* Hoy ya no: tiene su propio orden (lo urgente arriba) */
const PANA={};
const pnHd=n=>n&&n.querySelector?n.querySelector(":scope > .hd, :scope > summary.hd, :scope > summary"):null;
const pnEsCard=n=>n&&n.classList&&n.classList.contains("card")&&pnHd(n)&&pnHd(n).querySelector("h2");
function pnDato(n){const hd=pnHd(n);if(!hd)return"";const t=[...hd.children].filter(c=>c.tagName!=="H2"&&!c.querySelector("select,input,button")&&!/^(SELECT|BUTTON|INPUT)$/.test(c.tagName)).map(c=>c.textContent.trim()).filter(Boolean).join(" · ");return t.length>80?t.slice(0,78)+"…":t;}
function pnEstado(ns){let st="na";ns.forEach(n=>{if(!n.querySelector)return;const e=n.classList.contains("alerta")||n.querySelector(".pill.bad,.banner.b,.stripe.bad")?"bad":n.querySelector(".pill.warn,.banner.w,.stripe.warn")?"warn":n.querySelector(".pill.ok")?"ok":"na";
  if(e==="bad"||(e==="warn"&&st!=="bad")||(e==="ok"&&st==="na"))st=e;});return st;}
function pnTitulo(t){const m=t.match(/^(.*?)\s*\((\d+)\)$/);return m?{t:m[1],big:m[2]}:{t,big:""};}
function panelizar(v){const P=PANEL_TABS[tab];if(!P)return;
  const kids=[...v.children],arriba=[],G=[];let cards=0;
  for(const n of kids){
    if(pnEsCard(n)){cards++;if(cards<=(P.fijos||0)){arriba.push(n);continue;}const t=pnHd(n).querySelector("h2").textContent.trim();G.push({titulo:t,ns:[n]});continue;}
    if(!G.length)arriba.push(n);else G[G.length-1].ns.push(n);}
  if(G.length<3)return;/* con pocas tarjetas no hace falta panel */
  const tiles=G.map(g=>{const T=pnTitulo(g.titulo);return{k:g.titulo,t:T.t,big:T.big,sub:pnDato(g.ns[0]),st:pnEstado(g.ns),ns:g.ns};});
  const cur=tiles.find(x=>x.k===PANA[tab]);
  const ir=k=>{PANA[tab]=k;render(true);try{document.querySelector("main").scrollTop=0;}catch(e){}};
  const tile=(x,mini)=>el("button",{type:"button",class:"pv-t s-"+x.st+(mini?" mini":"")+(cur&&cur.k===x.k&&mini?" on":""),onclick:()=>ir(x.k),"aria-label":x.t},[
    el("div",{class:"pv-t-t",text:x.t}),x.big?el("div",{class:"pv-t-big num",text:x.big}):null,x.sub?el("div",{class:"pv-t-sub",text:x.sub}):null]);
  v.textContent="";arriba.forEach(n=>v.appendChild(n));
  if(!cur){v.appendChild(el("div",{class:"pv-grid"},tiles.map(x=>tile(x,false))));v.appendChild(el("p",{class:"hint",text:"Pulsa un mosaico para abrir su ventana."}));return;}
  cur.ns.forEach(n=>{if(n.tagName==="DETAILS")n.open=true;});
  v.appendChild(el("div",{class:"pv-pan"},[
    el("aside",{class:"pv-side","aria-label":"Ventanas"},[el("button",{type:"button",class:"pv-volver",text:"← Panel",onclick:()=>ir("")})].concat(tiles.map(x=>tile(x,true)))),
    el("div",{class:"pv-det"},[el("div",{class:"pv-det-hd"},[el("button",{type:"button",class:"btn sec pv-volver-m",text:"← Panel",onclick:()=>ir("")}),el("h2",{text:cur.t})])].concat(cur.ns))]));}
