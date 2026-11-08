/* ===== EL DÍA EN DOS COLUMNAS (ordenador) =====
   En un monitor grande (≥ 1800 px; en el portátil no cambia) el Día del jefe se reparte: a la izquierda fecha, «Abrir OT», cifras, botones,
   aceites, quién trabaja y faltas; a la derecha los avisos y los trabajos. Solo se recolocan los bloques que ya hay
   (en el móvil y el iPad no se toca nada). Si se cambia el ancho de la ventana, se vuelve a pintar. */
const ANCHO_2C=1800;
const ancho2c=()=>window.matchMedia("(min-width:"+ANCHO_2C+"px) and (min-height:560px)").matches;
function columnasDia(v){if(!v||v.querySelector(".dia-cols"))return;const hijos=[...v.children],i0=hijos.findIndex(x=>x.classList&&x.classList.contains("datebar"));if(i0<0)return;
  const box=hijos.slice(i0).reverse().find(x=>x.querySelector&&x.querySelector(":scope>.kpis"));if(!box)return;
  const izq=el("div",{class:"dia-izq"}),der=el("div",{class:"dia-der"}),cols=el("div",{class:"dia-cols"},[izq,der]);
  v.insertBefore(cols,hijos[i0]);
  hijos.slice(i0).forEach(x=>{if(x===box)return;
    const vacio=!x.children.length&&!(x.textContent||"").trim();
    if(x.classList.contains("datebar")||x.classList.contains("grande"))izq.appendChild(x);
    else if(vacio)izq.appendChild(x);/* huecos que se rellenan luego (avisos del móvil, aceites…) */
    else if(/Aceites y taladrinas|Activa los avisos/.test(x.textContent||""))izq.appendChild(x);
    else der.appendChild(x);});
  [...box.children].forEach(x=>{const t=(x.querySelector("h2")||{}).textContent||"";
    if(x.matches(".kpis,.herr,.fpleg,.plant,.aviso")||/^Faltas/.test(t))izq.appendChild(x);else der.appendChild(x);});
  box.remove();}
/* cada grupo de trabajos con su color: atrasadas rojo, en curso morado, por hacer naranja, terminadas verde */
function coloresDia(v){v.querySelectorAll(".card>.hd>h2").forEach(h=>{const t=h.textContent||"",c=h.parentNode.parentNode;
  const g=/^Atrasadas/.test(t)?"g-atras":/^En curso/.test(t)?"g-curso":/^Por hacer|^Para repartir|^Sin asignar/.test(t)?"g-hacer":/^Terminadas|^Hechas/.test(t)?"g-hecho":/^No se pudo/.test(t)?"g-atras":null;if(g)c.classList.add(g);});}
{const _vHoy2=vHoy;vHoy=async function(v){await _vHoy2(v);try{coloresDia(v);}catch(e){}try{if(esAdm()&&ancho2c())columnasDia(v);}catch(e){}};}
{let ult=ancho2c();window.addEventListener("resize",()=>{const a=ancho2c();if(a!==ult){ult=a;if(S.tab==="hoy")pinta();}});}
