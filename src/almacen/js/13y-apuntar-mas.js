/* ===== APUNTAR: botones directos y «lo que sueles apuntar» =====
   Arriba de «Apuntar rápido»: un botón por cada cosa que se apunta a menudo (lleva directo a su formulario),
   la foto del albarán (la app lo lee y rellena las entradas) y escanear un código (busca el artículo y pregunta qué apuntar).
   Debajo: lo que más se repite en los últimos 60 días, para apuntarlo otra vez con un toque cambiando solo la cantidad. */
const IC_RAP={pist:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',sal:'<path d="M12 20V8M7 13l5-5 5 5"/><path d="M5 4h14"/>',
  ent:'<path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/>',alb:'<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>',
  tras:'<path d="M4 8h13l-3-3M20 16H7l3 3"/>',cont:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  aver:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',eje:'<path d="M3 12h18M7 8v8M17 8v8"/>',esc:'<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3"/><path d="M7 12h10"/>'};
const icR=k=>'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(IC_RAP[k]||"")+'</svg>';
function irMov(tipo,extra){Object.assign(draft.m,{tipo},extra||{});irA(tipo==="salida"?"consu":"mov");}
function irPist(extra){Object.assign(draft.p,extra||{});setTimeout(()=>{irA("pist");setTimeout(()=>{const f=document.getElementById("pForm");if(f)f.scrollIntoView({block:"start"});},60);},0);}
function cardAccionesRap(){if(window.SOLO_CONSULTA)return null;
  const fg=el("input",{type:"file",accept:"image/*",capture:"environment",style:"display:none",id:"rapAlb"});
  fg.addEventListener("change",()=>{const f=fg.files[0];fg.value="";if(f&&typeof leerAlbaranGratis==="function"){irMov("entrada");setTimeout(()=>leerAlbaranGratis(f),80);}});
  const B=[["pist","Cambio de pistón","En una máquina",()=>irPist({alm:""})],["sal","Consumo","Lo que sale a una máquina",()=>irMov("salida")],
    ["alb","Foto del albarán","La app lo lee y rellena",()=>fg.click()],["ent","Entrada","A mano, sin foto",()=>irMov("entrada")],
    ["tras","Traslado","De un almacén a otro",()=>irMov("traslado")],["cont","Recuento","Lo que hay contado",()=>irMov("ajuste")],
    ["aver","Avería","Abrir una avería",()=>{if(typeof nuevaAveriaMano==="function")nuevaAveriaMano();}],["eje","Eje a cuarentena","Roto o agarrotado",()=>{if(typeof formCuarentena==="function")formCuarentena();}]];
  if(window.ESC)B.push(["esc","Escanear código","QR o código de barras",escanearArt]);
  return el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"¿Qué quieres apuntar?"}),el("span",{class:"der sub",text:"toca y va directo"})]),
    el("div",{class:"bd"},[fg,el("div",{class:"rap-grid"},B.map(([k,t,s,fn])=>{const b=el("button",{type:"button",class:"rap-b",onclick:fn});
      const i=el("span",{class:"rap-i"});i.innerHTML=icR(k);b.appendChild(i);b.appendChild(el("span",{class:"rap-t"},[el("b",{text:t}),el("small",{text:s})]));return b;}))])]);}
/* escanear: busca el artículo por su código, el del proveedor o el de barras */
function escanearArt(){if(!window.ESC)return;ESC.abrir({titulo:"Escanear código",texto:"Apunta al QR o al código de barras de la caja o la etiqueta.",alLeer:t=>{
  const q=String(t||"").trim().toLowerCase(),nq2=x=>String(x||"").trim().toLowerCase();
  const a=artsActivos().find(x=>[x.cod,x.codProv,x.ean,x.barras,x.id].some(c=>c&&nq2(c)===q))||artsActivos().find(x=>[x.cod,x.codProv,x.ean].some(c=>c&&q.includes(nq2(c))&&nq2(c).length>=4));
  if(!a){dlg("Código sin artículo",[el("p",{text:"No hay ningún artículo con el código «"+t+"»."}),el("p",{class:"hint",text:"Puedes ponérselo al artículo en su ficha (código o referencia del proveedor) para que la próxima vez lo encuentre."})],[{t:"Cerrar",cls:"sec"}]);return;}
  dlg(a.desc,[el("p",{class:"hint",text:[a.cod,"stock "+fmtN(stockDe(a.id))+" "+(a.ud||"")].filter(Boolean).join(" · ")})],[
    {t:"Ver ficha",cls:"sec",fn:()=>{setTimeout(()=>fichaProd(a.id),0);}},{t:"Entrada",cls:"sec",fn:()=>{irMov("entrada",{art:a.id});}},{t:"Consumo",fn:()=>{irMov("salida",{art:a.id});}}]);}});}
/* lo que más se repite en los últimos 60 días */
function cardHabitualesRap(){if(window.SOLO_CONSULTA)return null;const d0=sumaDias(hoy(),-60),G={};
  todosMov().forEach(m=>{if(m.tipo!=="salida"||!m.f||m.f<d0||/^Cambio de pistón/.test(m.nota||""))return;const k="m|"+m.art+"|"+(m.alm||"")+"|"+(m.maq||"");const g=G[k]=G[k]||{tipo:"m",m,n:0,c:{}};g.n++;const c=String(+m.cant||1);g.c[c]=(g.c[c]||0)+1;});
  todosPist().forEach(p=>{if(!p.f||p.f<d0||!p.maq)return;const k="p|"+p.maq+"|"+p.diam;const g=G[k]=G[k]||{tipo:"p",p,n:0};g.n++;});
  const L=Object.values(G).filter(g=>g.n>=2).sort((a,b)=>b.n-a.n).slice(0,8);if(!L.length)return null;
  const txt=g=>{if(g.tipo==="p")return{t:"Pistón "+g.p.diam+" · "+maqN(g.p.maq),s:g.n+" veces en 60 días"};
    const a=art(g.m.art),cant=Object.entries(g.c).sort((x,y)=>y[1]-x[1])[0][0],al=(cat.almacenes||[]).find(x=>x.id===g.m.alm);
    return{t:(+cant>1?cant+" × ":"")+(a?a.desc:"(borrado)")+(g.m.maq?" · "+maqN(g.m.maq):""),s:(al?al.nom.replace(/^Almacén (de )?/,""):"")+" · "+g.n+" veces",cant};};
  return el("section",{class:"card"},[el("div",{class:"hd"},[el("h2",{text:"Lo que sueles apuntar"}),el("span",{class:"der sub",text:"toca para repetirlo"})]),
    el("div",{class:"bd"},el("div",{class:"rap-hab"},L.map(g=>{const x=txt(g);return el("button",{type:"button",class:"rap-h",onclick:()=>{
        if(g.tipo==="p")irPist({maq:g.p.maq,diam:g.p.diam,alm:""});else irMov("salida",{art:g.m.art,alm:g.m.alm||"",maq:g.m.maq||"",cant:x.cant||""});}},
      [el("b",{text:x.t}),el("small",{text:x.s})]);})))]);}
