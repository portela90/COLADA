/* ---------- Stock: panel de mosaicos ----------
   Al entrar se ve un mosaico por cosa (cada nave y aleación, granalla, máquinas, falta por apuntar,
   parte del día, previsión y mínimos) con su dato clave y su color. Al pulsar uno se abre su ventana:
   en el ordenador los mosaicos quedan en una columna a la izquierda y el detalle a la derecha;
   en el móvil el detalle ocupa la pantalla y «← Panel» vuelve. Lo de dentro de cada ventana no cambia. */
let stkVista="";/* al abrir la app se empieza siempre por el panel */
function irVistaStk(v){stkVista=v;render();try{document.querySelector("main").scrollTop=0;}catch(e){}}
function stockPanel(c){const {B,P,ud,g,parte,alertaN,hint,gk,gm,gst}=c;
  const tiles=[],h=hoy();
  /* nave y aleación */
  LINEAS.forEach(([n,m])=>{const b=B[key(n,m)];if(!b||(!b.fa&&!b.faE&&!b.faN&&b.dias==null))return;const mn=cfg.minimos[key(n,m)]||{},[st,tx]=estado(b,mn);
    tiles.push({v:"stock",id:"l-"+key(n,m),st,dot:MAT[m].col,t:n+" · "+MAT[m].nom,big:b.dias==null?"—":String(b.dias),u:b.dias===1?"día":"días",
      sub:fmt(b.faN)+" f en nave · "+fmt(b.faE)+" f externo",pill:tx,
      fn:()=>{fStk={nave:n,mat:m,ubi:""};try{localStorage.setItem("colada.fstk",JSON.stringify(fStk));}catch(e){}irVistaStk("stock");}});});
  tiles.push({v:"stock",id:"gran",st:gm>0?gst:"na",dot:"var(--cobre)",t:"Granalla de cobre",big:fmt(gk),u:"kg",sub:gm>0?"mínimo "+fmt(gm)+" kg":"sin mínimo",pill:gm>0?(gk<gm?"Bajo mínimo":"OK"):"",
    fn:()=>{fStk={nave:"",mat:"",ubi:""};try{localStorage.setItem("colada.fstk",JSON.stringify(fStk));}catch(e){}irVistaStk("stock");}});
  /* máquinas en marcha ahora */
  {let on=0,a=0,cu=0;try{const st=estadoMaq(h,turnoAhora());NAVES.forEach(n=>{const x=cuentaMaq(st,n);on+=x.on;a+=x.a;cu+=x.c;});}catch(e){}
   tiles.push({v:"maq",st:"na",t:"Máquinas",big:String(on),u:"en marcha",sub:a+" con AlSi12 · "+cu+" con granalla",fn:()=>irVistaStk("maq")});}
  /* falta por apuntar */
  {let H=[];try{H=huecos();}catch(e){}const n=H.reduce((s,d)=>s+d.falta.length,0);
   tiles.push({v:"huecos",st:n?"bad":"ok",t:"Falta por apuntar",big:String(n),u:n===1?"relevo":"relevos",sub:n?"sin consumo apuntado":"todo apuntado",pill:n?"Revisar":"OK",fn:()=>irVistaStk("huecos")});}
  /* parte del día */
  {let f=0;try{LINEAS.forEach(([n,m])=>{const x=P[key(n,m)];if(x)f+=(x.cUdFa||0);});}catch(e){}
   tiles.push({v:"parte",st:"na",t:"Parte del día",big:ud?dmy(ud):"—",u:"",sub:f?fmt(f)+" fardos consumidos":"para copiar y enviar",fn:()=>irVistaStk("parte")});}
  /* cómo estaba el stock un día cualquiera */
  tiles.push({v:"dia",st:"na",t:"Stock de un día",big:"",u:"",sub:"qué coladas y cuántos fardos había cualquier día",fn:()=>{sdF="";irVistaStk("dia");}});
  /* previsión */
  {let sub="consumo y camiones del mes";try{const nd=vPrevision();const s=nd&&nd.querySelector(".hd .sub");if(s)sub=s.textContent;}catch(e){}
   tiles.push({v:"prev",st:"na",t:"Previsión de gasto",big:"",u:"",sub,fn:()=>irVistaStk("prev")});}
  /* mínimos */
  {const bajo=LINEAS.filter(([n,m])=>{const b=B[key(n,m)];return b&&estado(b,cfg.minimos[key(n,m)]||{})[0]==="bad";}).length;
   tiles.push({v:"min",st:bajo?"bad":"na",t:"Mínimos",big:bajo?String(bajo):"",u:bajo?(bajo===1?"por debajo":"por debajo"):"",sub:bajo?"líneas bajo el mínimo":"fardos mínimos en nave",fn:()=>irVistaStk("min")});}

  const tile=(x,compact)=>el("button",{type:"button",class:"stk-t s-"+x.st+(compact?" mini":"")+(stkVista===x.v&&compact?" on":"")+(/^(l-|gran)/.test(x.id||"")?" stk-lin":""),onclick:x.fn,"aria-label":x.t},[
    el("div",{class:"stk-t-hd"},[x.dot?el("span",{class:"dot",style:"background:"+x.dot}):null,el("span",{class:"stk-t-t",text:x.t}),x.pill&&!compact?el("span",{class:"pill "+(x.st==="na"?"na":x.st),text:x.pill}):null]),
    x.big!==""?el("div",{class:"stk-t-big"},[el("b",{class:"num",text:x.big}),x.u?el("span",{text:" "+x.u}):null]):null,
    el("div",{class:"stk-t-sub",text:x.sub})]);
  const VISTAS={stock:"Stock",maq:"Máquinas",huecos:"Falta por apuntar",parte:"Parte del día",dia:"Stock de un día",prev:"Previsión de gasto",min:"Mínimos"};
  if(!stkVista||!VISTAS[stkVista]){
    return [avisoCierre(),alertaN,el("div",{class:"stk-grid"},tiles.map(x=>tile(x,false)))].filter(Boolean);}
  let det=[];
  if(stkVista==="stock")det=[filtroStock(B),g,alertaN,coladasStock(),hint];
  else if(stkVista==="maq"){maqAbierto=true;det=[vMaquinas()];}
  else if(stkVista==="huecos")det=[vHuecos()||el("div",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Falta por apuntar"}),el("span",{class:"pill ok",style:"margin-left:auto",text:"Todo apuntado"})]),el("div",{class:"empty",text:"Todos los relevos de las dos últimas semanas tienen consumo apuntado."})])];
  else if(stkVista==="parte")det=[el("div",{class:"card"},[el("div",{class:"bd"},[filtroLineas()])]),parte];
  else if(stkVista==="dia")det=vStockDia();
  else if(stkVista==="prev")det=[vPrevision()];
  else if(stkVista==="min")det=[vMin()];
  /* en la lista lateral, un mosaico por ventana (las líneas de stock juntas en uno solo no: se ven todas) */
  return [avisoCierre(),el("div",{class:"stk-pan"},[
    el("aside",{class:"stk-side","aria-label":"Ventanas"},[el("button",{type:"button",class:"stk-volver",text:"← Panel",onclick:()=>irVistaStk("")})].concat(tiles.map(x=>tile(x,true)))),
    el("div",{class:"stk-det"},[el("div",{class:"stk-det-hd"},[el("button",{type:"button",class:"btn sec stk-volver-m",text:"← Panel",onclick:()=>irVistaStk("")}),el("h2",{text:VISTAS[stkVista]})])].concat(det.filter(Boolean)))])].filter(Boolean);
}
