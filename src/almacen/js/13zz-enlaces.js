/* ===== TODO LO QUE SE NOMBRA SE PUEDE TOCAR (27/11/2026) =====
   En cualquier tabla o lista de cualquier apartado, si una casilla es un eje, una máquina, un artículo, un modelo
   de eje o un albarán, se convierte en un enlace que lleva a su ficha (o, el albarán, a lo que entró con él).
   Así se puede ir bajando a más detalle desde cualquier sitio, como en Ejes › Análisis.
   No se toca: lo que ya se puede pulsar (filas que abren algo, botones, enlaces) ni lo que va dentro de formularios. */
let _enlMapa=null,_enlFirma="";
/* el mapa se rehace solo cuando cambian los datos (firma: cuántos ejes, máquinas, artículos, movimientos y reparaciones hay) */
function mapaEnlaces(){let firma="";try{firma=[ejes.length,cat.maquinas.length,(cat.modelos||[]).length,cat.articulos.length,todosMov().length,todasRep().length].join("|");}catch(e){}
  if(_enlMapa&&_enlMapa.size&&firma===_enlFirma)return _enlMapa;
  const M=new Map(),pon=(k,v)=>{const t=String(k||"").trim().toLowerCase();if(t&&t.length>=2&&!M.has(t))M.set(t,v);};
  try{ejes.forEach(e=>pon(e.cod,{t:"Eje",ir:()=>fichaEje(e)}));}catch(e){}
  try{cat.maquinas.forEach(m=>pon(m.cod,{t:"Máquina",ir:()=>fichaIny(m)}));}catch(e){}
  try{(cat.modelos||[]).forEach(m=>{pon(m.ref,{t:"Modelo",ir:()=>fichaModelo(m)});pon(m.cod,{t:"Modelo",ir:()=>fichaModelo(m)});});}catch(e){}
  try{artsActivos().forEach(a=>{if(a.fam==="piston"&&a.diam)pon(a.diam,{t:"Artículo",ir:()=>ficha(a)});pon(a.desc,{t:"Artículo",ir:()=>ficha(a)});if(typeof nomBT==="function"&&TEC(a.fam))pon(nomBT(a),{t:"Artículo",ir:()=>ficha(a)});});}catch(e){}
  try{const A=new Set();todosMov().forEach(m=>{if(m.alb)A.add(String(m.alb).trim());});todasRep().forEach(r=>{if(r.alb)A.add(String(r.alb).trim());});A.forEach(a=>pon(a,{t:"Albarán",ir:()=>pantAlbaran(a)}));}catch(e){}
  _enlMapa=M;_enlFirma=firma;return M;}
function enlazar(raiz){if(!raiz)return;const M=mapaEnlaces();if(!M.size)return;
  raiz.querySelectorAll("td:not([data-enl]),.it:not(button):not(a) .t1:not([data-enl])").forEach(c=>{try{enlCelda(c,M);}catch(e){console.warn("enlazar",e);}});}
function enlCelda(c,M){{c.dataset.enl="1";
    if(c.closest("form,button,a,.fila-link,[onclick],.dlg-b,.op-foot,.op-hd,label"))return;if(c.querySelector("button,a,input,select,textarea"))return;
    const tr=c.closest("tr");if(tr&&(tr.classList.contains("fila-link")||getComputedStyle(tr).cursor==="pointer"))return;
    /* se prueba la casilla entera y, si tiene partes (nombre + etiqueta pequeña), cada parte; también lo de antes o después de « · » */
    const busca=t=>{t=(t||"").replace(/\s+/g," ").trim();if(!t||t.length>80)return null;const k=t.toLowerCase();if(M.has(k))return M.get(k);
      if(/ · /.test(t)){const ps=t.split(" · ").map(z=>z.trim().toLowerCase());for(const z of [ps[0],ps[ps.length-1]])if(M.has(z))return M.get(z);}return null;};
    const nodos=[c].concat([...c.children].filter(n=>!n.matches(".pill,.sub,small")));
    for(const n of nodos){const x=busca(n===c?c.textContent:n.textContent);if(!x)continue;
      const b=el("button",{type:"button",class:"enl",title:"Abrir "+x.t.toLowerCase(),onclick:ev=>{ev.stopPropagation();x.ir();}},[...n.childNodes]);
      n.textContent="";n.appendChild(b);return;}}}
/* se pasa por la pantalla y por lo que se abre encima cada vez que cambia algo (sin bloquear: un poco después) */
(function(){let pend=0;const pasa=()=>{pend=0;try{enlazar($("view"));document.querySelectorAll(".op-ov .op-body,.dlg-ov .dlg").forEach(enlazar);}catch(e){}};
  const obs=new MutationObserver(()=>{if(!pend)pend=setTimeout(pasa,60);});
  const arranca=()=>{obs.observe(document.body,{childList:true,subtree:true});pasa();};
  if(document.body)arranca();else document.addEventListener("DOMContentLoaded",arranca);})();

/* ---------- Un albarán: lo que entró con él (artículos) y, si es del taller, sus ejes ---------- */
function pantAlbaran(alb){const R=todasRep().filter(r=>String(r.alb||"").trim()===alb&&r.res!=="anulada");
  const L0=todosMov().filter(m=>String(m.alb||"").trim()===alb);if(!L0.length&&R.length)return pantAlbaranEjes(alb);
  const box=el("div",{class:"pz"});
  function pinta(){box.textContent="";const L=todosMov().filter(m=>String(m.alb||"").trim()===alb).sort((a,b)=>(a.f+a.ts).localeCompare(b.f+b.ts));
    const eu=L.reduce((t,m)=>{const a=art(m.art);return t+(a?(+m.cant||0)*(m.rec?(typeof precioRecDe==="function"?precioRecDe(a):0)||precioDe(a):precioDe(a)):0);},0);
    const provs=[...new Set(L.map(m=>provN(m.prov)).filter(Boolean))],fs=[...new Set(L.map(m=>m.f))].sort(),fotos=[...new Set(L.map(m=>m.foto).filter(Boolean))];
    box.appendChild(pzCifras([["Líneas",String(L.length),plu(new Set(L.map(m=>m.art)).size,"artículo","artículos"),""],["Fecha",fs.length?fmtF(fs[0]):"—",fs.length>1?"y "+(fs.length-1)+" fecha más":"",""],
      ["Proveedor",provs.join(", ")||"—","",""],["Valor",eu?eur(eu):"—",eu?"con el precio de cada artículo":"sin precios",""]].concat(R.length?[["Ejes del taller",String(R.length),"toca para verlos","",()=>pantAlbaranEjes(alb)]]:[])));
    box.appendChild(pzPan("Lo que entró con este albarán","toca un artículo para ver su ficha",[cTabla(["Fecha","Artículo","Cantidad","Almacén","Tipo"],L.map(m=>{const a=art(m.art);const f=[fmtF(m.f),a?a.desc:"?",fmtN(+m.cant||0)+" "+((a&&a.ud)||""),almN(m.alm),TIPOS[m.tipo]+(m.rec?" (recuperado)":"")];if(a)f.__ir=()=>ficha(a);return f;}),[2])]));
    if(fotos.length)box.appendChild(pzPan("Foto del albarán",null,[el("div",{style:"display:flex;gap:10px;flex-wrap:wrap;padding:0 18px 16px"},fotos.map(id=>el("img",{class:"thumb",src:fotoUrl(id),alt:"Albarán "+alb,style:"max-width:220px;cursor:pointer;border-radius:8px",onclick:()=>lightbox(fotoUrl(id))})))]));}
  pinta();objPage({ruta:["Almacén","Albaranes"],titulo:"Albarán "+alb,sub:"Lo que se apuntó con este albarán.",volver:"Volver",tabs:[["Albarán",[box]]]});
  const ov=[...document.querySelectorAll(".op-ov")].pop();if(ov)ov._repinta=pinta;}
window.enlazar=enlazar;
